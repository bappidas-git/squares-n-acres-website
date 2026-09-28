<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Time\Ist;

/**
 * A lead's timeline (05_BUSINESS_RULES.md → "Leads": "Activities are
 * appended, never edited"), a port of `mock-server/lib/activities.js`.
 *
 * Every change a lead goes through leaves an entry behind, and the admin lead
 * page renders nothing else. The sentences are built here so that "Status
 * changed from New to Contacted" reads the same whether the change arrived
 * from a PATCH, a bulk action or a claim; labels come from the enums, and
 * dates are printed in IST ("05 Sep 2026, 10:00 am").
 */
final class Timeline
{
    /** The words "Details updated — …" uses for each field the desk may correct. */
    private const DETAIL_LABELS = ['name' => 'name', 'phone' => 'phone', 'email' => 'e-mail', 'requirement' => 'requirement'];

    /**
     * The lead with one more entry on its timeline; the entry's id is local to
     * the lead (`max(id) + 1`), and `note` is what was said on an entry the
     * desk logged.
     */
    public static function add(array $lead, string $type, string $description, ?int $createdBy = null, ?string $at = null, ?string $note = null): array
    {
        $activities = Js::isList($lead['activities'] ?? null) ? $lead['activities'] : [];
        $activities[] = [
            'id' => self::nextId($activities),
            'type' => $type,
            'description' => $description,
            'note' => $note === null || $note === '' ? null : $note,
            'createdBy' => $createdBy,
            'createdAt' => $at ?? Clock::nowIso(),
        ];
        $lead['activities'] = $activities;

        return $lead;
    }

    /** The next id of a lead's notes or activities: one more than the highest. */
    public static function nextId(array $entries): int
    {
        $highest = 0;
        foreach ($entries as $entry) {
            $id = Js::toNumber(Js::get($entry, 'id'));
            if ($id !== null && $id > $highest) {
                $highest = $id;
            }
        }

        return (int) $highest + 1;
    }

    /** "Lead created via Property Enquiry". */
    public static function created(string $source): string
    {
        return 'Lead created via '.Contract::enumLabel('LEAD_SOURCES', $source);
    }

    /**
     * "Status changed from New to Contacted". A move to Lost carries its
     * reason — "… to Lost — Bought elsewhere" — because the lead's
     * `lostReason` is cleared when it is reopened, and the timeline is then
     * the one place that still says why it was closed.
     */
    public static function statusChange(mixed $from, mixed $to, mixed $reason): string
    {
        $suffix = $to === 'lost' && is_string($reason) && $reason !== '' ? " — {$reason}" : '';

        return 'Status changed from '.self::label('LEAD_STATUS', $from).' to '.self::label('LEAD_STATUS', $to).$suffix;
    }

    /** "Details updated by Sales User — phone, requirement": the desk corrected what the form captured. */
    public static function detailsUpdate(array $fields, ?string $byName): string
    {
        $by = $byName !== null && $byName !== '' ? " by {$byName}" : '';

        return "Details updated{$by} — ".implode(', ', array_map(fn (string $field) => self::DETAIL_LABELS[$field] ?? $field, $fields));
    }

    /** "Priority changed from Medium to High". */
    public static function priorityChange(mixed $from, mixed $to): string
    {
        return 'Priority changed from '.self::label('LEAD_PRIORITY', $from).' to '.self::label('LEAD_PRIORITY', $to);
    }

    /** "Assigned to Sales User", or "Unassigned" when the lead was let go. */
    public static function assignment(?string $name): string
    {
        return $name !== null && $name !== '' ? "Assigned to {$name}" : 'Unassigned';
    }

    /**
     * "Follow-up set for 05 Sep 2026, 10:00 am", or "Follow-up cleared" — in
     * IST and with the time: printing the UTC date of a 01:30 call put it on
     * the day before.
     */
    public static function followUp(mixed $value): string
    {
        return $value !== null && $value !== '' && $value !== false
            ? 'Follow-up set for '.Ist::formatDateTime($value)
            : 'Follow-up cleared';
    }

    /** An enum value's label, or the value itself when it has none. */
    private static function label(string $enum, mixed $value): string
    {
        return Contract::enumLabel($enum, $value) ?: Js::string($value);
    }
}
