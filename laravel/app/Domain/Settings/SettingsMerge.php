<?php

namespace App\Domain\Settings;

use App\Contract\Contract;
use App\Crud\CrudResource;
use App\Support\Api\ApiException;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;
use App\Support\Validation\SchemaValidator;
use stdClass;

/**
 * How a settings `PUT` lands on its singleton (05_BUSINESS_RULES.md → "Settings").
 *
 * `siteSettings` and `seoSettings` are one object each, and the admin edits
 * them a panel at a time, sending only what changed since it loaded (QA-64):
 * a `PUT` carrying `{ general: { siteName } }` must keep the other `general.*`
 * keys and every other panel. That makes this the one `PUT` of the contract
 * that merges instead of replacing, under two rules:
 *
 *  - known keys only — what the model does not declare is dropped, so a stale
 *    field from an old bundle cannot take up residence in the data;
 *  - arrays replace — `footer.columns` is a list the editor reordered, and
 *    merging it entry by entry would resurrect a link they deleted.
 */
final class SettingsMerge
{
    /**
     * Validates a body, drops what the model does not know, merges the rest
     * into the stored singleton and stamps it.
     *
     * Every key is optional: `partial` means "do not demand the panels you
     * did not open", not "skip the checks". The body is checked as sent, so a
     * JSON array — `[]` included — is refused as no object.
     *
     * @param  mixed  $body  the decoded request body (null when there is none)
     * @param  string  $schema  the request schema (`settings.update`)
     * @param  string  $collection  the singleton (`siteSettings`)
     */
    public static function apply(?array $current, mixed $body, string $schema, string $collection): array
    {
        if (Js::isList($body)) {
            throw ApiException::validation(['' => 'The  must be an object.']);
        }
        SchemaValidator::validate(Contract::schema($schema), $body ?? [], ['partial' => true]);
        $clean = Documents::sanitize($body ?? [], Contract::model($collection)['fields']);

        return [...self::deepMergeKnown($current ?? [], $clean), 'updatedAt' => Clock::nowIso()];
    }

    /**
     * `patch` merged into `target` at every depth: an object descends into
     * the stored object, anything else (an array included) replaces it.
     */
    public static function deepMergeKnown(array|stdClass $target, array $patch): array
    {
        $merged = Js::entries($target);
        foreach ($patch as $key => $value) {
            $stored = $merged[$key] ?? null;
            $merged[$key] = Js::isPlainObject($value) && Js::isPlainObject($stored)
                ? CrudResource::object(self::deepMergeKnown($stored, Js::entries($value)))
                : $value;
        }

        return $merged;
    }
}
