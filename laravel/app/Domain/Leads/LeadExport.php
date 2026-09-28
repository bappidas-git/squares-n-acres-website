<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Domain\Embed;
use App\Store\DocumentStore;
use App\Support\Csv;
use App\Support\Time\Ist;

/**
 * `GET /admin/leads/export` (05_BUSINESS_RULES.md → "CSV export"): the rows of
 * the list — same scope, same filters, same order — as the CRM prints them.
 *
 * Cells carry labels rather than stored values (the source, the status, the
 * priority, the requirement in words), a deleted listing is still named from
 * the lead's snapshot, and the two dates are IST wall-clock times
 * (`2026-09-14 18:00`), which a spreadsheet reads as dates.
 */
final class LeadExport
{
    /** The columns, in order. */
    private const COLUMNS = [
        ['key' => 'id', 'label' => 'ID'],
        ['key' => 'name', 'label' => 'Name'],
        ['key' => 'phone', 'label' => 'Phone'],
        ['key' => 'email', 'label' => 'Email'],
        ['key' => 'source', 'label' => 'Source'],
        ['key' => 'status', 'label' => 'Status'],
        ['key' => 'lostReason', 'label' => 'Lost Reason'],
        ['key' => 'priority', 'label' => 'Priority'],
        ['key' => 'assignedTo', 'label' => 'Assigned To'],
        ['key' => 'property', 'label' => 'Property'],
        ['key' => 'requirement', 'label' => 'Requirement'],
        ['key' => 'message', 'label' => 'Message'],
        ['key' => 'followUpAt', 'label' => 'Follow-up (IST)'],
        ['key' => 'createdAt', 'label' => 'Created At (IST)'],
    ];

    public function __construct(private DocumentStore $store) {}

    /** The CSV document of the leads given, in the order given. */
    public function csv(array $leads): string
    {
        $embed = new Embed($this->store);
        $requirements = new RequirementText($this->store);

        $rows = array_map(fn (array $lead) => [
            'id' => $lead['id'],
            'name' => $lead['name'] ?? null,
            'phone' => $lead['phone'] ?? null,
            'email' => $lead['email'] ?? null,
            'source' => self::label('LEAD_SOURCES', $lead['source'] ?? null),
            'status' => self::label('LEAD_STATUS', $lead['status'] ?? null),
            'lostReason' => ($lead['status'] ?? null) === 'lost' ? ($lead['lostReason'] ?? null) : null,
            'priority' => self::label('LEAD_PRIORITY', $lead['priority'] ?? null),
            'assignedTo' => ($lead['assignedTo'] ?? null) === null ? null : ($this->store->find('adminUsers', $lead['assignedTo'])['name'] ?? null),
            'property' => $embed->leadProperty($lead)['title'] ?? null,
            'requirement' => $requirements->describe($lead['requirement'] ?? null),
            'message' => $lead['message'] ?? null,
            'followUpAt' => Ist::dateTime($lead['followUpAt'] ?? null),
            'createdAt' => Ist::dateTime($lead['createdAt'] ?? null),
        ], $leads);

        return Csv::render($rows, self::COLUMNS);
    }

    /** Named after the day it was taken, in IST — the browser names its own copy the same way. */
    public static function filename(): string
    {
        return 'leads-'.Ist::today().'.csv';
    }

    /** A value's label, or the value itself when it has none. */
    private static function label(string $enum, mixed $value): mixed
    {
        return Contract::enumLabel($enum, $value) ?: $value;
    }
}
