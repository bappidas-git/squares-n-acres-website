<?php

namespace App\Crud\Definitions;

/**
 * Newsletter subscribers in the panel (05_BUSINESS_RULES.md → "Newsletter and
 * spam"; the mock's `routes/newsletter.js`). A subscriber is created by the
 * public form and removed by an editor; the status is the one thing changed
 * in between. The engine serves the list and the delete; the subscribe, the
 * status `PATCH` and the CSV export are App\Http\Controllers\NewsletterController.
 */
final class Newsletter
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'newsletterSubscribers' => [
                'collection' => 'newsletterSubscribers',
                'basePath' => 'newsletter-subscribers',
                'schema' => 'newsletterSubscriber',
                'routes' => ['adminList', 'remove'],
                'publicPath' => false,
                'slugged' => false,
                'noun' => ['one' => 'subscriber', 'many' => 'subscribers'],
                'adminFilters' => [
                    'status' => ['field' => 'status', 'type' => 'csv'],
                    'source' => ['field' => 'source', 'type' => 'csv'],
                ],
                'sorts' => ['createdAt' => '-createdAt', 'email' => 'email', 'status' => 'status'],
                'defaultSort' => 'createdAt',
            ],
        ];
    }
}
