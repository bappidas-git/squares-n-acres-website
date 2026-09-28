<?php

namespace App\Crud\Definitions;

use App\Crud\Usage;
use App\Domain\Media\MediaBody;
use App\Domain\Media\MediaFolders;
use App\Domain\Media\MediaUsage;
use App\Support\Query\Filters;

/**
 * The media library (05_BUSINESS_RULES.md → "Media library"; 09_MEDIA_AND_EMAIL.md).
 *
 *   GET    /admin/media          `type`, `provider`, `folder`, `unfiled`, `usage`, `q`
 *                                (alt, title, folder, public id, address, tags);
 *                                `meta.folders` [{ name, count }] and `meta.unfiled`
 *   POST   /admin/media          a metadata record — no binary crosses here; the
 *                                address is unique in the library
 *   GET    /admin/media/{id}     with `usedIn`
 *   PUT, PATCH, DELETE, bulk     `delete` (all or nothing) and `move` with `payload.folder`
 *
 * There is no public endpoint: the library is an editor's tool. Folder
 * renames are App\Http\Controllers\MediaFolderController.
 */
final class Media
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'media' => [
                'collection' => 'media',
                'basePath' => 'media',
                'schema' => 'media',
                'publicPath' => false,
                'slugged' => false,
                // Laravel's TrimStrings: alt, title, folder and each tag, as the forms trim them.
                'trimStrings' => true,
                'beforeValidate' => fn (array $body, array $ctx) => MediaBody::prepare($body, $ctx['method'] ?? 'POST'),
                'beforeDelete' => MediaUsage::guardDelete(...),
                'beforeBulk' => MediaUsage::guardBulkDelete(...),
                // A single read says where its file is used; a list only when asked, and only
                // for the page it answers — nothing filters or sorts on it (QA-63).
                'afterRead' => fn (array $record, array $ctx) => ($ctx['list'] ?? false)
                    ? $record
                    : [...$record, 'usedIn' => MediaUsage::of($ctx['store'], $record['url'] ?? null)],
                'decoratePage' => function (array $records, array $ctx) {
                    if (Filters::bool($ctx['query']->get('withUsage')) !== true) {
                        return $records;
                    }
                    $usagesOf = (new Usage($ctx['store']))->mediaIndex();

                    return array_map(fn (array $record) => [...$record, 'usedIn' => $usagesOf($record['url'] ?? null)], $records);
                },
                // Each folder with what it holds, and the files in none, over the rows every
                // other filter lets through: the rail's "properties (284)" and "No folder (3)".
                'listMeta' => function (array $ctx) {
                    $rows = ($ctx['facet'])(['folder', 'unfiled']);

                    return [
                        'folders' => MediaFolders::counts($rows),
                        'unfiled' => count(array_filter($rows, fn (array $row) => ! is_string($row['folder'] ?? null) || $row['folder'] === '')),
                    ];
                },
                'adminFilters' => [
                    'type' => ['field' => 'type', 'type' => 'csv'],
                    'provider' => ['field' => 'provider', 'type' => 'csv'],
                    'folder' => ['field' => 'folder'],
                    'unfiled' => MediaFolders::unfiledFilter(...),
                    'usage' => MediaUsage::unusedFilter(...),
                ],
                'bulkActions' => ['move' => fn (mixed $payload) => MediaFolders::moveChanges($payload)],
                'sorts' => ['createdAt' => '-createdAt', 'bytes' => '-bytes', 'alt' => 'alt'],
                'defaultSort' => 'createdAt',
                'noun' => ['one' => 'file', 'many' => 'files'],
            ],
        ];
    }
}
