<?php

namespace App\Domain\Leads;

use App\Contract\Contract;
use App\Models\AdminUser;
use App\Models\Article;
use App\Models\Property;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Validation\SchemaValidator;

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

    /**
     * The notes a PATCH sends. The mock lets every field of the lead model
     * through a PATCH, `notes` included, and stores whatever list arrives;
     * here each note is a row of `lead_notes`, so the list is held to the
     * model's own shape — an id, the text, when it was written — and its
     * authors must exist, and a malformed list is a 422 rather than a failed
     * insert. A well-formed list replaces the notes, as on the mock.
     *
     * @param  array  $changes  a PATCH's change set; nothing is asked when it carries no notes
     */
    public static function assertStorableNotes(array $changes): void
    {
        if (! array_key_exists('notes', $changes)) {
            return;
        }

        $notes = $changes['notes'];
        $errors = SchemaValidator::errors(['notes' => Contract::model('leads')['fields']['notes']], ['notes' => $notes]);
        foreach ($errors === [] ? $notes : [] as $index => $note) {
            $author = Js::get($note, 'createdBy');
            if ($author !== null && ! AdminUser::whereKey($author)->exists()) {
                $errors["notes.{$index}.createdBy"] = ["The selected notes.{$index}.createdBy is invalid."];
            }
        }
        if ($errors !== []) {
            ApiLog::info('leads', 'PATCH refused: notes the table cannot hold', ['errors' => $errors]);

            throw ApiException::validation($errors);
        }
    }
}
