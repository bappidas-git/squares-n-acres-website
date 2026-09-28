<?php

namespace App\Http\Controllers;

use App\Contract\Contract;
use App\Domain\Leads\LeadAlerts;
use App\Domain\Leads\LeadAssignment;
use App\Domain\Leads\LeadChanges;
use App\Domain\Leads\LeadExport;
use App\Domain\Leads\LeadFilters;
use App\Domain\Leads\LeadIntake;
use App\Domain\Leads\LeadPhone;
use App\Domain\Leads\LeadPresenter;
use App\Domain\Leads\LeadReferences;
use App\Domain\Leads\LeadScope;
use App\Domain\Leads\Timeline;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Csv;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Paginator;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;
use App\Support\Validation\SchemaValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * The CRM (05_BUSINESS_RULES.md → "Leads", "Bulk actions", "CSV export").
 *
 *   GET    /admin/leads                     filters, sales scope, pagination; `meta.followUp`
 *   POST   /admin/leads                     an enquiry the desk enters itself
 *   GET    /admin/leads/export              the same list as CSV
 *   POST   /admin/leads/bulk                status | assign | priority | delete
 *   GET    /admin/leads/{id}
 *   PATCH  /admin/leads/{id}                status, priority, follow-up, owner, contact details
 *   DELETE /admin/leads/{id}                admins and managers (the role matrix)
 *   POST   /admin/leads/{id}/claim          a sales user takes an open lead
 *   POST   /admin/leads/{id}/notes
 *   DELETE /admin/leads/{id}/notes/{noteId}
 *   POST   /admin/leads/{id}/activities     a call, a visit, a meeting — logged
 *   POST   /admin/settings/test-lead-alert  the lead notification, tested (admin)
 *
 * Two rules run through all of it. **Scope**: a sales user sees, edits,
 * claims and exports the leads assigned to them and the ones nobody has
 * taken, and nothing else — a lead outside that scope answers 404, because
 * its existence is not theirs to know. **Timeline**: every change worth
 * explaining later appends an activity (App\Domain\Leads\LeadChanges).
 */
class AdminLeadController extends Controller
{
    public function __construct(
        DocumentStore $store,
        private LeadPresenter $presenter,
        private LeadChanges $changes,
        private LeadAssignment $assignment,
    ) {
        parent::__construct($store);
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $now = LeadFilters::now();
        $perPage = $query->first('perPage') === 'all' ? null : Paginator::positiveInt($query->first('perPage'), Paginator::DEFAULT_PER_PAGE_ADMIN);
        [$page, $meta] = Paginator::paginate($this->queryLeads($request, $now), $query->first('page'), $perPage);

        // The worklist chips count the view with every filter but their own,
        // so they keep their numbers while one of them is chosen.
        $user = $this->userDocument($request);
        $view = LeadFilters::apply(LeadScope::visible($this->store->all('leads'), $user), $query->without('followUp'), $user, $now);
        $followUp = LeadFilters::followUpCounts($view, $now);

        return Envelope::list($this->presenter->rows($page), [...$meta, 'followUp' => $followUp]);
    }

    public function store(Request $request, LeadIntake $intake): JsonResponse
    {
        $lead = $intake->fromDesk($this->body($request), $this->userDocument($request));

        return Envelope::created($this->presenter->admin($lead));
    }

    public function export(Request $request, LeadExport $export): Response
    {
        $leads = $this->queryLeads($request);
        ApiLog::info('leads', 'Exported '.count($leads).' leads as CSV');

        return Csv::download($export->csv($leads), LeadExport::filename());
    }

    /**
     * `affected` counts what changed, not what was named: a lead already in
     * the target state is neither an error nor news.
     */
    public function bulk(Request $request): JsonResponse
    {
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('bulk'), $body);
        $action = $body['action'];
        if (! in_array($action, LeadChanges::BULK_ACTIONS, true)) {
            throw ApiException::validation(['action' => 'The selected action is invalid.']);
        }
        $changes = $this->changes->bulkChanges($action, $body['payload'] ?? null);

        $user = $this->userDocument($request);
        $ids = array_map(fn (mixed $id) => Js::string($id), $body['ids']);
        $targets = array_filter($this->store->all('leads'), fn (array $lead) => in_array(Js::string($lead['id']), $ids, true));

        $affected = DB::transaction(function () use ($action, $changes, $targets, $user) {
            if ($action === 'delete') {
                foreach ($targets as $lead) {
                    $this->store->delete('leads', $lead['id']);
                }

                return count($targets);
            }
            $affected = 0;
            foreach ($targets as $lead) {
                // A lead that is already lost keeps the reason it was closed with.
                $own = ($changes['status'] ?? null) === 'lost' && $lead['status'] === 'lost' ? ['status' => 'lost'] : $changes;
                $changed = $this->changes->apply($lead, LeadChanges::settleLostReason($lead, $own), $user);
                if ($changed !== null) {
                    $this->store->update('leads', $changed, $lead);
                    $affected++;
                }
            }

            return $affected;
        });
        ApiLog::info('leads', "Bulk {$action}: {$affected} of ".count($ids).' named leads affected', ['payload' => $changes]);

        $noun = $affected === 1 ? 'lead' : 'leads';

        return Envelope::message("{$affected} {$noun} ".($action === 'delete' ? 'deleted' : 'updated').'.', ['affected' => $affected]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return Envelope::ok($this->presenter->admin($this->findInScope($request, $id)));
    }

    /**
     * A sales user works their own pipeline: the status, the priority, the
     * follow-up and why a lead was lost — and the details of a lead that is
     * theirs. Handing a lead to somebody else is `leads.assign`, which they do
     * not hold.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $lead = $this->findInScope($request, $id);
        $body = $this->body($request);
        // Stored the way the public form stores it, so a corrected number still matches the lead's other enquiries.
        if (is_string($body['phone'] ?? null)) {
            $body['phone'] = LeadPhone::normalise($body['phone']) ?? $body['phone'];
        }
        SchemaValidator::validate(Contract::schema('lead.patch'), $body, ['partial' => true]);
        $changes = Documents::sanitize($body, Contract::model('leads')['fields']);

        $user = $this->userDocument($request);
        if ($user['role'] === 'sales') {
            $refused = array_diff(array_keys($changes), LeadChanges::SALES_PATCHABLE);
            if ($refused !== []) {
                ApiLog::info('leads', "PATCH #{$lead['id']} refused: a sales user may not change ".implode(', ', $refused));

                throw ApiException::forbidden();
            }
            if (array_intersect(LeadChanges::DETAIL_FIELDS, array_keys($changes)) !== [] && Js::string($lead['assignedTo']) !== Js::string($user['id'])) {
                ApiLog::info('leads', "PATCH #{$lead['id']} refused: the details of a lead that is not theirs");

                throw ApiException::forbidden('You can correct the details of your own leads only.');
            }
        }
        if (array_key_exists('assignedTo', $changes)) {
            $this->assignment->assertAssignable($changes['assignedTo'], 'assignedTo', $lead['assignedTo']);
        }
        LeadReferences::assertStorable($changes);
        LeadReferences::assertStorableNotes($changes);

        $changed = $this->changes->apply($lead, LeadChanges::settleLostReason($lead, $changes), $user);
        if ($changed === null) {
            ApiLog::debug('leads', "PATCH #{$lead['id']} changes nothing — not written");
        }

        return Envelope::ok($this->presenter->admin($changed === null ? $lead : $this->save($changed, $lead, 'updated')));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $lead = $this->findInScope($request, $id);
        $this->store->delete('leads', $lead['id']);
        ApiLog::info('leads', "Lead #{$lead['id']} deleted");

        return Envelope::message('Deleted');
    }

    /**
     * Claiming is what a sales user does instead of assigning; an admin or a
     * manager assigns, which is a different permission. Only an unassigned
     * lead can be claimed.
     */
    public function claim(Request $request, string $id): JsonResponse
    {
        $lead = $this->findInScope($request, $id);
        $user = $this->userDocument($request);
        if ($user['role'] !== 'sales') {
            throw ApiException::forbidden();
        }
        if ($lead['assignedTo'] !== null) {
            ApiLog::info('leads', "Claim of #{$lead['id']} refused: already assigned");

            throw ApiException::conflict('This lead is already assigned.', ['assignedTo' => ['This lead is already assigned.']]);
        }

        return Envelope::ok($this->presenter->admin($this->save($this->changes->apply($lead, ['assignedTo' => $user['id']], $user), $lead, 'claimed')));
    }

    public function addNote(Request $request, string $id): JsonResponse
    {
        $lead = $this->findInScope($request, $id);
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('lead.note'), $body);

        $user = $this->userDocument($request);
        $at = Clock::nowIso();
        $notes = Js::isList($lead['notes']) ? $lead['notes'] : [];
        $notes[] = ['id' => Timeline::nextId($notes), 'text' => $body['text'], 'createdBy' => $user['id'], 'createdByName' => $user['name'], 'createdAt' => $at];
        $updated = Timeline::add([...$lead, 'notes' => $notes, 'updatedAt' => $at], 'note-added', 'Note added', $user['id'], $at);

        return Envelope::ok($this->presenter->admin($this->save($updated, $lead, 'noted')));
    }

    /**
     * Your own note is yours to withdraw; anybody else's belongs to the
     * record, and only an admin or a manager edits the record. The timeline
     * is not told.
     */
    public function removeNote(Request $request, string $id, string $noteId): JsonResponse
    {
        $lead = $this->findInScope($request, $id);
        $notes = Js::isList($lead['notes']) ? $lead['notes'] : [];
        $note = array_values(array_filter($notes, fn (array $entry) => Js::string($entry['id']) === $noteId))[0]
            ?? throw ApiException::notFound();

        $user = $this->userDocument($request);
        if ($user['role'] === 'sales' && Js::string($note['createdBy']) !== Js::string($user['id'])) {
            throw ApiException::forbidden();
        }
        $remaining = array_values(array_filter($notes, fn (array $entry) => Js::string($entry['id']) !== Js::string($note['id'])));

        return Envelope::ok($this->presenter->admin($this->save([...$lead, 'notes' => $remaining, 'updatedAt' => Clock::nowIso()], $lead, "note #{$note['id']} removed")));
    }

    /**
     * A conversation, logged: a typed entry on the timeline — "Call logged —
     * Interested, wants a Saturday visit" — with whatever was noted. A change
     * of status or follow-up that came of it is the PATCH the panel sends
     * beside it.
     */
    public function logActivity(Request $request, string $id): JsonResponse
    {
        $lead = $this->findInScope($request, $id);
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('lead.activity'), $body, ['fillDefaults' => true]);

        $outcome = is_string($body['outcome'] ?? null) ? Js::trim($body['outcome']) : '';
        $note = is_string($body['note'] ?? null) ? Js::trim($body['note']) : '';
        $user = $this->userDocument($request);
        $at = Clock::nowIso();
        $type = Contract::enumMeta('LEAD_CONTACT_TYPES', $body['type'])['activity'] ?? 'activity-logged';
        $description = Contract::enumLabel('LEAD_CONTACT_TYPES', $body['type']).' logged'.($outcome !== '' ? " — {$outcome}" : '');
        $updated = Timeline::add([...$lead, 'updatedAt' => $at], $type, $description, $user['id'], $at, $note);

        return Envelope::ok($this->presenter->admin($this->save($updated, $lead, "{$type} logged")));
    }

    /** `POST /admin/settings/test-lead-alert`: the lead notification, sent now to the saved addresses. */
    public function testAlert(LeadAlerts $alerts): JsonResponse
    {
        $sent = $alerts->sendTest();
        $count = count($sent['sentTo']);

        return Envelope::message("Test alert sent to {$count} ".($count === 1 ? 'address' : 'addresses').'.', $sent);
    }

    /* ------------------------------------------------------------------ */

    /** The lead a route addresses, or a 404 — including "not in your scope". */
    private function findInScope(Request $request, string $id): array
    {
        $lead = $this->store->find('leads', $id) ?? throw ApiException::notFound();
        if (! LeadScope::canSee($lead, $this->userDocument($request))) {
            ApiLog::info('leads', "Lead #{$lead['id']} is outside the sales scope — answered 404");

            throw ApiException::notFound();
        }

        return $lead;
    }

    /** The leads a request may see, after scope, filters and sorting — the list's and the export's. */
    private function queryLeads(Request $request, ?int $now = null): array
    {
        $query = $this->query($request);
        $user = $this->userDocument($request);
        $leads = LeadFilters::apply(LeadScope::visible($this->store->all('leads'), $user), $query, $user, $now);

        return LeadFilters::sort($leads, $query->first('sort'), $query->first('order'));
    }

    private function save(array $lead, array $before, string $what): array
    {
        $stored = $this->store->update('leads', $lead, $before);
        ApiLog::info('leads', "Lead #{$lead['id']} {$what}", ['status' => $stored['status'], 'assignedTo' => $stored['assignedTo']]);

        return $stored;
    }
}
