<?php

namespace App\Domain\Leads;

use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Js;
use App\Support\Time\Clock;

/**
 * Who a lead goes to (05_BUSINESS_RULES.md → "Leads", step 6, and "Owners").
 *
 * A repeat enquiry goes to the colleague who holds the open lead from the
 * same number; otherwise `settings.leads.autoAssign` decides — nobody, the
 * next sales user in the rotation, or the account linked to the advisor of
 * the listing the lead names, with the rotation as the fallback.
 */
final class LeadAssignment
{
    /** How recent an open lead from the same number must be for a new enquiry to go to its owner. */
    private const REPEAT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

    /** The roles a listing's advisor may be linked to and still receive leads. */
    private const ADVISOR_ROLES = ['sales', 'manager'];

    public function __construct(private DocumentStore $store) {}

    /** The id of the colleague a new lead goes to by `settings.leads.autoAssign`, or null. */
    public function autoAssignee(array $record): ?int
    {
        $mode = Js::get(Js::get($this->store->singleton('siteSettings'), 'leads'), 'autoAssign');

        return match ($mode) {
            'listing-advisor' => $this->advisorOf($record['propertyId'] ?? null) ?? $this->nextInRotation(),
            'round-robin' => $this->nextInRotation(),
            default => null,
        };
    }

    /**
     * The open lead a new enquiry repeats: the newest one from the same
     * number, not converted or lost, created within thirty days. A lead with
     * no number repeats nothing.
     */
    public function repeatedLead(array $record, int $now): ?array
    {
        $key = LeadPhone::key($record['phone'] ?? null);
        if ($key === '') {
            return null;
        }
        $matches = array_values(array_filter($this->store->all('leads'), function (array $lead) use ($key, $now) {
            $created = Clock::ms($lead['createdAt'] ?? null);

            return LeadFilters::isOpen($lead)
                && LeadPhone::key($lead['phone'] ?? null) === $key
                && $created !== null
                && $now - $created <= self::REPEAT_WINDOW_MS;
        }));
        usort($matches, fn (array $left, array $right) => Clock::ms($right['createdAt']) <=> Clock::ms($left['createdAt']));

        return $matches[0] ?? null;
    }

    /**
     * `id` when it names an active account (of one of `roles`, when given) —
     * somebody who can still sign in and work a lead — else null.
     */
    public function activeOwner(mixed $id, ?array $roles = null): ?int
    {
        $user = $id === null ? null : $this->store->find('adminUsers', $id);
        if ($user === null || ($user['isActive'] ?? true) === false || ($roles !== null && ! in_array($user['role'] ?? null, $roles, true))) {
            return null;
        }

        return $user['id'];
    }

    /** The name of an admin user, or null. */
    public function userName(mixed $id): ?string
    {
        return $id === null ? null : ($this->store->find('adminUsers', $id)['name'] ?? null);
    }

    /**
     * Refuses a colleague a lead may not be handed to, naming `field`. A
     * deactivated account cannot sign in to work the lead, so it is refused
     * as a new owner; a lead that already sits with one keeps it until it is
     * reassigned.
     */
    public function assertAssignable(mixed $assignee, string $field, mixed $current = null): void
    {
        if ($assignee === null || Js::string($assignee) === Js::string($current ?? '')) {
            return;
        }
        $user = $this->store->find('adminUsers', $assignee);
        if ($user === null) {
            throw ApiException::validation([$field => 'The selected user does not exist.']);
        }
        if (($user['isActive'] ?? true) === false) {
            throw ApiException::validation([$field => 'The selected user is inactive.']);
        }
    }

    /**
     * The account behind a listing's advisor card, when it can take the lead:
     * the card is active and linked to an active sales or manager account.
     */
    private function advisorOf(mixed $propertyId): ?int
    {
        $property = $propertyId === null ? null : $this->store->find('properties', $propertyId);
        $memberId = Js::get($property['agent'] ?? null, 'teamMemberId');
        $member = $memberId === null ? null : $this->store->find('teamMembers', $memberId);
        if ($member === null || ($member['isActive'] ?? true) === false) {
            return null;
        }

        return $this->activeOwner($member['userId'] ?? null, self::ADVISOR_ROLES);
    }

    /**
     * The next sales user in the rotation. The turn is derived from the leads
     * themselves — the most recently created one that went to a sales user
     * decides who is next — so no cursor is kept. A colleague deactivated
     * since is simply out of the ring: the turn passes to the first one.
     */
    private function nextInRotation(): ?int
    {
        $sales = array_values(array_filter(
            $this->store->all('adminUsers'),
            fn (array $user) => ($user['role'] ?? null) === 'sales' && ($user['isActive'] ?? true) !== false,
        ));
        if ($sales === []) {
            return null;
        }
        usort($sales, fn (array $left, array $right) => $left['id'] <=> $right['id']);
        $ids = array_map(fn (array $user) => Js::string($user['id']), $sales);

        $previous = null;
        foreach ($this->store->all('leads') as $lead) {
            if (! in_array(Js::string($lead['assignedTo'] ?? null), $ids, true)) {
                continue;
            }
            if ($previous === null || self::createdOrder($previous, $lead) <= 0) {
                $previous = $lead;
            }
        }
        if ($previous === null) {
            return $sales[0]['id'];
        }
        $index = array_search(Js::string($previous['assignedTo']), $ids, true);

        return $sales[($index + 1) % count($sales)]['id'];
    }

    /** Oldest first, then the lower id — the order whose last lead holds the turn. */
    private static function createdOrder(array $left, array $right): int
    {
        return (Clock::ms($left['createdAt'] ?? null) ?? 0) <=> (Clock::ms($right['createdAt'] ?? null) ?? 0)
            ?: (int) $left['id'] <=> (int) $right['id'];
    }
}
