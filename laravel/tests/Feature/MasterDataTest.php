<?php

namespace Tests\Feature;

use Tests\TestCase;

/** The CRUD engine, on the master data (01_API_CONTRACT.md §5.6–§5.9, 05_BUSINESS_RULES.md). */
class MasterDataTest extends TestCase
{
    public function test_a_public_list_carries_meta_and_only_active_records(): void
    {
        $response = $this->getJson('/api/localities?perPage=5');

        $response->assertOk()
            ->assertJsonPath('meta.page', 1)
            ->assertJsonPath('meta.perPage', 5)
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'city', 'propertyCount']], 'meta' => ['total', 'totalPages']]);
        foreach ($response->json('data') as $locality) {
            $this->assertTrue($locality['isActive']);
            $this->assertArrayNotHasKey('createdBy', $locality);
        }
    }

    public function test_perpage_all_is_for_the_admin_only(): void
    {
        $this->as('admin', 'GET', '/api/admin/amenities?perPage=all')
            ->assertOk()
            ->assertJsonPath('meta.page', 1)
            ->assertJsonPath('meta.totalPages', 1);
        $this->getJson('/api/amenities?perPage=all')->assertJsonPath('meta.perPage', 12);
    }

    public function test_create_trims_derives_the_slug_and_settles_the_order(): void
    {
        $this->as('admin', 'POST', '/api/admin/localities', ['name' => '  Test Nagar  ', 'cityId' => 1, 'order' => 1])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Test Nagar')
            ->assertJsonPath('data.slug', 'test-nagar')
            ->assertJsonPath('data.seo.slug', 'test-nagar')
            ->assertJsonPath('data.order', 1)
            ->assertJsonPath('data.updatedByName', fn ($name) => is_string($name));

        $orders = collect($this->as('admin', 'GET', '/api/admin/localities?perPage=all&sort=order')->json('data'))->pluck('order');
        $this->assertSame(range(1, $orders->count()), $orders->all());
    }

    public function test_an_explicit_duplicate_slug_is_409(): void
    {
        $this->as('admin', 'POST', '/api/admin/localities', ['name' => 'Another', 'cityId' => 1, 'slug' => 'whitefield'])
            ->assertStatus(409)
            ->assertJsonPath('errors.slug.0', 'The slug has already been taken.');
    }

    public function test_a_patch_keeps_what_it_does_not_mention(): void
    {
        $before = $this->as('admin', 'GET', '/api/admin/developers/1')->json('data');
        $patched = $this->as('admin', 'PATCH', '/api/admin/developers/1', ['isFeatured' => ! $before['isFeatured']])->json('data');

        $this->assertSame($before['name'], $patched['name']);
        $this->assertSame($before['slug'], $patched['slug']);
        $this->assertSame(! $before['isFeatured'], $patched['isFeatured']);
    }

    public function test_a_stale_replace_is_refused_and_names_the_saver(): void
    {
        $opened = $this->as('admin', 'GET', '/api/admin/localities/2')->json('data');
        $this->travel(2)->seconds();
        $this->as('admin', 'PUT', '/api/admin/localities/2', [...$opened, 'shortDescription' => 'First save.'])->assertOk();
        $this->as('admin', 'PUT', '/api/admin/localities/2', [...$opened, 'shortDescription' => 'Older copy.'])
            ->assertStatus(409)
            ->assertJsonPath('data.conflict', 'stale')
            ->assertJsonPath('data.current.updatedByName', fn ($name) => is_string($name));
    }

    public function test_a_record_in_use_cannot_be_deleted(): void
    {
        $this->as('admin', 'DELETE', '/api/admin/localities/1')
            ->assertStatus(409)
            ->assertJsonPath('message', 'This item is in use.')
            ->assertJsonPath('data.usedBy.0.type', 'property');
    }

    public function test_a_bulk_action_on_nothing_affects_nothing(): void
    {
        $this->as('admin', 'POST', '/api/admin/badges/bulk', ['ids' => [999999], 'action' => 'delete'])
            ->assertOk()
            ->assertJsonPath('data.affected', 0);
        $this->as('admin', 'POST', '/api/admin/badges/bulk', ['ids' => [999999], 'action' => 'frobnicate'])
            ->assertStatus(422)
            ->assertJsonPath('errors.action.0', 'The selected action is invalid.');
    }

    public function test_check_slug_suggests_a_free_variant(): void
    {
        $this->as('admin', 'GET', '/api/admin/localities/check-slug?slug=Whitefield')
            ->assertOk()
            ->assertExactJson(['data' => ['available' => false, 'suggestion' => 'whitefield-2']]);
    }
}
