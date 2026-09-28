<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Support\Api\ApiException;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;

/**
 * What a change to a lead writes (05_BUSINESS_RULES.md → "Leads": "Activities
 * are appended, never edited", "Lost asks why", "Correcting the details";
 * "Bulk actions").
 *
 * A change set is compared with the stored lead field by field: one timeline
 * entry per field that actually changed, and a change set that changes
 * nothing writes nothing — not an entry and not `updatedAt` — which is also
 * what `affected` of a bulk action counts.
 */
final class LeadChanges
{
    /** What a lead captured about the person, which the desk may correct. */
    public const DETAIL_FIELDS = ['name', 'phone', 'email', 'requirement'];

    /** The fields a sales user may change on a lead they hold — the details only on one assigned to them. */
    public const SALES_PATCHABLE = ['status', 'priority', 'followUpAt', 'lostReason', ...self::DETAIL_FIELDS];

    /** The bulk actions of `POST /admin/leads/bulk`. */
    public const BULK_ACTIONS = ['status', 'assign', 'priority', 'delete'];

    /** A lost reason's shortest length — the dialog's minimum. */
    private const LOST_REASON_MIN = 3;

    public function __construct(private LeadAssignment $assignment) {}

    /**
     * The lead with a change set applied and its timeline entries appended,
     * each credited to `user`; null when no field changed.
     *
     * @param  array  $changes  only the fields the request actually sent
     */
    public function apply(array $lead, array $changes, ?array $user): ?array
    {
        $differs = fn (string $field) => array_key_exists($field, $changes) && ! self::sameValue($changes[$field], $lead[$field] ?? null, $field);
        if (array_filter(array_keys($changes), $differs) === []) {
            return null;
        }

        $entries = [];
        $details = array_values(array_filter(self::DETAIL_FIELDS, $differs));
        if ($details !== []) {
            $entries[] = ['details-updated', Timeline::detailsUpdate($details, $user['name'] ?? null)];
        }
        if ($differs('status')) {
            $entries[] = ['status-changed', Timeline::statusChange($lead['status'] ?? null, $changes['status'], $changes['lostReason'] ?? null)];
        }
        if ($differs('priority')) {
            $entries[] = ['priority-changed', Timeline::priorityChange($lead['priority'] ?? null, $changes['priority'])];
        }
        if ($differs('assignedTo')) {
            $entries[] = ['assigned', Timeline::assignment($this->assignment->userName($changes['assignedTo']))];
        }
        if ($differs('followUpAt')) {
            $entries[] = ['follow-up-set', Timeline::followUp($changes['followUpAt'])];
        }

        $at = Clock::nowIso();
        $lead = [...$lead, ...$changes, 'updatedAt' => $at];
        foreach ($entries as [$type, $description]) {
            $lead = Timeline::add($lead, $type, $description, $user['id'] ?? null, $at);
        }

        return $lead;
    }

    /**
     * The change set with the lost reason settled: marking a lead as lost
     * asks why (and so does rewriting the reason of a lead that is lost);
     * reopening a lost lead clears the reason — the timeline entry of the move
     * to Lost keeps it; a reason on a lead that is not lost is refused rather
     * than stored where nothing reads it.
     *
     * @param  string  $field  the key a 422 names — `payload.lostReason` for a bulk action
     */
    public static function settleLostReason(array $lead, array $changes, string $field = 'lostReason'): array
    {
        $status = array_key_exists('status', $changes) ? $changes['status'] : ($lead['status'] ?? null);
        $sent = array_key_exists('lostReason', $changes);

        if ($status === 'lost') {
            if (($lead['status'] ?? null) === 'lost' && ! $sent) {
                return $changes;
            }

            return [...$changes, 'lostReason' => self::lostReasonOf($changes['lostReason'] ?? null, $field)];
        }

        $reason = is_string($changes['lostReason'] ?? null) ? Js::trim($changes['lostReason']) : '';
        if ($sent && $reason !== '') {
            throw ApiException::validation([$field => 'The lost reason applies to a lost lead only.']);
        }

        return ($lead['status'] ?? null) === 'lost' || $sent ? [...$changes, 'lostReason' => null] : $changes;
    }

    /** A lost reason, trimmed: three characters at least, and at most what `lead.patch` stores. */
    public static function lostReasonOf(mixed $value, string $field): string
    {
        $reason = is_string($value) ? Js::trim($value) : '';
        $max = Contract::schema('lead.patch')['lostReason']['maxLength'];
        $message = match (true) {
            $reason === '' => 'The lost reason is required when a lead is marked as lost.',
            Js::length($reason) < self::LOST_REASON_MIN => 'The lost reason must be at least '.self::LOST_REASON_MIN.' characters.',
            Js::length($reason) > $max => "The lost reason may not be greater than {$max} characters.",
            default => null,
        };
        if ($message !== null) {
            throw ApiException::validation([$field => $message]);
        }

        return $reason;
    }

    /**
     * The change set a bulk action writes, read from its `payload`, or a 422
     * naming `payload.<key>`. A lead `status` of `lost` needs a reason, which
     * is recorded on every lead the action closes; `assign` takes an integer
     * id or null and refuses a deactivated user.
     */
    public function bulkChanges(string $action, mixed $payload): array
    {
        $payload = Js::entries($payload);
        $changes = [];

        if ($action === 'status') {
            if (! in_array($payload['status'] ?? null, Contract::enumValues('LEAD_STATUS'), true)) {
                throw ApiException::validation(['payload.status' => 'The selected status is invalid.']);
            }
            $changes['status'] = $payload['status'];
            if ($payload['status'] === 'lost') {
                $changes['lostReason'] = self::lostReasonOf($payload['lostReason'] ?? null, 'payload.lostReason');
            }
        }
        if ($action === 'priority') {
            if (! in_array($payload['priority'] ?? null, Contract::enumValues('LEAD_PRIORITY'), true)) {
                throw ApiException::validation(['payload.priority' => 'The selected priority is invalid.']);
            }
            $changes['priority'] = $payload['priority'];
        }
        if ($action === 'assign') {
            $assignee = $payload['assignedTo'] ?? null;
            // An id, as PATCH asks for one: a string "3" matched the user and was stored as a string.
            if ($assignee !== null && ! Js::isInteger($assignee)) {
                throw ApiException::validation(['payload.assignedTo' => 'The payload.assignedTo must be an integer.']);
            }
            $this->assignment->assertAssignable($assignee, 'payload.assignedTo');
            $changes['assignedTo'] = $assignee === null ? null : (int) $assignee;
        }

        return $changes;
    }

    /**
     * Whether a sent value is the stored one: an id however it is typed, an
     * object by content, and a follow-up by the moment it names — the column
     * keeps the instant, not the spelling it was sent in.
     */
    public static function sameValue(mixed $sent, mixed $stored, string $field = ''): bool
    {
        if ($sent === null || $stored === null) {
            return $sent === $stored;
        }
        if ($field === 'followUpAt' && Clock::isValid($sent) && Clock::isValid($stored)) {
            return Clock::ms($sent) === Clock::ms($stored);
        }
        if (is_array($sent) || is_object($sent) || is_array($stored) || is_object($stored)) {
            return Documents::canonical($sent) === Documents::canonical($stored);
        }

        return Js::string($sent) === Js::string($stored);
    }
}
