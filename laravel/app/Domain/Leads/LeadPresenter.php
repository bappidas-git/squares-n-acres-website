<?php

namespace App\Domain\Leads;

use App\Domain\Embed;
use App\Store\DocumentStore;
use App\Support\Js;

/**
 * A lead as a response returns it (01_API_CONTRACT.md, `Lead`).
 *
 * Every read embeds `property` (from the lead's snapshot once the listing is
 * gone) and `assignedUser`. An admin read adds `isPossibleDuplicate` — the
 * moment to notice that somebody has enquired twice is while reading the row,
 * not after calling them twice — and `whatsappMessage`; the public form's
 * answer drops `ipAddress` and `userAgent`, which are for the CRM. A list row
 * drops the timeline, which only the detail renders; on the detail each entry
 * carries its author's name, `createdByName`, because a sales user cannot
 * read the directory to look it up.
 */
final class LeadPresenter
{
    private Embed $embed;

    public function __construct(private DocumentStore $store)
    {
        $this->embed = new Embed($store);
    }

    /** The detail of a lead, as an admin read answers it. */
    public function admin(array $lead): array
    {
        return $this->withAuthors($this->adminRow($lead, LeadPhone::duplicateIndex($this->store->all('leads'))));
    }

    /** The rows of the lead list: one duplicate index for the whole page. */
    public function rows(array $leads): array
    {
        $duplicates = LeadPhone::duplicateIndex($this->store->all('leads'));

        return array_map(function (array $lead) use ($duplicates) {
            $row = $this->adminRow($lead, $duplicates);
            unset($row['activities']);

            return $row;
        }, array_values($leads));
    }

    /** The lead as the public form's 201 returns it. */
    public function public(array $lead): array
    {
        $embedded = $this->embed->lead($lead);
        unset($embedded['ipAddress'], $embedded['userAgent']);

        return $this->withAuthors($embedded);
    }

    private function adminRow(array $lead, array $duplicates): array
    {
        $embedded = $this->embed->lead($lead);

        return [
            ...$embedded,
            'isPossibleDuplicate' => LeadPhone::isPossibleDuplicate($lead, $duplicates),
            'whatsappMessage' => $this->whatsappMessage($embedded),
        ];
    }

    private function withAuthors(array $lead): array
    {
        if (! Js::isList($lead['activities'] ?? null)) {
            return $lead;
        }
        $lead['activities'] = array_map(
            fn (array $activity) => [...$activity, 'createdByName' => $this->authorName($activity['createdBy'] ?? null)],
            $lead['activities'],
        );

        return $lead;
    }

    private function authorName(mixed $id): ?string
    {
        return $id === null ? null : ($this->store->find('adminUsers', $id)['name'] ?? null);
    }

    /**
     * `settings.leads.whatsappTemplate` filled in for the lead: its name, its
     * listing's title and public address while the listing exists, the
     * colleague it is with, and the site's name.
     *
     * @param  array  $lead  the lead with `property` and `assignedUser` embedded
     */
    private function whatsappMessage(array $lead): string
    {
        $settings = $this->store->singleton('siteSettings') ?? [];
        $general = Js::get($settings, 'general');
        $live = $lead['property'] !== null && empty($lead['property']['deleted']) ? $lead['property'] : null;
        $siteUrl = (string) preg_replace('~/+$~D', '', Js::string(Js::get($general, 'siteUrl') ?? ''));
        $slug = $live['slug'] ?? null;

        return WhatsappTemplate::fill(Js::get(Js::get($settings, 'leads'), 'whatsappTemplate'), [
            'name' => $lead['name'] ?? null,
            'property' => $live['title'] ?? '',
            'agent' => $lead['assignedUser']['name'] ?? '',
            'link' => $slug !== null && $slug !== '' && $siteUrl !== '' ? "{$siteUrl}/properties/{$slug}" : '',
            'brand' => Js::get($general, 'siteName') ?? '',
        ]);
    }
}
