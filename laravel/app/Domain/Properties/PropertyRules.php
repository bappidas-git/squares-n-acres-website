<?php

namespace App\Domain\Properties;

use App\Support\Js;
use App\Support\Text\Html;

/**
 * What a listing needs before it may go live (05_BUSINESS_RULES.md →
 * "Property writes"; the port of `src/config/propertyRules.js`).
 *
 * The form refused a half-written listing all along; the list's eye toggle,
 * its row menu and its bulk bar never go through the form, and put one on the
 * site with no photograph, no description and no price. One set of rules and
 * sentences serves both sides, so the sentence an editor reads under a field
 * is the sentence the API answers with. Asked of every POST and PUT that
 * leaves a listing live, of a PATCH that touches PUBLISH_FIELDS, and of the
 * bulk "activate".
 */
final class PropertyRules
{
    /** A published listing's description needs this many characters of text. */
    public const DESCRIPTION_MIN = 300;

    /**
     * What an image without a description is told — only when the listing
     * goes live: a draft with twenty-five photographs is saved as it is.
     */
    public const ALT_MESSAGE = 'Describe this image — screen readers and search engines read it.';

    /**
     * The fields the rules read. A PATCH that sends none of them — a featured
     * star, a priority — is not asked: it changes nothing the rules are about.
     */
    public const PUBLISH_FIELDS = ['isActive', 'listingType', 'images', 'description', 'shortDescription', 'pricing'];

    /** `images.3.alt` — the key a missing description is refused under. */
    private const ALT_KEY = '/^images\.\d+\.alt$/';

    private static function isBlank(mixed $value): bool
    {
        return $value === null || Js::trim(Js::string($value)) === '';
    }

    private static function isRental(array $property): bool
    {
        return in_array($property['listingType'] ?? null, ['rent', 'lease'], true);
    }

    /** The UTF-16 length of the text a reader sees in the description. */
    private static function descriptionLength(array $property): int
    {
        return Js::length(Html::plainText($property['description'] ?? null));
    }

    /**
     * Whether a visitor would find a number on the page — a price, a range
     * with both ends, a monthly rent — or "Price on request".
     */
    public static function isPriced(array $property): bool
    {
        $pricing = $property['pricing'] ?? null;
        if (Js::get($pricing, 'priceOnRequest') === true) {
            return true;
        }
        if (self::isRental($property)) {
            return ! self::isBlank(Js::get($pricing, 'rentPerMonth'));
        }

        return ! self::isBlank(Js::get($pricing, 'price'))
            || (! self::isBlank(Js::get($pricing, 'priceRangeMin')) && ! self::isBlank(Js::get($pricing, 'priceRangeMax')));
    }

    /**
     * What stands between a listing and the site, keyed the way a 422 keys it;
     * `[]` when the listing may go live.
     *
     * @return array<string, string>
     */
    public static function problems(array $property): array
    {
        $found = [];
        $images = Js::isList($property['images'] ?? null) ? $property['images'] : [];

        // The gallery as a whole: with no image there is no `images.0` to hang the message on.
        $shown = array_filter($images, fn ($image) => ! self::isBlank(Js::get($image, 'url')));
        if ($shown === []) {
            $found['images'] = 'A published listing needs at least one image with a description.';
        }
        // …and every image it shows is described, each under its own box.
        foreach ($images as $index => $image) {
            if (! self::isBlank(Js::get($image, 'url')) && self::isBlank(Js::get($image, 'alt'))) {
                $found["images.{$index}.alt"] = self::ALT_MESSAGE;
            }
        }

        $length = self::descriptionLength($property);
        if ($length < self::DESCRIPTION_MIN) {
            $found['description'] = 'A published listing needs a description of at least '.self::DESCRIPTION_MIN." characters (this one has {$length}).";
        }

        if (self::isBlank($property['shortDescription'] ?? null)) {
            $found['shortDescription'] = 'A published listing needs a one-line summary.';
        }

        if (! self::isPriced($property)) {
            if (self::isRental($property)) {
                $found['pricing.rentPerMonth'] = 'A published rental needs a monthly rent, or “Price on request”.';
            } else {
                $found['pricing.price'] = 'A published listing needs a price, a price range, or “Price on request”.';
            }
        }

        return $found;
    }

    /**
     * The same problems as short phrases — "no price", "120 of 300 characters
     * of description" — for a list that names several listings at once.
     *
     * @param  array<string, string>  $problems
     * @return array<int, string>
     */
    public static function gaps(array $problems, array $property): array
    {
        $gaps = [];
        if (isset($problems['images'])) {
            $gaps[] = 'no photograph with a description';
        }
        $undescribed = count(array_filter(array_keys($problems), fn (string $key) => preg_match(self::ALT_KEY, $key) === 1));
        if ($undescribed > 0) {
            $gaps[] = "{$undescribed} ".($undescribed === 1 ? 'photograph' : 'photographs').' without a description';
        }
        if (isset($problems['description'])) {
            $gaps[] = self::descriptionLength($property).' of '.self::DESCRIPTION_MIN.' characters of description';
        }
        if (isset($problems['shortDescription'])) {
            $gaps[] = 'no one-line summary';
        }
        if (isset($problems['pricing.rentPerMonth'])) {
            $gaps[] = 'no rent';
        }
        if (isset($problems['pricing.price'])) {
            $gaps[] = 'no price';
        }

        return $gaps;
    }

    /** The sentence a refusal leads with: `“Aurelia Court” is not ready to go live: no price, no one-line summary.` */
    public static function notReadyMessage(array $property, array $gaps): string
    {
        $title = $property['title'] ?? null;
        $name = $title === null || $title === '' || $title === false ? 'This listing' : Js::string($title);

        return "“{$name}” is not ready to go live: ".implode(', ', $gaps).'.';
    }
}
