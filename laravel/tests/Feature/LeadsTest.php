<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 05_BUSINESS_RULES.md → "Leads"; 02_AUTH_AND_RBAC.md → the sales scope. */
class LeadsTest extends TestCase
{
    public function test_a_public_enquiry_is_stored_with_its_listing_and_first_timeline_entry(): void
    {
        $response = $this->postJson('/api/leads', [
            'name' => 'Test Buyer',
            'phone' => '98765 43210',
            'source' => 'property-enquiry',
            'propertyId' => 1,
            'consent' => true,
            'utm' => ['term' => 'flats', 'medium' => 'cpc', 'source' => 'google'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.phone', '+919876543210')
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.propertySnapshot.slug', 'lakeview-heights-3-bhk-whitefield')
            ->assertJsonPath('data.activities.0.description', 'Lead created via Property Enquiry');

        // A JSON column reads back in the contract's key order (MySQL stores `term, medium, source`).
        $this->assertSame(['source' => 'google', 'medium' => 'cpc', 'term' => 'flats'], $response->json('data.utm'));
    }

    public function test_the_honeypot_answers_like_a_success_and_stores_nothing(): void
    {
        $before = $this->as('admin', 'GET', '/api/admin/leads')->json('meta.total');

        $this->postJson('/api/leads', ['name' => 'Robot', 'phone' => '9876543210', 'source' => 'contact-page', 'website' => 'http://spam.example'])
            ->assertOk()
            ->assertExactJson(['data' => null, 'message' => 'ok']);
        $this->assertSame($before, $this->as('admin', 'GET', '/api/admin/leads')->json('meta.total'));
    }

    public function test_a_legacy_source_is_stored_as_its_current_name(): void
    {
        $this->postJson('/api/leads', ['name' => 'Legacy Form', 'phone' => '9876543210', 'source' => 'property_enquiry'])
            ->assertCreated()
            ->assertJsonPath('data.source', 'property-enquiry');
    }

    public function test_a_sales_user_sees_their_own_leads_and_the_unassigned_ones(): void
    {
        $assignees = collect($this->as('sales', 'GET', '/api/admin/leads?perPage=100')->assertOk()->json('data'))
            ->pluck('assignedTo')->unique()->sort()->values()->all();

        $this->assertSame([null, 3], $assignees);
    }

    public function test_notes_sent_in_a_patch_are_held_to_the_models_shape(): void
    {
        $this->as('admin', 'PATCH', '/api/admin/leads/1', ['notes' => [['text' => 5]]])
            ->assertStatus(422)
            ->assertJsonPath('errors', [
                'notes.0.id' => ['The notes.0.id field is required.'],
                'notes.0.text' => ['The notes.0.text must be a string.'],
                'notes.0.createdAt' => ['The notes.0.createdAt field is required.'],
            ]);

        $note = ['id' => 1, 'text' => 'Called back.', 'createdBy' => 999, 'createdByName' => 'Ghost', 'createdAt' => '2026-01-15T09:30:00.000Z'];
        $this->as('admin', 'PATCH', '/api/admin/leads/1', ['notes' => [$note]])
            ->assertStatus(422)
            ->assertJsonPath('errors', ['notes.0.createdBy' => ['The selected notes.0.createdBy is invalid.']]);

        $this->as('admin', 'PATCH', '/api/admin/leads/1', ['notes' => [[...$note, 'createdBy' => 2, 'createdByName' => 'Manager User']]])
            ->assertOk()
            ->assertJsonCount(1, 'data.notes')
            ->assertJsonPath('data.notes.0.text', 'Called back.')
            ->assertJsonPath('data.notes.0.createdAt', '2026-01-15T09:30:00.000Z');
    }

    public function test_a_follow_up_the_database_cannot_hold_is_refused(): void
    {
        $this->as('admin', 'PATCH', '/api/admin/leads/2', ['followUpAt' => '+010000-01-01T00:00:00.000Z'])
            ->assertStatus(422)
            ->assertJsonPath('errors.followUpAt', ['The followUpAt is not a valid date.']);

        $this->as('admin', 'PATCH', '/api/admin/leads/2', ['followUpAt' => '9999-12-31T23:59:59.999Z'])
            ->assertOk()
            ->assertJsonPath('data.followUpAt', '9999-12-31T23:59:59.999Z');
    }
}
