<?php

namespace App\Domain\Leads;

use App\Models\Article;
use App\Models\Property;
use App\Support\Api\ApiException;

/**
 * The records a lead points at. The mock keeps whatever `propertyId` or
 * `articleId` the public form (or a PATCH) sends; here they are foreign keys
 * of `leads`, so an id that no row has ever held is refused with 422 — the
 * `exists:properties,id` / `exists:articles,id` of 03_ENDPOINTS.md — rather
 * than failing the insert. A listing or an article that was deleted keeps its
 * (soft-deleted) row, so a lead sent from a stale page about it is stored as
 * the mock stores it: with the id, and no listing to name.
 */
final class LeadReferences
{
    private const REFERENCES = [
        'propertyId' => [Property::class, 'The selected property does not exist.'],
        'articleId' => [Article::class, 'The selected article does not exist.'],
    ];

    /** @param  array  $fields  a body or a change set; only the references it carries are checked */
    public static function assertStorable(array $fields): void
    {
        $errors = [];
        foreach (self::REFERENCES as $field => [$model, $message]) {
            $id = $fields[$field] ?? null;
            if ($id !== null && ! (is_numeric($id) && $model::withTrashed()->whereKey((int) $id)->exists())) {
                $errors[$field] = $message;
            }
        }
        if ($errors !== []) {
            throw ApiException::validation($errors);
        }
    }
}
