<?php

namespace App\Crud;

use App\Store\DocumentStore;

/**
 * Who last saved a record, by name — for the admin reads that print "Last
 * saved 5 minutes ago by Priya". The record keeps the id (`updated_by`); the
 * name is joined on read, so a renamed account reads by its current name.
 * Public reads never carry it.
 */
final class Editors
{
    public static function withName(array $record, DocumentStore $store): array
    {
        $editor = ($record['updatedBy'] ?? null) === null ? null : $store->find('adminUsers', $record['updatedBy']);
        $record['updatedByName'] = $editor['name'] ?? null;

        return $record;
    }
}
