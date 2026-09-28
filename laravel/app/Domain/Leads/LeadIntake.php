<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Domain\Embed;
use App\Domain\Tokens\FileAccess;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;
use App\Support\Validation\SchemaValidator;
use Illuminate\Support\Facades\DB;

/**
 * New leads (05_BUSINESS_RULES.md → "Leads"): the site's forms
 * (`POST /leads`) and the enquiries the desk enters itself
 * (`POST /admin/leads`).
 *
 * A public lead maps a legacy source, takes the default priority, keeps the
 * UTM tags and the visitor's address, starts its timeline, snapshots the
 * listing it names (and moves that listing's enquiry counter), and is
 * assigned — to the colleague who holds an open lead from the same number
 * when there is one, else as `settings.leads.autoAssign` says; the older
 * lead's timeline hears about the repeat. A lead about an active listing
 * opens the listing's gated files. Either way, the desk is e-mailed.
 */
final class LeadIntake
{
    private Embed $embed;

    public function __construct(
        private DocumentStore $store,
        private LeadAssignment $assignment,
        private LeadAlerts $alerts,
    ) {
        $this->embed = new Embed($store);
    }

    /**
     * `POST /leads` — validated, stored and assigned.
     *
     * @return array{0: array, 1: ?array} the stored lead, and the `access` to
     *   the gated files of the active listing it names
     */
    public function fromSite(array $body, ?string $ip, ?string $userAgent): array
    {
        // A number the Indian rule does not recognise is kept as typed, so the validator is what refuses it.
        $body = self::withNormalisedPhone($body);
        SchemaValidator::validate(Contract::schema('lead.create'), $body, ['fillDefaults' => true]);

        // The old site's source values keep arriving from bookmarked pages and
        // stale bundles; they are stored under their current name. A visitor's
        // enquiry is never one of the desk's sources.
        $sent = $body['source'] ?? null;
        $source = is_string($sent) ? (Contract::enums()['LEGACY_LEAD_SOURCE_MAP'][$sent] ?? $sent) : $sent;
        if (! in_array($source, Contract::enumValues('SITE_LEAD_SOURCES'), true)) {
            throw ApiException::validation(['source' => 'The selected source is invalid.']);
        }
        LeadReferences::assertStorable($body);

        $fields = Contract::model('leads')['fields'];
        $clean = Documents::sanitize($body, $fields);
        $now = LeadFilters::now();
        $at = Clock::iso($now);
        $utm = self::hasValue($clean['utm'] ?? null) ? $clean['utm'] : self::utmFromUrl($clean['pageUrl'] ?? null);

        $record = [
            ...Documents::mergeDefaults(Documents::defaults($fields), $clean),
            'source' => $source,
            'status' => 'new',
            'priority' => $this->defaultPriority(),
            'assignedTo' => null,
            'notes' => [],
            'activities' => [],
            'utm' => $utm,
            'ipAddress' => $ip,
            'userAgent' => $userAgent,
            'createdAt' => $at,
            'updatedAt' => $at,
        ];

        // Somebody who enquired a fortnight ago is already somebody's
        // conversation: the new enquiry goes to that colleague, not to whoever
        // the rotation reaches next.
        $repeat = $this->assignment->repeatedLead($record, $now);
        $owner = $repeat === null ? null : $this->assignment->activeOwner($repeat['assignedTo'] ?? null);
        $record['assignedTo'] = $owner ?? $this->assignment->autoAssignee($record);

        $record = Timeline::add($record, 'created', Timeline::created($source), null, $at);
        if ($record['assignedTo'] !== null) {
            $assigned = Timeline::assignment($this->assignment->userName($record['assignedTo']));
            $record = Timeline::add($record, 'assigned', $owner !== null ? "{$assigned} — they hold lead #{$repeat['id']} from this number" : $assigned, null, $at);
        }

        [$record, $listing] = $this->attachListing($record);
        $stored = DB::transaction(function () use ($record, $listing, $repeat, $source, $at) {
            $stored = $this->store->insert('leads', $record);
            $this->countEnquiry($listing);
            if ($repeat !== null) {
                $about = $this->embed->leadProperty($stored);
                $via = Contract::enumLabel('LEAD_SOURCES', $source) ?: $source;
                $description = "Enquired again via {$via}".($about !== null ? " about {$about['title']}" : '')." — lead #{$stored['id']}";
                $this->store->update('leads', [...Timeline::add($repeat, 'enquired-again', $description, null, $at), 'updatedAt' => $at], $repeat);
                ApiLog::info('leads', "Lead #{$stored['id']} repeats open lead #{$repeat['id']} from the same number");
            }

            return $stored;
        });
        ApiLog::info('leads', "Lead #{$stored['id']} received from the site ({$source})", [
            'assignedTo' => $stored['assignedTo'],
            'propertyId' => $stored['propertyId'],
        ]);

        // A token for the listing's gated files: part of this response only — a credential, never stored on the lead.
        $access = $listing === null ? null : FileAccess::issue($listing['id'], $stored['id']);
        $this->alerts->queue($stored);

        return [$stored, $access];
    }

    /**
     * `POST /admin/leads` — a walk-in, a phone call, a portal lead. Validated
     * like the public form without its honeypot or rate limit; the source is
     * the one sent. A sales user's lead is their own whatever the form says;
     * anyone else's goes to the colleague named, or — nobody named — the way
     * a public lead would (the repeat rule aside). `note` becomes the first note.
     */
    public function fromDesk(array $body, array $user): array
    {
        $body = self::withNormalisedPhone($body);
        SchemaValidator::validate(Contract::schema('lead.adminCreate'), $body, ['fillDefaults' => true]);
        if (($body['propertyId'] ?? null) !== null && ! $this->store->exists('properties', $body['propertyId'])) {
            throw ApiException::validation(['propertyId' => 'The selected property does not exist.']);
        }
        // The form's other references are the model's fields, kept as sent.
        LeadReferences::assertStorable($body);

        $isSales = ($user['role'] ?? null) === 'sales';
        $named = $isSales ? null : ($body['assignedTo'] ?? null);
        if ($named !== null) {
            $this->assignment->assertAssignable($named, 'assignedTo');
        }

        $at = Clock::nowIso();
        $note = is_string($body['note'] ?? null) ? Js::trim($body['note']) : '';
        unset($body['note']);
        $fields = Contract::model('leads')['fields'];
        // The form's default: an omitted source is a walk-in.
        $source = $body['source'] ?? Contract::schema('lead.adminCreate')['source']['default'];

        $record = [
            ...Documents::mergeDefaults(Documents::defaults($fields), Documents::sanitize($body, $fields)),
            'source' => $source,
            'status' => 'new',
            'priority' => $body['priority'] ?? $this->defaultPriority(),
            'assignedTo' => null,
            'notes' => [],
            'activities' => [],
            'utm' => array_fill_keys(['source', 'medium', 'campaign', 'term', 'content'], null),
            'ipAddress' => null,
            'userAgent' => null,
            'createdAt' => $at,
            'updatedAt' => $at,
        ];
        $record['assignedTo'] = $isSales ? $user['id'] : ($named ?? $this->assignment->autoAssignee($record));

        $label = Contract::enumLabel('LEAD_SOURCES', $source) ?: $source;
        $record = Timeline::add($record, 'created', "Added by {$user['name']} — {$label}", $user['id'], $at);
        if ($record['assignedTo'] !== null) {
            $record = Timeline::add($record, 'assigned', Timeline::assignment($this->assignment->userName($record['assignedTo'])), $user['id'], $at);
        }
        if ($note !== '') {
            $record['notes'][] = ['id' => 1, 'text' => $note, 'createdBy' => $user['id'], 'createdByName' => $user['name'], 'createdAt' => $at];
            $record = Timeline::add($record, 'note-added', 'Note added', $user['id'], $at);
        }

        [$record, $listing] = $this->attachListing($record);
        $stored = DB::transaction(function () use ($record, $listing) {
            $stored = $this->store->insert('leads', $record);
            $this->countEnquiry($listing);

            return $stored;
        });
        ApiLog::info('leads', "Lead #{$stored['id']} entered by the desk ({$source})", ['by' => $user['id'], 'assignedTo' => $stored['assignedTo']]);
        $this->alerts->queue($stored);

        return $stored;
    }

    /**
     * The lead with a snapshot of the listing it names — so it still says
     * what it was about once the listing is gone — and that listing when it
     * is active: the one whose enquiry counter moves and whose files open.
     *
     * @return array{0: array, 1: ?array}
     */
    private function attachListing(array $record): array
    {
        $property = ($record['propertyId'] ?? null) === null ? null : $this->store->find('properties', $record['propertyId']);
        $record['propertySnapshot'] = $this->embed->propertySnapshot($property);

        return [$record, $property !== null && ($property['isActive'] ?? false) ? $property : null];
    }

    /** An enquiry is a fact about the listing too; the counter is server-managed and moves here only. */
    private function countEnquiry(?array $listing): void
    {
        if ($listing !== null) {
            $this->store->setColumns('properties', $listing['id'], ['enquiry_count' => DB::raw('enquiry_count + 1')]);
            ApiLog::debug('leads', "Property #{$listing['id']}: enquiry counted");
        }
    }

    private function defaultPriority(): mixed
    {
        return Js::get(Js::get($this->store->singleton('siteSettings'), 'leads'), 'defaultPriority') ?? 'medium';
    }

    /** Phone numbers are stored the one way the CRM matches them on: `+91` and ten digits. */
    private static function withNormalisedPhone(array $body): array
    {
        if (is_string($body['phone'] ?? null)) {
            $body['phone'] = LeadPhone::normalise($body['phone']) ?? $body['phone'];
        }

        return $body;
    }

    /** Whether any UTM value was sent. */
    private static function hasValue(mixed $utm): bool
    {
        foreach (Js::entries($utm) as $value) {
            if (! in_array($value, [null, false, '', 0, 0.0], true)) {
                return true;
            }
        }

        return false;
    }

    /** The `utm_*` parameters of the page the form was sent from, each null when absent or empty. */
    private static function utmFromUrl(mixed $pageUrl): array
    {
        $utm = array_fill_keys(['source', 'medium', 'campaign', 'term', 'content'], null);
        if (! is_string($pageUrl) || $pageUrl === '') {
            return $utm;
        }

        // URLSearchParams: the query is what lies between the first `?` and the fragment; `+` is a space.
        $query = explode('#', $pageUrl, 2)[0];
        $query = str_contains($query, '?') ? explode('?', $query, 2)[1] : '';
        $params = [];
        foreach (explode('&', $query) as $pair) {
            if ($pair === '') {
                continue;
            }
            [$name, $value] = array_pad(explode('=', $pair, 2), 2, '');
            $name = urldecode($name);
            $params[$name] ??= urldecode($value);
        }
        foreach (array_keys($utm) as $key) {
            $value = $params["utm_{$key}"] ?? '';
            $utm[$key] = $value === '' ? null : $value;
        }

        return $utm;
    }
}
