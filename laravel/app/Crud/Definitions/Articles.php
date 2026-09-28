<?php

namespace App\Crud\Definitions;

/**
 * The Articles resource(s) of the CRUD engine — see App\Crud\CrudResource for
 * the options, and App\Crud\Definitions\MasterData for worked examples.
 */
final class Articles
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [];
    }
}
