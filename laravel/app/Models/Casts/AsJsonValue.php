<?php

namespace App\Models\Casts;

use App\Support\Json\JsonValue;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * A JSON column that keeps `{}` apart from `[]`.
 *
 * Laravel's `array` cast decodes both to `[]` and writes `[]` back, so a page
 * block whose `data` is `{}` would come back as a list. This cast decodes
 * with App\Support\Json\JsonValue, which keeps the objects PHP arrays cannot
 * represent as `stdClass`, and encodes with the flags every response uses.
 */
class AsJsonValue implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        return $value === null ? null : JsonValue::decode((string) $value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : JsonValue::encode($value);
    }
}
