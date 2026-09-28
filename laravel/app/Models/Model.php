<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model as Eloquent;

/**
 * The base of every model of the API.
 *
 * Every timestamp column is `DATETIME(3)` in UTC: the contract reports
 * milliseconds, and the stale-save guard compares the exact `updatedAt` a
 * form read (laravel/README.md → "Deviations from schema.sql").
 *
 * The API's writes go through App\Store\DocumentStore, which validates every
 * body against the contract first, so no model restricts mass assignment.
 */
abstract class Model extends Eloquent
{
    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = [];
}
