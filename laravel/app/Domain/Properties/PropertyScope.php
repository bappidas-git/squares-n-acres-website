<?php

namespace App\Domain\Properties;

use App\Support\Js;

/**
 * A listing as the public site may see it (01_API_CONTRACT.md §5.10,
 * 05_BUSINESS_RULES.md → "Gated files"):
 *
 *  - no audit columns (`createdBy`, `updatedBy`);
 *  - the agent's phone, WhatsApp and e-mail only when `showOnListing`;
 *  - no address for a file kept behind the lead form: the brochure while
 *    `brochureLeadGated` (`brochureUrl: null`, `hasBrochure`), a gated
 *    document (`url: null`, `hasFile`), and every floor plan and unit plan
 *    (`imageUrl`/`pdfUrl` null with `hasImage`/`hasPdf`) — always gated.
 *    One file, one gate: an open document whose address is a gated file's is
 *    gated with it. A document that is the brochure's own file is left out.
 *
 * The addresses are handed over by `POST /properties/:id/documents/access`
 * (App\Domain\Tokens\FileAccess) once the visitor has filed a lead.
 */
final class PropertyScope
{
    private static function filled(mixed $value): bool
    {
        return is_string($value) && Js::trim($value) !== '';
    }

    private static function address(mixed $value): ?string
    {
        return self::filled($value) ? Js::trim($value) : null;
    }

    /** Every drawing and PDF, on the plans and the unit configurations. */
    private static function floorPlanUrls(array $property): array
    {
        $urls = [];
        foreach ((array) ($property['floorPlans'] ?? []) as $plan) {
            $urls[] = self::address(Js::get($plan, 'imageUrl'));
            $urls[] = self::address(Js::get($plan, 'pdfUrl'));
        }
        foreach ((array) ($property['unitConfigurations'] ?? []) as $unit) {
            $urls[] = self::address(Js::get($unit, 'floorPlanImageUrl'));
            $urls[] = self::address(Js::get($unit, 'floorPlanPdfUrl'));
        }

        return array_values(array_filter($urls));
    }

    public static function withoutGatedFiles(array $property): array
    {
        $brochure = self::address($property['brochureUrl'] ?? null);
        $documents = is_array($property['documents'] ?? null) ? $property['documents'] : [];

        $gated = [];
        foreach ($documents as $document) {
            if (Js::get($document, 'leadGated') !== false && self::filled(Js::get($document, 'url'))) {
                $gated[Js::trim(Js::get($document, 'url'))] = true;
            }
        }
        foreach (self::floorPlanUrls($property) as $url) {
            $gated[$url] = true;
        }
        $brochureGated = $brochure !== null && (($property['brochureLeadGated'] ?? true) !== false || isset($gated[$brochure]));
        if ($brochureGated) {
            $gated[$brochure] = true;
        }

        $scoped = [...$property, 'brochureUrl' => $brochureGated ? null : ($property['brochureUrl'] ?? null)];
        if ($brochureGated) {
            $scoped['brochureLeadGated'] = true;
        }
        $scoped['hasBrochure'] = $brochure !== null;

        if (is_array($property['documents'] ?? null)) {
            $scoped['documents'] = [];
            foreach ($documents as $document) {
                if ($brochure !== null && self::filled(Js::get($document, 'url')) && Js::trim(Js::get($document, 'url')) === $brochure) {
                    continue;
                }
                if (! Js::isPlainObject($document)) {
                    $scoped['documents'][] = $document;

                    continue;
                }
                $document = Js::entries($document);
                $url = self::address($document['url'] ?? null);
                $scoped['documents'][] = $url !== null && isset($gated[$url])
                    ? [...$document, 'url' => null, 'leadGated' => true, 'hasFile' => true]
                    : [...$document, 'hasFile' => $url !== null];
            }
        }

        if (is_array($property['floorPlans'] ?? null)) {
            $scoped['floorPlans'] = array_map(fn ($plan) => Js::isPlainObject($plan) ? [
                ...Js::entries($plan),
                'imageUrl' => null,
                'pdfUrl' => null,
                'hasImage' => self::filled(Js::get($plan, 'imageUrl')),
                'hasPdf' => self::filled(Js::get($plan, 'pdfUrl')),
            ] : $plan, $property['floorPlans']);
        }

        if (is_array($property['unitConfigurations'] ?? null)) {
            $scoped['unitConfigurations'] = array_map(fn ($unit) => Js::isPlainObject($unit) ? [
                ...Js::entries($unit),
                'floorPlanImageUrl' => null,
                'floorPlanPdfUrl' => null,
                'hasFloorPlanImage' => self::filled(Js::get($unit, 'floorPlanImageUrl')),
                'hasFloorPlanPdf' => self::filled(Js::get($unit, 'floorPlanPdfUrl')),
            ] : $unit, $property['unitConfigurations']);
        }

        return $scoped;
    }

    /** The public read of a listing. */
    public static function publicProperty(array $property): array
    {
        $scoped = self::withoutGatedFiles(array_diff_key($property, ['createdBy' => true, 'updatedBy' => true]));
        $agent = $property['agent'] ?? null;
        if (! Js::isPlainObject($agent)) {
            return $scoped;
        }
        $agent = Js::entries($agent);
        $scoped['agent'] = ($agent['showOnListing'] ?? false)
            ? $agent
            : array_diff_key($agent, ['phone' => true, 'whatsapp' => true, 'email' => true]);

        return $scoped;
    }

    /**
     * Every file of a listing with its address — what
     * `POST /properties/:id/documents/access` answers once the token checks
     * out. The brochure's own document and inactive unit configurations are
     * left out, as the public read leaves them out.
     */
    public static function files(array $property): array
    {
        $brochure = self::address($property['brochureUrl'] ?? null);

        $documents = [];
        foreach ((array) ($property['documents'] ?? []) as $document) {
            $url = Js::get($document, 'url');
            if (! self::filled($url) || ($brochure !== null && Js::trim($url) === $brochure)) {
                continue;
            }
            $documents[] = ['id' => Js::get($document, 'id'), 'url' => Js::trim($url)];
        }

        $floorPlans = [];
        foreach ((array) ($property['floorPlans'] ?? []) as $plan) {
            if (self::filled(Js::get($plan, 'imageUrl')) || self::filled(Js::get($plan, 'pdfUrl'))) {
                $floorPlans[] = [
                    'id' => Js::get($plan, 'id'),
                    'imageUrl' => self::address(Js::get($plan, 'imageUrl')),
                    'pdfUrl' => self::address(Js::get($plan, 'pdfUrl')),
                ];
            }
        }

        $units = [];
        foreach ((array) ($property['unitConfigurations'] ?? []) as $unit) {
            if (Js::get($unit, 'isActive') === false) {
                continue;
            }
            if (self::filled(Js::get($unit, 'floorPlanImageUrl')) || self::filled(Js::get($unit, 'floorPlanPdfUrl'))) {
                $units[] = [
                    'id' => Js::get($unit, 'id'),
                    'floorPlanImageUrl' => self::address(Js::get($unit, 'floorPlanImageUrl')),
                    'floorPlanPdfUrl' => self::address(Js::get($unit, 'floorPlanPdfUrl')),
                ];
            }
        }

        return ['brochureUrl' => $brochure, 'documents' => $documents, 'floorPlans' => $floorPlans, 'unitConfigurations' => $units];
    }
}
