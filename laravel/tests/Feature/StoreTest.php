<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * App\Store: a value the contract lets through but a column cannot hold is a
 * 422 naming the field, never a failed insert (TableMapper::storageProblems).
 */
class StoreTest extends TestCase
{
    public function test_an_item_id_or_order_beyond_its_column_is_a_422(): void
    {
        $image = ['url' => 'https://example.com/a.jpg', 'alt' => 'Front elevation'];

        $this->as('admin', 'PATCH', '/api/admin/properties/12', ['images' => [['id' => -3, ...$image]]])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['images.0.id' => ['The images.0.id must be at least 0.']]);
        $this->as('admin', 'PATCH', '/api/admin/pages/1', ['blocks' => [['id' => 99999999999, 'type' => 'features', 'order' => 1, 'hidden' => false, 'data' => new \stdClass]]])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['blocks.0.id' => ['The blocks.0.id may not be greater than 4294967295.']]);
        $this->as('admin', 'PATCH', '/api/admin/properties/12', ['images' => [['id' => 1, ...$image, 'order' => 99999999999]]])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['images.0.order' => ['The images.0.order may not be greater than 2147483647.']]);
    }

    public function test_a_string_longer_than_its_column_is_a_422(): void
    {
        // The phone rule reads the number without its spaces; the column holds what was sent.
        $this->as('admin', 'PATCH', '/api/admin/team/1', ['phone' => '98765'.str_repeat(' ', 40).'43210'])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['phone' => ['The phone may not be greater than 20 characters.']]);
    }

    public function test_a_value_the_column_holds_is_stored_as_before(): void
    {
        $image = ['url' => 'https://example.com/a.jpg', 'alt' => 'Front elevation', 'order' => 0];

        $this->as('admin', 'PATCH', '/api/admin/properties/12', ['images' => [['id' => 4294967295, ...$image]]])
            ->assertOk()
            ->assertJsonPath('data.images.0.id', 4294967295);
    }
}
