<?php

namespace App\Models;

/**
 * A newsletter subscriber (`newsletterSubscribers`).
 *
 * Table `newsletter_subscribers`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class NewsletterSubscriber extends Model
{
    protected $table = 'newsletter_subscribers';

    protected function casts(): array
    {
        return [
        ];
    }
}
