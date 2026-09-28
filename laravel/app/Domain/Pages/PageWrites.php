<?php

namespace App\Domain\Pages;

use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Text\Slug;
use stdClass;

/**
 * What a page write must be before it is stored (05_BUSINESS_RULES.md →
 * "Pages"; `mock-server/routes/pages.js`).
 *
 * A page is a list of blocks, and the API owes the editor two things about
 * that list: every block gets an id the moment it is saved, and `order` is
 * renumbered `1…n`, so a drag-and-drop that leaves gaps or ties round-trips
 * exactly. Everything here runs before the schema's 422 pass, in the mock's
 * order: blocks, scripts, the protected-page rules, the reserved prefixes.
 */
final class PageWrites
{
    /** Block types whose `data.html` is rendered as markup. */
    public const HTML_BLOCKS = ['richText', 'html'];

    /** `POST /admin/pages/bulk`; `delete` comes with every resource. */
    public const BULK_ACTIONS = [
        'publish' => ['status' => 'published'],
        'unpublish' => ['status' => 'draft'],
    ];

    /** The CRUD engine's `beforeValidate`: every pass below, in order. */
    public static function prepare(array $body, array $ctx): array
    {
        return self::rejectReservedSlug(self::enforcePageRules(self::rejectScripts(self::normaliseBlocks($body)), $ctx), $ctx);
    }

    /**
     * Gives every block an id and renumbers `order` as `1…n`. A block that
     * carries an `order` keeps its relative place; one without falls in where
     * the array put it.
     */
    public static function normaliseBlocks(array $body): array
    {
        if (! Js::isList($body['blocks'] ?? null)) {
            return $body;
        }

        // The highest id among the blocks, read as `Number(id)`: an id that is no number counts for nothing.
        $highest = 0;
        foreach ($body['blocks'] as $block) {
            $id = self::isObject($block) ? Js::get($block, 'id') : null;
            $id = is_scalar($id) ? Js::toNumber($id) : null;
            if ($id !== null && is_finite((float) $id) && $id > $highest) {
                $highest = $id;
            }
        }

        $withIds = [];
        foreach ($body['blocks'] as $index => $block) {
            if (! self::isObject($block)) {
                $withIds[] = ['block' => $block, 'index' => $index];

                continue;
            }
            $id = Js::get($block, 'id');
            $order = Js::get($block, 'order');
            $withIds[] = ['block' => [
                ...Js::entries($block),
                'id' => Js::isInteger($id) ? $id : ($highest += 1),
                'order' => Js::isNumber($order) ? $order : $index + 1,
            ], 'index' => $index];
        }

        $position = fn (mixed $block) => self::isObject($block) ? (Js::get($block, 'order') ?? 0) : 0;
        usort($withIds, fn (array $left, array $right) => ($position($left['block']) <=> $position($right['block'])) ?: ($left['index'] <=> $right['index']));

        $body['blocks'] = array_map(
            fn (array $entry, int $index) => self::isObject($entry['block']) ? [...$entry['block'], 'order' => $index + 1] : $entry['block'],
            $withIds,
            array_keys($withIds),
        );

        return $body;
    }

    /**
     * Refuses a rich-text or HTML block that carries a script tag, keyed by
     * the block's index. Sanitising is the editor's job; a payload with a
     * `<script` never reached a browser, so this is the second line of defence.
     */
    public static function rejectScripts(array $body): array
    {
        if (! Js::isList($body['blocks'] ?? null)) {
            return $body;
        }
        $errors = [];
        foreach ($body['blocks'] as $index => $block) {
            if (! in_array(Js::get($block, 'type'), self::HTML_BLOCKS, true)) {
                continue;
            }
            $html = Js::get(Js::get($block, 'data'), 'html');
            if (is_string($html) && preg_match('~<script\b~i', $html)) {
                $errors["blocks.{$index}.data.html"] = 'Script tags are not allowed in page content.';
            }
        }
        self::refuse($errors, 'Refused a script in page content');

        return $body;
    }

    /**
     * The rules of the protected and the built-in pages, and the check that a
     * submenu belongs to the menu a page names:
     *
     *  - `system` is the template of the pages that come with the site: no
     *    page is created with it, none is moved into or out of it;
     *  - a protected page keeps its address — an empty slug on a PUT, which
     *    would otherwise be derived afresh from the title, keeps it too;
     *  - a built-in page is never a draft and carries no blocks;
     *  - the home page is never redirected: its address is `/`;
     *  - `headerSubmenu` names one of the submenus of `headerMenu`, and goes
     *    when the page leaves its menu.
     */
    public static function enforcePageRules(array $body, array $ctx): array
    {
        $existing = $ctx['existing'] ?? null;
        $method = $ctx['method'] ?? null;
        $errors = [];
        $mentions = fn (string $field) => array_key_exists($field, $body);

        if ($existing === null) {
            if (($body['template'] ?? null) === PageRules::SYSTEM_TEMPLATE) {
                $errors['template'] = '“Built-in” is kept for the pages that come with the site.';
            }
        } else {
            $system = PageRules::isSystemPage($existing);
            if ($mentions('template') && (($body['template'] ?? null) === PageRules::SYSTEM_TEMPLATE) !== $system) {
                $errors['template'] = $system
                    ? 'A built-in page keeps its template: the site generates it.'
                    : '“Built-in” is kept for the pages that come with the site.';
            }

            $refusal = PageRules::slugRefusal($existing);
            if ($refusal !== null) {
                $sent = is_string($body['slug'] ?? null) ? Js::trim($body['slug']) : '';
                if ($sent !== '' && Slug::makePath($sent) !== $existing['slug']) {
                    $errors['slug'] = $refusal;
                } elseif ($method !== 'PATCH' || $mentions('slug')) {
                    $body['slug'] = $existing['slug'];
                }
            }

            if (PageRules::isHomePage($existing) && Js::get(Js::get($body['seo'] ?? null, 'redirect'), 'enabled') === true) {
                $errors['seo.redirect.enabled'] = PageRules::homeRedirectRefusal();
            }

            if ($system) {
                if ($mentions('status') && $body['status'] !== 'published') {
                    $errors['status'] = PageRules::unpublishRefusal($existing);
                }
                if (Js::isList($body['blocks'] ?? null) && $body['blocks'] !== []) {
                    $errors['blocks'] = 'A built-in page has no blocks: the site generates its content.';
                }
            }
        }

        // The submenu belongs to the menu the page will be in once this write lands.
        $menuSlug = $mentions('headerMenu') ? $body['headerMenu'] : ($existing['headerMenu'] ?? null);
        if ($mentions('headerMenu') && in_array($body['headerMenu'], [null, false, '', 0], true)) {
            $body['headerSubmenu'] = null;
        }
        $submenu = $mentions('headerSubmenu') ? $body['headerSubmenu'] : null;
        if (is_string($submenu) && $submenu !== '') {
            $known = false;
            foreach ($ctx['store']->all('headerMenus') as $menu) {
                if (($menu['slug'] ?? null) === $menuSlug) {
                    foreach ((array) ($menu['submenus'] ?? []) as $entry) {
                        $known = $known || Js::get($entry, 'slug') === $submenu;
                    }
                    break;
                }
            }
            if (! $known) {
                $errors['headerSubmenu'] = 'The selected headerSubmenu is invalid.';
            }
        } elseif ($submenu === '') {
            $body['headerSubmenu'] = null;
        }

        self::refuse($errors, 'Refused a write the page rules do not allow');

        return $body;
    }

    /**
     * Refuses a slug whose first segment belongs to a static route of the
     * site: a page saved under one would exist and never be reachable (D11).
     * The slug judged is the one the write will be stored under — the one
     * sent, or the one the title makes when it is empty; a PATCH that never
     * mentions it keeps the old one. A page already living under a reserved
     * prefix (the seeded awareness guide) keeps its slug.
     */
    public static function rejectReservedSlug(array $body, array $ctx): array
    {
        $existing = $ctx['existing'] ?? null;
        $sent = is_string($body['slug'] ?? null) ? Js::trim($body['slug']) : '';

        if ($sent !== '') {
            $effective = Slug::makePath($sent);
        } elseif (($ctx['method'] ?? null) === 'PATCH' && ! array_key_exists('slug', $body)) {
            $effective = Js::string($existing['slug'] ?? '');
        } else {
            $effective = Slug::makePath(Js::string($body['title'] ?? $existing['title'] ?? ''));
        }

        if ($effective === '' || $effective === ($existing['slug'] ?? null) || ! SitePaths::isReservedPath($effective)) {
            return $body;
        }

        $prefix = explode('/', $effective)[0];
        ApiLog::info('pages', "Refused the reserved path {$effective}");

        throw ApiException::validation(['slug' => "Reserved path — “{$prefix}” belongs to the site’s own pages."]);
    }

    /**
     * A bulk action that cannot apply to every selected page is refused
     * whole, naming the pages in the way: a built-in page is never
     * unpublished (422), a protected page is never deleted (409).
     */
    public static function refuseProtected(string $action, array $targets): void
    {
        $reasonOf = match ($action) {
            'delete' => [PageRules::class, 'deleteRefusal'],
            'unpublish' => [PageRules::class, 'unpublishRefusal'],
            default => null,
        };
        if ($reasonOf === null) {
            return;
        }

        $refused = [];
        foreach ($targets as $page) {
            $reason = $reasonOf($page);
            if ($reason !== null) {
                $refused[] = ['page' => $page, 'reason' => $reason];
            }
        }
        if ($refused === []) {
            return;
        }

        $verb = $action === 'delete' ? 'deleted' : 'unpublished';
        $message = count($refused) === 1
            ? $refused[0]['reason']
            : count($refused)." of the selected pages cannot be {$verb}: "
                .implode(', ', array_map(fn (array $entry) => '“'.Js::string($entry['page']['title'] ?? null).'”', $refused)).'.';
        ApiLog::info('pages', "Bulk {$action} refused", ['ids' => array_map(fn (array $entry) => $entry['page']['id'], $refused)]);

        throw new ApiException(
            $action === 'delete' ? 409 : 422,
            $message,
            ['ids' => array_column($refused, 'reason')],
            [
                'refused' => array_map(fn (array $entry) => [
                    'id' => $entry['page']['id'],
                    'title' => $entry['page']['title'] ?? null,
                    'reason' => $entry['reason'],
                ], $refused),
                ...($action === 'delete' ? ['usedBy' => []] : []),
            ],
        );
    }

    /** A JSON object — or an array, which JavaScript spreads like one. */
    private static function isObject(mixed $value): bool
    {
        return is_array($value) || $value instanceof stdClass;
    }

    /** @param  array<string, string>  $errors */
    private static function refuse(array $errors, string $log): void
    {
        if ($errors === []) {
            return;
        }
        ApiLog::info('pages', $log, ['errors' => $errors]);

        throw ApiException::validation($errors);
    }
}
