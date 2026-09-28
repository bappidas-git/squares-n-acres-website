<?php

namespace App\Domain\Leads;

/**
 * Sales scoping (02_AUTH_AND_RBAC.md → "Sales scoping").
 *
 * A sales user sees the leads assigned to them and the ones nobody has taken
 * yet — which is what makes "claim" possible — and nothing else. The scope is
 * applied before any filter of the list, so it governs the detail read, the
 * export, the aggregates and every write: a lead outside it is a 404.
 */
final class LeadScope
{
    public static function canSee(array $lead, ?array $user): bool
    {
        if ($user === null) {
            return false;
        }
        if (($user['role'] ?? null) !== 'sales') {
            return true;
        }
        $assigned = $lead['assignedTo'] ?? null;

        return $assigned === null || (string) $assigned === (string) $user['id'];
    }

    /** The leads a user may see, in the order they came in. */
    public static function visible(array $leads, ?array $user): array
    {
        if (($user['role'] ?? null) !== 'sales') {
            return array_values($leads);
        }

        return array_values(array_filter($leads, fn (array $lead) => self::canSee($lead, $user)));
    }
}
