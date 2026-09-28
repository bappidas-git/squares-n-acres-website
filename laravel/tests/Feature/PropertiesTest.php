<?php

namespace Tests\Feature;

use App\Domain\Tokens\FileAccess;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Listings (05_BUSINESS_RULES.md → "Property search", "Category counts",
 * "Property writes", "View counting", "Gated files", "Bulk actions",
 * "Duplicating a property").
 */
class PropertiesTest extends TestCase
{
    /** The smallest body a create takes (the smoke test's fixture); the empty objects are objects. */
    private static function draft(array $overrides = []): array
    {
        return [
            'title' => 'A listing written for the tests',
            'listingType' => 'sale',
            'segment' => 'residential',
            'propertyTypeId' => 1,
            'constructionStatus' => 'ready-to-move',
            'availability' => 'available',
            'location' => ['localityId' => 1, 'cityId' => 1],
            'pricing' => (object) [],
            'area' => (object) [],
            'configuration' => (object) [],
            'project' => (object) [],
            ...$overrides,
        ];
    }

    public function test_bedrooms_match_the_listing_or_an_active_unit_and_the_facets_come_along(): void
    {
        $response = $this->getJson('/api/properties?bedrooms=3&perPage=50')->assertOk();

        $this->assertNotEmpty($response->json('data'));
        foreach ($response->json('data') as $row) {
            $units = array_column(array_filter($row['unitConfigurations'], fn ($unit) => $unit['isActive'] !== false), 'bedrooms');
            $this->assertTrue($row['configuration']['bedrooms'] === 3 || in_array(3, $units, true), "#{$row['id']} has no 3 BHK");
        }
        $this->assertSame(
            ['propertyType', 'locality', 'bedrooms', 'constructionStatus'],
            array_keys($response->json('meta.facets')),
        );
    }

    public function test_the_counts_add_up_to_the_list_and_follow_its_filters(): void
    {
        $counts = $this->getJson('/api/properties/counts?by=bogus,segment')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=300, public')
            ->assertJsonPath('meta', null);
        $this->assertSame(['segment'], array_keys($counts->json('data')));
        $total = $this->getJson('/api/properties?perPage=1')->json('meta.total');
        $this->assertSame($total, array_sum($counts->json('data.segment')));

        $rentals = $this->getJson('/api/properties/counts?by=propertyTypeId&listingType=rent')->json('data.propertyTypeId');
        $this->assertSame($this->getJson('/api/properties?perPage=1&listingType=rent')->json('meta.total'), array_sum($rentals));
        // No dimension named: an empty object, never a list.
        $this->assertSame('{"data":{},"meta":null}', $this->getJson('/api/properties/counts')->getContent());
    }

    public function test_a_listing_goes_live_only_with_what_the_publish_rules_ask_for(): void
    {
        $draft = $this->as('admin', 'POST', '/api/admin/properties', self::draft())->assertCreated()->json('data');
        $this->assertFalse($draft['isActive']);
        $this->assertSame('a-listing-written-for-the-tests', $draft['slug']);

        $refused = $this->as('admin', 'PATCH', "/api/admin/properties/{$draft['id']}", ['isActive' => true])
            ->assertStatus(422)
            ->assertJsonPath('message', '“A listing written for the tests” is not ready to go live: no photograph with a description, 0 of 300 characters of description, no one-line summary, no price.')
            ->assertJsonPath('data.notReady.0.id', $draft['id']);
        $this->assertSame(['images', 'description', 'shortDescription', 'pricing.price'], array_keys($refused->json('errors')));

        // A star on a listing is not a publish, and is not asked.
        $this->as('admin', 'PATCH', "/api/admin/properties/{$draft['id']}", ['isFeatured' => true])->assertOk();

        $live = $this->as('admin', 'PATCH', "/api/admin/properties/{$draft['id']}", [
            'isActive' => true,
            'images' => [['url' => 'https://example.com/a.png', 'alt' => 'The street side'], ['url' => 'https://example.com/b.png', 'alt' => 'The hall']],
            'description' => '<p>'.str_repeat('A description long enough to publish. ', 10).'</p>',
            'shortDescription' => 'Ready to move in.',
            'pricing' => ['price' => 12500000],
        ])->assertOk()->json('data');
        $this->assertNotNull($live['publishedAt']);
        $this->assertSame([1, 2], array_column($live['images'], 'id'));
        $this->assertSame([true, false], array_column($live['images'], 'isCover'));
    }

    public function test_patch_keeps_what_it_does_not_mention_and_put_fills_the_defaults(): void
    {
        $id = $this->as('admin', 'POST', '/api/admin/properties', self::draft())->json('data.id');

        $this->as('admin', 'PATCH', "/api/admin/properties/{$id}", ['isFeatured' => true])
            ->assertJsonPath('data.title', self::draft()['title'])
            ->assertJsonPath('data.isFeatured', true);
        $this->as('admin', 'PUT', "/api/admin/properties/{$id}", self::draft(['title' => 'A replaced listing title']))
            ->assertOk()
            ->assertJsonPath('data.isFeatured', false)
            ->assertJsonPath('data.slug', 'a-replaced-listing-title')
            ->assertJsonPath('data.updatedByName', 'Admin User');
        $this->as('admin', 'PUT', "/api/admin/properties/{$id}", self::draft(['updatedAt' => '2020-01-01T00:00:00.000Z']))
            ->assertStatus(409)
            ->assertJsonPath('message', 'Admin User saved this listing after you opened it.')
            ->assertJsonPath('data.conflict', 'stale');
    }

    public function test_an_inactive_listing_is_404_unless_a_share_link_opens_it(): void
    {
        $slug = 'prakriti-solstice-3-bhk-hsr-layout';
        $this->getJson("/api/properties/slug/{$slug}")->assertNotFound();
        $this->as('sales', 'GET', "/api/admin/properties/slug/{$slug}")->assertOk()->assertJsonPath('data.isActive', false);

        $share = $this->as('manager', 'POST', '/api/admin/properties/12/preview-token')->assertOk()->json('data');
        $this->assertStringEndsWith("/properties/{$slug}?preview={$share['token']}", $share['url']);
        $this->getJson("/api/properties/slug/{$slug}?previewToken={$share['token']}")
            ->assertOk()
            ->assertJsonMissingPath('data.createdBy');
        $this->getJson('/api/properties/slug/lakeview-heights-3-bhk-whitefield?previewToken=nope')->assertOk();
        $this->getJson('/api/properties/12/similar')->assertNotFound();
    }

    public function test_a_duplicate_is_a_draft_and_a_deleted_listing_gives_its_slug_up(): void
    {
        $copy = $this->as('admin', 'POST', '/api/admin/properties/1/duplicate')
            ->assertCreated()
            ->assertJsonPath('data.isActive', false)
            ->assertJsonPath('data.viewCount', 0)
            ->assertJsonPath('data.seo.scoreBand', 'none')
            ->json('data');
        $this->assertSame('lakeview-heights-3-bhk-whitefield-copy', $copy['slug']);
        $this->assertStringEndsWith(' (Copy)', $copy['title']);

        $this->as('admin', 'DELETE', "/api/admin/properties/{$copy['id']}")->assertOk()->assertJsonPath('message', 'Deleted');
        $this->as('admin', 'POST', '/api/admin/properties/1/duplicate')
            ->assertCreated()
            ->assertJsonPath('data.slug', 'lakeview-heights-3-bhk-whitefield-copy');
    }

    public function test_the_bulk_payload_actions_validate_the_whole_batch_first(): void
    {
        $bulk = fn (string $action, mixed $payload, array $ids = [5]) => $this->as('admin', 'POST', '/api/admin/properties/bulk', ['ids' => $ids, 'action' => $action, 'payload' => $payload]);

        $bulk('availability', ['availability' => 'sold'])->assertOk()->assertJsonPath('data.affected', 1)->assertJsonPath('message', '1 property updated.');
        $bulk('availability', ['availability' => 'sold'])->assertJsonPath('data.affected', 0);
        $this->assertSame(
            ['payload.agentId' => ['The selected payload.agentId is invalid.']],
            $bulk('assignAgent', ['agentId' => 999999])->assertStatus(422)->json('errors'),
        );
        $this->assertSame(
            ['payload.propertyTypeId' => ['Office Spaces is a commercial type, and 2 of the selected listings are not — change those in the form.']],
            $bulk('setPropertyType', ['propertyTypeId' => 11], [5, 6])->assertStatus(422)->json('errors'),
        );
        $bulk('activate', null, [999999])->assertOk()->assertJsonPath('data.affected', 0);
        $bulk('publish', null)->assertStatus(422)->assertJsonPath('errors.action.0', 'The selected action is invalid.');
    }

    public function test_a_view_counts_once_an_hour_per_visitor(): void
    {
        $before = $this->as('admin', 'GET', '/api/admin/properties/1')->json('data.viewCount');

        $this->postJson('/api/properties/1/view', ['referrer' => 'https://example.com/'])->assertOk()->assertJsonPath('data.viewCount', $before + 1);
        $this->postJson('/api/properties/1/view', [])->assertOk()->assertJsonPath('data.viewCount', $before + 1);
        $this->assertSame(1, DB::table('property_views')->where('property_id', 1)->where('referrer', 'https://example.com/')->count());
        $this->postJson('/api/properties/12/view', [])->assertNotFound();
    }

    public function test_the_gated_files_open_for_a_lead_token_only(): void
    {
        $this->postJson('/api/properties/1/documents/access', [])->assertStatus(422);
        $this->postJson('/api/properties/1/documents/access', ['token' => 'nope'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Share your details to open the files of this listing.');
        $this->postJson('/api/properties/12/documents/access', ['token' => 'nope'])->assertNotFound();

        $public = $this->getJson('/api/properties/slug/lakeview-heights-3-bhk-whitefield')->json('data');
        $this->assertNull($public['floorPlans'][0]['imageUrl']);

        $lead = DB::table('leads')->value('id');
        $files = $this->postJson('/api/properties/1/documents/access', ['token' => FileAccess::issue(1, $lead)['token']])
            ->assertOk()
            ->json('data');
        $this->assertSame(['brochureUrl', 'documents', 'floorPlans', 'unitConfigurations'], array_keys($files));
        $this->assertNotNull($files['floorPlans'][0]['imageUrl']);
    }

    public function test_an_id_that_names_no_record_is_refused_rather_than_stored(): void
    {
        $errors = $this->as('admin', 'POST', '/api/admin/properties', self::draft(['propertyTypeId' => 999, 'amenityIds' => [1, 999]]))
            ->assertStatus(422)
            ->json('errors');

        $this->assertSame([
            'propertyTypeId' => ['The selected propertyTypeId is invalid.'],
            'amenityIds.1' => ['The selected amenityIds.1 is invalid.'],
        ], $errors);
    }
}
