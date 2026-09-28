<?php

namespace App\Domain\Newsletter;

use App\Contract\Contract;
use App\Crud\Usage;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Csv;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\QueryParams;
use App\Support\Time\Clock;
use App\Support\Validation\SchemaValidator;

/**
 * Newsletter subscriptions (05_BUSINESS_RULES.md → "Newsletter and spam";
 * the mock's `routes/newsletter.js`).
 *
 * Subscribing twice is not an error: the second attempt answers
 * `200 { data: null, message: 'Already subscribed' }`, so the form says
 * something friendly instead of showing a 409 to somebody who did nothing
 * wrong. An address that unsubscribed is re-subscribed rather than duplicated,
 * which keeps `email` genuinely unique. Addresses compare trimmed and
 * case-insensitively.
 */
final class Subscriptions
{
    /** The columns of the export, in order. */
    public const CSV_COLUMNS = [
        ['key' => 'email', 'label' => 'Email'],
        ['key' => 'name', 'label' => 'Name'],
        ['key' => 'source', 'label' => 'Source'],
        ['key' => 'status', 'label' => 'Status'],
        ['key' => 'createdAt', 'label' => 'Subscribed At'],
    ];

    /** Site settings → Newsletter → "Collect subscriptions" switched off (prompt 51). */
    public const CLOSED_MESSAGE = 'The newsletter is not taking subscriptions at the moment.';

    public function __construct(private DocumentStore $store) {}

    /** An address as it compares: trimmed and lower-cased; anything else as it came. */
    public static function normalizeEmail(mixed $value): mixed
    {
        return is_string($value) ? Js::lower(Js::trim($value)) : $value;
    }

    /**
     * `POST /newsletter/subscribe`.
     *
     * @return array{outcome: 'created'|'existing'|'resubscribed', record: ?array}
     */
    public function subscribe(array $body): array
    {
        // The site hides every signup while the switch is off; one that arrives anyway is refused.
        if (Js::get(Js::get($this->store->singleton('siteSettings'), 'newsletter'), 'enabled') === false) {
            ApiLog::info('newsletter', 'Subscription refused: the newsletter is switched off');

            throw ApiException::forbidden(self::CLOSED_MESSAGE);
        }

        if (array_key_exists('email', $body)) {
            $body['email'] = self::normalizeEmail($body['email']);
        }
        SchemaValidator::validate(Contract::schema('newsletter.subscribe'), $body, ['fillDefaults' => true]);

        $source = in_array($body['source'] ?? null, Contract::enumValues('LEAD_SOURCES'), true) ? $body['source'] : null;
        $now = Clock::nowIso();

        foreach ($this->store->all('newsletterSubscribers') as $existing) {
            if (self::normalizeEmail($existing['email'] ?? null) !== $body['email']) {
                continue;
            }
            if (($existing['status'] ?? null) === 'subscribed') {
                ApiLog::info('newsletter', "Already subscribed (#{$existing['id']}) — nothing stored");

                return ['outcome' => 'existing', 'record' => null];
            }

            // Coming back is a new subscription, not a resurrection of the old
            // one: the source that brought them back is the one worth keeping.
            $name = $body['name'] ?? null;
            $stored = $this->store->update('newsletterSubscribers', [
                ...$existing,
                'status' => 'subscribed',
                'source' => $source ?? $existing['source'] ?? null,
                'name' => is_string($name) && $name !== '' ? $name : ($existing['name'] ?? null),
                'updatedAt' => $now,
            ], $existing);
            ApiLog::info('newsletter', "Re-subscribed #{$stored['id']}", ['source' => $stored['source']]);

            return ['outcome' => 'resubscribed', 'record' => $stored];
        }

        $stored = $this->store->insert('newsletterSubscribers', [
            'id' => null,
            'email' => $body['email'],
            'name' => $body['name'] ?? null,
            'source' => $source ?? 'newsletter',
            'status' => 'subscribed',
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
        ApiLog::info('newsletter', "Subscribed #{$stored['id']}", ['source' => $stored['source']]);

        return ['outcome' => 'created', 'record' => $stored];
    }

    /**
     * `PATCH /admin/newsletter-subscribers/{id} { status }` — "Mark
     * unsubscribed": somebody who asked to stop is kept on the list, so a
     * later subscribe is theirs to make, and leaves the export filtered to
     * `subscribed`. A status the record already has writes nothing.
     */
    public function setStatus(string $id, array $body): array
    {
        $subscriber = null;
        foreach ($this->store->all('newsletterSubscribers') as $row) {
            if (Usage::sameId($row['id'] ?? null, $id)) {
                $subscriber = $row;
                break;
            }
        }
        if ($subscriber === null) {
            throw ApiException::notFound();
        }

        $status = array_key_exists('status', $body) ? ['status' => $body['status']] : [];
        SchemaValidator::validate(Contract::schema('newsletter.status'), $status);
        if (($subscriber['status'] ?? null) === $status['status']) {
            return $subscriber;
        }

        $stored = $this->store->update('newsletterSubscribers', [...$subscriber, 'status' => $status['status'], 'updatedAt' => Clock::nowIso()], $subscriber);
        ApiLog::info('newsletter', "Subscriber #{$stored['id']} marked {$stored['status']}");

        return $stored;
    }

    /**
     * `GET /admin/newsletter-subscribers/export`: the subscribers matching
     * `status` and `q`, newest first, as a CSV with a byte-order mark.
     *
     * @return array{0: string, 1: string} the document and its file name
     */
    public function export(QueryParams $query): array
    {
        $status = $query->first('status');
        $q = $query->first('q') ?? '';

        $rows = array_values(array_filter(
            $this->store->all('newsletterSubscribers'),
            fn (array $row) => ($status === null || $status === '' || ($row['status'] ?? null) === $status)
                && Filters::matchesQ($row, ['email', 'name'], $q),
        ));
        usort($rows, fn (array $left, array $right) => (Clock::ms($right['createdAt'] ?? null) ?? 0) <=> (Clock::ms($left['createdAt'] ?? null) ?? 0));
        ApiLog::info('newsletter', 'Exported '.count($rows).' subscribers', ['status' => $status, 'q' => $q]);

        return [Csv::render($rows, self::CSV_COLUMNS), 'newsletter-subscribers-'.substr(Clock::nowIso(), 0, 10).'.csv'];
    }
}
