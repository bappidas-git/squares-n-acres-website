<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A record of a file in the media library (`media`); the file itself lives on Cloudinary.
 *
 * Table `media`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Media extends Model
{
    protected $table = 'media';

    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'bytes' => 'integer',
            'tags' => AsJsonValue::class,
            'created_by' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }
}
