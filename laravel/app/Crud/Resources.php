<?php

namespace App\Crud;

use App\Crud\Definitions\Articles;
use App\Crud\Definitions\HeaderMenus;
use App\Crud\Definitions\Jobs;
use App\Crud\Definitions\MasterData;
use App\Crud\Definitions\Media;
use App\Crud\Definitions\Newsletter;
use App\Crud\Definitions\Pages;
use App\Crud\Definitions\Redirects;
use App\Store\DocumentStore;
use InvalidArgumentException;

/**
 * Every resource the CRUD engine serves, by key.
 *
 * Each provider in PROVIDERS is a class whose static `definitions()` answers
 * `key → App\Crud\CrudResource options`: the master data, and the modules
 * that build on the engine (articles, pages, jobs…) with the hooks that make
 * them their own.
 *
 * Bound as a scoped singleton, so a request builds each resource once, over
 * the request's document store.
 */
final class Resources
{
    /** @var array<int, class-string> */
    public const PROVIDERS = [
        MasterData::class,
        Articles::class,
        Pages::class,
        HeaderMenus::class,
        Jobs::class,
        Media::class,
        Newsletter::class,
        Redirects::class,
    ];

    /** @var array<string, array>|null */
    private static ?array $definitions = null;

    /** @var array<string, CrudResource> */
    private array $built = [];

    public function __construct(private DocumentStore $store) {}

    /** Every registered key. */
    public static function keys(): array
    {
        return array_keys(self::definitions());
    }

    /** A resource's options without building it (the routes read them). */
    public static function options(string $key): array
    {
        return self::definitions()[$key] ?? throw new InvalidArgumentException("Unknown resource [{$key}].");
    }

    public function get(string $key): CrudResource
    {
        return $this->built[$key] ??= new CrudResource(self::options($key), $this->store);
    }

    /** @return array<string, array> */
    private static function definitions(): array
    {
        if (self::$definitions === null) {
            self::$definitions = [];
            foreach (self::PROVIDERS as $provider) {
                self::$definitions = [...self::$definitions, ...$provider::definitions()];
            }
        }

        return self::$definitions;
    }
}
