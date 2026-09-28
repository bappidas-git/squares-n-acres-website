<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 02_AUTH_AND_RBAC.md → "Token flow", "Being refused", "The role matrix". */
class AuthTest extends TestCase
{
    public function test_health_answers_in_the_envelope(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertHeader('X-Request-Id');
    }

    public function test_login_answers_a_token_and_the_session_user(): void
    {
        $response = $this->postJson('/api/auth/login', ['email' => ' Admin@SquaresNAcres.com ', 'password' => 'Admin@123']);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['token', 'expiresAt', 'user' => ['id', 'name', 'email', 'role', 'avatarUrl', 'phone']]])
            ->assertJsonPath('data.user.role', 'admin');
        $this->assertArrayNotHasKey('password', $response->json('data.user'));
    }

    public function test_a_wrong_password_is_the_same_401_as_an_unknown_address(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'admin@squaresnacres.com', 'password' => 'nope-nope'])
            ->assertStatus(401)
            ->assertExactJson(['message' => 'Invalid email or password.']);
        $this->postJson('/api/auth/login', ['email' => 'nobody@squaresnacres.com', 'password' => 'nope-nope'])
            ->assertStatus(401)
            ->assertExactJson(['message' => 'Invalid email or password.']);
    }

    public function test_a_login_without_fields_is_a_422_in_laravels_shape(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The given data was invalid.')
            ->assertJsonPath('errors.email.0', 'The email field is required.')
            ->assertJsonPath('errors.password.0', 'The password field is required.');
    }

    public function test_admin_routes_need_a_token_and_the_role(): void
    {
        $this->getJson('/api/admin/properties')->assertStatus(401)->assertExactJson(['message' => 'Unauthenticated.']);
        $this->as('sales', 'GET', '/api/admin/users')
            ->assertStatus(403)
            ->assertExactJson(['message' => 'You do not have permission to perform this action.']);
        $this->as('manager', 'GET', '/api/admin/users')->assertOk();
        $this->as('manager', 'PUT', '/api/admin/settings', ['general' => []])->assertStatus(403);
    }

    public function test_refresh_keeps_the_token_and_logout_revokes_it(): void
    {
        $token = $this->tokenFor('sales');
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson('/api/auth/refresh', [], $headers)->assertOk()->assertJsonPath('data.token', $token);
        $this->postJson('/api/auth/logout', [], $headers)->assertOk()->assertJsonPath('message', 'Logged out.');
        $this->getJson('/api/auth/profile', $headers)->assertStatus(401);
    }

    public function test_a_new_password_needs_a_letter_and_a_digit(): void
    {
        $this->as('sales', 'PUT', '/api/auth/password', ['currentPassword' => 'Sales@123', 'newPassword' => 'abcdefgh'])
            ->assertStatus(422)
            ->assertJsonPath('errors.newPassword.0', 'The newPassword must contain at least one letter and one digit.');
        $this->as('sales', 'PUT', '/api/auth/password', ['currentPassword' => 'wrong-one1', 'newPassword' => 'abcdefg1'])
            ->assertStatus(422)
            ->assertJsonPath('errors.currentPassword.0', 'Current password is incorrect.');
        $this->as('sales', 'PUT', '/api/auth/password', ['currentPassword' => 'Sales@123', 'newPassword' => 'Sales@1234'])
            ->assertOk();
    }

    public function test_the_last_active_admin_cannot_be_deactivated(): void
    {
        $this->as('admin', 'PATCH', '/api/admin/users/1', ['isActive' => false])
            ->assertStatus(422)
            ->assertJsonPath('errors.id.0', 'The last active admin cannot be deactivated, demoted or deleted.');
    }
}
