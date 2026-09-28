<?php

namespace App\Http\Controllers;

use App\Contract\Contract;
use App\Domain\Properties\PropertyCounts;
use App\Domain\Properties\PropertyFilters;
use App\Domain\Properties\PropertyReads;
use App\Domain\Properties\PropertyScope;
use App\Domain\Properties\PropertyWriter;
use App\Domain\Properties\ViewCounter;
use App\Domain\Tokens\FileAccess;
use App\Domain\Tokens\PreviewTokens;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Query\Paginator;
use App\Support\Validation\SchemaValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The public listings (01_API_CONTRACT.md §5.7, §5.10; 05_BUSINESS_RULES.md →
 * "Property search", "Category counts", "Similar properties", "View
 * counting", "Gated files"):
 *
 *   GET  /properties                         search, facets, every §5.7 filter
 *   GET  /properties/counts                  live listings per value of `by`
 *   GET  /properties/featured                `isFeatured`, by relevance
 *   GET  /properties/suggestions             the header's type-ahead
 *   GET  /properties/slug/{slug}             the detail page (404 when inactive,
 *                                            unless `?previewToken=` opens it)
 *   GET  /properties/{id}/similar            the editor's picks, then the fill rule
 *   POST /properties/{id}/view               one counted view per IP per hour
 *   POST /properties/{id}/documents/access   the gated files, for a lead's token
 *
 * Only active listings are public; an inactive or unknown one is the same 404.
 */
class PropertyController extends Controller
{
    public function __construct(DocumentStore $store, private PropertyReads $reads, private PropertyWriter $writer)
    {
        parent::__construct($store);
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        [$rows, $meta] = $this->reads->listPage(PropertyFilters::apply($this->reads->active(), $query, $this->store), $query, false);

        return Envelope::list($rows, $meta);
    }

    /**
     * The home page's tiles in two requests. The answer is the same for every
     * visitor, so shared caches may keep it five minutes.
     */
    public function counts(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $items = PropertyFilters::apply($this->reads->active(), PropertyCounts::filtersOf($query), $this->store);

        return Envelope::ok(
            PropertyCounts::countBy($items, PropertyCounts::dimensionsOf($query)),
            null,
            200,
            ['Cache-Control' => 'public, max-age=300'],
        );
    }

    /** The featured listings, under the §5.7 filters, by relevance — never unfiltered. */
    public function featured(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $featured = array_filter($this->reads->active(), fn (array $property) => (bool) ($property['isFeatured'] ?? false));
        $sorted = PropertyFilters::sort(PropertyFilters::apply($featured, $query, $this->store), 'relevance');
        [$page, $meta] = Paginator::paginate($sorted, $query->first('page'), Paginator::pageSize($query, false));

        return Envelope::list(array_map(fn (array $property) => $this->reads->present($property, false), $page), $meta);
    }

    public function suggestions(Request $request): JsonResponse
    {
        return Envelope::ok($this->reads->suggestions($this->query($request)->first('q') ?? ''));
    }

    /**
     * A share link opens an inactive listing for 24 hours: the token is bound
     * to that one listing, and the page is still 404 without it.
     */
    public function showBySlug(Request $request, string $slug): JsonResponse
    {
        $token = $this->query($request)->first('previewToken');
        foreach ($this->reads->rows() as $property) {
            if (($property['slug'] ?? null) === $slug
                && (($property['isActive'] ?? null) === true || PreviewTokens::verify($token, 'property', $property['id']))) {
                return Envelope::ok($this->reads->present($property, false));
            }
        }

        throw ApiException::notFound();
    }

    public function similar(string $id): JsonResponse
    {
        $property = $this->liveListing($id);
        $similar = $this->reads->similar($property);

        return Envelope::list(
            array_map(fn (array $row) => $this->reads->present($row, false), $similar),
            Paginator::meta(count($similar)),
        );
    }

    public function view(Request $request, string $id): JsonResponse
    {
        $property = $this->liveListing($id);
        if (! ViewCounter::count((string) $request->ip(), $property['id'])) {
            ApiLog::debug('properties', "View of #{$property['id']} inside the hour — not counted");

            return Envelope::ok(['viewCount' => $property['viewCount'] ?? 0]);
        }

        return Envelope::ok(['viewCount' => $this->writer->recordView($property, $this->body($request)['referrer'] ?? null)]);
    }

    /**
     * The addresses of a listing's files, for the visitor who shared their
     * details about it: the token `POST /leads` issued with a lead about this
     * listing, still valid, and the lead it was issued for still there.
     */
    public function documentAccess(Request $request, string $id): JsonResponse
    {
        $property = $this->liveListing($id);
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('property.documentAccess'), $body);

        $grant = FileAccess::verify($body['token'], $property['id']);
        if ($grant === null || $this->store->find('leads', $grant['leadId']) === null) {
            ApiLog::info('properties', "Files of #{$property['id']} refused: the token opens nothing");

            throw ApiException::forbidden('Share your details to open the files of this listing.');
        }
        ApiLog::info('properties', "Files of #{$property['id']} handed to lead #{$grant['leadId']}");

        return Envelope::ok(PropertyScope::files($property));
    }

    /** A listing a public route may act on: it exists and it is live. */
    private function liveListing(string $id): array
    {
        $property = $this->store->find('properties', $id);
        if ($property === null || ! ($property['isActive'] ?? false)) {
            throw ApiException::notFound();
        }

        return $property;
    }
}
