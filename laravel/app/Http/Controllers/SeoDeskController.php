<?php

namespace App\Http\Controllers;

use App\Domain\Seo\SeoOverview;
use App\Domain\Seo\SitemapBuilder;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The SEO desk (05_BUSINESS_RULES.md → "SEO overview"; 06_SEO_SITEMAP_ROBOTS.md → "llms.txt").
 *
 *   GET /admin/seo/overview       one row per optimisable entity (SeoOverviewRowList)
 *   GET /admin/seo/llms-preview   the generated llms.txt, unsaved (LlmsPreview)
 */
class SeoDeskController extends Controller
{
    /**
     * The collections the preview reads — the mock's `LLMS_SOURCES`, which
     * leave out `segments`: a type in an editor-made segment is previewed
     * under `/buy`, whatever its kind (the served llms.txt reads them).
     */
    private const LLMS_SOURCES = ['properties', 'localities', 'propertyTypes', 'articles'];

    public function overview(Request $request): JsonResponse
    {
        [$rows, $meta] = ApiLog::measure('seo overview', fn () => (new SeoOverview($this->store))->page($this->query($request)));

        return Envelope::list($rows, $meta);
    }

    /**
     * What "regenerate from data" would write, shown beside the stored
     * document so an editor can see it before accepting it.
     */
    public function llmsPreview(): JsonResponse
    {
        $data = [];
        foreach (self::LLMS_SOURCES as $collection) {
            $data[$collection] = $this->store->all($collection);
        }
        $data['seoSettings'] = $this->store->singleton('seoSettings') ?? [];
        $data['siteSettings'] = $this->store->singleton('siteSettings') ?? [];

        return Envelope::ok(['llmsTxt' => SitemapBuilder::generateLlms($data)]);
    }
}
