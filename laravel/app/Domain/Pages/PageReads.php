<?php

namespace App\Domain\Pages;

use App\Contract\Contract;
use App\Domain\Tokens\PreviewTokens;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\QueryParams;

/**
 * The page reads (01_API_CONTRACT.md §5.14; 05_BUSINESS_RULES.md → "Pages",
 * "Preview tokens").
 *
 * The header and the footer are built from data: an editor decides where a
 * page appears by ticking `showInHeader` and picking a menu, and no menu is
 * spelled out in the frontend. The navigation list answers the six fields a
 * link needs and nothing else — a menu is not a reason to download fifteen
 * pages of blocks.
 */
final class PageReads
{
    public function __construct(private DocumentStore $store) {}

    /** The six fields a navigation link is built from. */
    public static function navShape(array $page): array
    {
        return [
            'slug' => $page['slug'] ?? null,
            'title' => $page['title'] ?? null,
            'headerMenu' => $page['headerMenu'] ?? null,
            'headerSubmenu' => $page['headerSubmenu'] ?? null,
            'footerColumn' => $page['footerColumn'] ?? null,
            'order' => Js::isNumber($page['order'] ?? null) ? $page['order'] : 0,
        ];
    }

    /**
     * `GET /pages?showInHeader=&showInFooter=`: the published pages in
     * navigation order. Unpaginated unless `page`/`perPage` ask — a menu is
     * a whole menu or it is wrong.
     *
     * @return array{0: array, 1: array} rows and meta
     */
    public function navigation(QueryParams $query): array
    {
        $header = Filters::bool($query->first('showInHeader'));
        $footer = Filters::bool($query->first('showInFooter'));
        $pages = array_filter($this->store->all('pages'), fn (array $page) => ($page['status'] ?? null) === 'published'
            && ($header === null || (bool) ($page['showInHeader'] ?? false) === $header)
            && ($footer === null || (bool) ($page['showInFooter'] ?? false) === $footer));

        [$rows, $meta] = Paginator::paginate(
            NavOrder::sort($pages, 'title'),
            $query->first('page'),
            Paginator::positiveInt($query->first('perPage'), null),
        );

        return [array_map([self::class, 'navShape'], $rows), $meta];
    }

    /**
     * `GET /pages/slug/:slug` — the slug is a URL path (`buyer-assistance/home-loan`):
     * a published page, or any page with its preview token. A hidden block is
     * the editor's, not the visitor's, and who saved the page is the panel's
     * business.
     */
    public function bySlug(string $slug, ?string $preview): array
    {
        $page = null;
        foreach ($this->store->all('pages') as $row) {
            if (($row['slug'] ?? null) === $slug) {
                $page = $row;
                break;
            }
        }
        if ($page === null) {
            throw ApiException::notFound();
        }

        $previewing = PreviewTokens::verify($preview, 'page', $page['id']);
        if (($page['status'] ?? null) !== 'published' && ! $previewing) {
            throw ApiException::notFound();
        }
        if ($previewing) {
            ApiLog::info('pages', "Page #{$page['id']} opened with its preview token");
        }

        return [
            ...array_diff_key($page, array_flip(Contract::model('pages')['publicOmit'] ?? [])),
            'blocks' => array_values(array_filter(
                Js::isList($page['blocks'] ?? null) ? $page['blocks'] : [],
                fn (mixed $block) => Js::get($block, 'hidden') !== true,
            )),
        ];
    }

    /** One page by its id as the path spells it (`String(id)`), or null. */
    public function find(string $id): ?array
    {
        $page = $this->store->find('pages', $id);

        return $page !== null && Js::string($page['id']) === $id ? $page : null;
    }

    /**
     * `GET /admin/pages/:id/preview-token`: a 24-hour token bound to this page
     * and the link that opens it — the site root for the home record.
     *
     * @return array{token: string, expiresAt: string, url: string}
     */
    public function previewToken(array $page): array
    {
        ['token' => $token, 'expiresAt' => $expiresAt] = PreviewTokens::issue('page', $page['id']);

        return [
            'token' => $token,
            'expiresAt' => $expiresAt,
            'url' => SitePaths::siteUrl($this->store).SitePaths::page($page['slug'] ?? '')."?preview={$token}",
        ];
    }
}
