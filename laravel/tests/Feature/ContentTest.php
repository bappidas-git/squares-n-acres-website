<?php

namespace Tests\Feature;

use Tests\TestCase;

/** Articles, pages and header menus (05_BUSINESS_RULES.md → "Article writes", "Pages", "Header menus"). */
class ContentTest extends TestCase
{
    private const DRAFT = [
        'title' => 'An article written for the content tests',
        'content' => '<p>Too short to publish.</p>',
        'categoryId' => 1,
        'authorId' => 1,
        'status' => 'draft',
    ];

    public function test_the_public_list_answers_live_articles_as_summary_rows(): void
    {
        $rows = $this->getJson('/api/articles?perPage=50')->assertOk()->json('data');

        $this->assertNotContains(11, array_column($rows, 'id'), 'a draft is not public');
        $this->assertSame(
            ['id', 'slug', 'title', 'excerpt', 'featuredImage', 'category', 'tags', 'author', 'publishedAt', 'readingTimeMinutes', 'isFeatured', 'viewCount'],
            array_keys($rows[0]),
        );
    }

    public function test_going_live_needs_an_excerpt_an_image_and_300_words(): void
    {
        $errors = $this->as('admin', 'POST', '/api/admin/articles', [...self::DRAFT, 'status' => 'published'])
            ->assertStatus(422)
            ->json('errors');

        $this->assertSame([
            'excerpt' => ['An excerpt is required before an article goes live.'],
            'featuredImage.url' => ['A featured image is required before an article goes live.'],
            'content' => ['An article needs at least 300 words to go live — this one has 4.'],
        ], $errors);
    }

    public function test_a_scheduled_article_goes_live_when_its_moment_comes(): void
    {
        $article = $this->as('admin', 'POST', '/api/admin/articles', [
            ...self::DRAFT,
            'status' => 'scheduled',
            'publishedAt' => now()->addMinute()->toIso8601ZuluString(),
            'excerpt' => 'Worth the wait.',
            'featuredImage' => ['url' => 'https://example.com/a.png', 'alt' => 'A picture'],
            'content' => '<p>'.str_repeat('word ', 300).'</p>',
        ])->assertCreated()->json('data');

        $this->getJson("/api/articles/slug/{$article['slug']}")->assertNotFound();
        $this->travel(2)->minutes();
        $this->getJson("/api/articles/slug/{$article['slug']}")->assertOk()->assertJsonPath('data.status', 'published');
        $this->as('admin', 'GET', "/api/admin/articles/{$article['id']}")->assertJsonPath('data.status', 'published');
    }

    public function test_a_preview_token_opens_a_draft_and_counts_no_view(): void
    {
        $draft = $this->as('admin', 'POST', '/api/admin/articles', self::DRAFT)->assertCreated()->json('data');
        $this->assertNull($draft['featuredImage']);
        $this->getJson("/api/articles/slug/{$draft['slug']}")->assertNotFound();

        $token = $this->as('manager', 'GET', "/api/admin/articles/{$draft['id']}/preview-token")
            ->assertOk()
            ->assertJsonPath('data.url', fn ($url) => str_ends_with($url, "/insights/articles/{$draft['slug']}?preview=".$this->tokenOf($url)))
            ->json('data.token');
        $this->getJson("/api/articles/slug/{$draft['slug']}?preview={$token}")->assertOk()->assertJsonPath('data.viewCount', 0);
        $this->as('sales', 'GET', "/api/admin/articles/{$draft['id']}/preview-token")->assertForbidden();
    }

    public function test_a_bulk_publish_is_refused_whole_and_a_deleted_article_gives_up_its_slug(): void
    {
        $bare = $this->as('admin', 'POST', '/api/admin/articles', self::DRAFT)->json('data');
        $this->as('admin', 'POST', '/api/admin/articles/bulk', ['ids' => [$bare['id'], 11], 'action' => 'publish'])
            ->assertStatus(422)
            ->assertJsonPath('data.notReady.0.gaps', ['no excerpt', 'no featured image', '4 of 300 words']);
        $this->as('admin', 'GET', '/api/admin/articles/11')->assertJsonPath('data.status', 'draft');

        $this->as('admin', 'DELETE', "/api/admin/articles/{$bare['id']}")->assertOk();
        $this->as('admin', 'POST', '/api/admin/articles', self::DRAFT)->assertCreated()->assertJsonPath('data.slug', $bare['slug']);
    }

    public function test_a_protected_page_is_never_deleted_and_a_built_in_one_never_unpublished(): void
    {
        $this->as('admin', 'DELETE', '/api/admin/pages/3')
            ->assertStatus(409)
            ->assertJsonPath('message', '“Contact Us” cannot be deleted: the site links to it by its address. Unpublish it instead.');
        $this->as('admin', 'POST', '/api/admin/pages/bulk', ['ids' => [17, 18, 2], 'action' => 'unpublish'])
            ->assertStatus(422)
            ->assertJsonPath('message', '2 of the selected pages cannot be unpublished: “Buy”, “Rent”.');
        $this->as('admin', 'POST', '/api/admin/pages', ['title' => 'Insights', 'template' => 'standard', 'status' => 'draft'])
            ->assertStatus(422)
            ->assertJsonPath('errors.slug.0', 'Reserved path — “insights” belongs to the site’s own pages.');
    }

    public function test_page_blocks_get_ids_and_dense_orders_and_hidden_ones_stay_off_the_site(): void
    {
        $page = $this->as('admin', 'POST', '/api/admin/pages', [
            'title' => 'Blocks in order',
            'template' => 'standard',
            'status' => 'published',
            'blocks' => [
                ['type' => 'richText', 'order' => 5, 'hidden' => false, 'data' => ['html' => '<p>Last</p>']],
                ['type' => 'cta', 'hidden' => true, 'data' => new \stdClass],
                ['id' => 7, 'type' => 'faq', 'order' => 1, 'hidden' => false, 'data' => new \stdClass],
            ],
        ])->assertCreated()->json('data');

        $this->assertSame([[7, 1], [9, 2], [8, 3]], array_map(fn (array $block) => [$block['id'], $block['order']], $page['blocks']));
        $this->assertSame([7, 8], array_column($this->getJson('/api/pages/slug/blocks-in-order')->json('data.blocks'), 'id'));
    }

    public function test_a_deleted_menu_takes_its_pages_out_of_the_header(): void
    {
        $this->as('admin', 'DELETE', '/api/admin/header-menus/1')
            ->assertStatus(409)
            ->assertJsonPath('message', '“Buy” is generated by the site and cannot be deleted. Hide it instead.');

        $this->as('admin', 'DELETE', '/api/admin/header-menus/9')->assertOk();
        $this->as('admin', 'GET', '/api/admin/pages/2')
            ->assertJsonPath('data.showInHeader', false)
            ->assertJsonPath('data.headerMenu', null)
            ->assertJsonPath('data.headerSubmenu', null);
        $this->assertNotContains('company', array_column($this->getJson('/api/header-menus')->json('data'), 'slug'));
    }

    private function tokenOf(string $url): string
    {
        return substr($url, strrpos($url, '=') + 1);
    }
}
