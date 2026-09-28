<?php

namespace App\Domain\Leads;

use App\Support\Js;

/**
 * The message the desk's WhatsApp buttons open with (09_MEDIA_AND_EMAIL.md →
 * "The WhatsApp template"), a port of `src/config/leadWhatsapp.js`.
 *
 * `settings.leads.whatsappTemplate` holds it, so the agency words it once;
 * it is filled server-side because the `leads` branch of the settings is not
 * a sales user's to read, and the sales desk is who sends it.
 */
final class WhatsappTemplate
{
    /** Today's sentence, with the brand as a placeholder. */
    public const DEFAULT = 'Hello {name}, this is {brand} following up on your enquiry.';

    /**
     * A template with its placeholders filled in. A placeholder with nothing
     * behind it — no listing, no colleague — is left out with the space
     * before it, and the spaces it leaves before a comma or a full stop are
     * closed: "Hello {name}, about {property}." for a lead with no listing
     * reads "Hello Asha, about.". Any other `{…}` is left as typed.
     *
     * @param  array{name?: ?string, property?: ?string, agent?: ?string, link?: ?string, brand?: ?string}  $values
     */
    public static function fill(mixed $template, array $values): string
    {
        $text = is_string($template) && Js::trim($template) !== '' ? $template : self::DEFAULT;
        $text = (string) preg_replace_callback(
            '/\{(name|property|agent|link|brand)\}/',
            fn (array $match) => Js::trim(Js::string($values[$match[1]] ?? '')),
            $text,
        );
        $text = (string) preg_replace('/[ \t]+([,.!?;:])/', '$1', $text);

        return Js::trim((string) preg_replace('/[ \t]{2,}/', ' ', $text));
    }
}
