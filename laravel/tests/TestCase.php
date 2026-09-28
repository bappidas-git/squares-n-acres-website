<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;

/**
 * Feature tests run against a MySQL database of their own (phpunit.xml →
 * `sna_testing`), migrated and seeded with db.json once per run; every test
 * runs inside a transaction that is rolled back.
 */
abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /** The seed is what every example of the contract was made from. */
    protected $seed = true;

    /** @var array<string, string> role → bearer token */
    private array $tokens = [];

    /** A bearer token for one of the seed's three accounts. */
    protected function tokenFor(string $role = 'admin'): string
    {
        if (! isset($this->tokens[$role])) {
            $response = $this->postJson('/api/auth/login', [
                'email' => "{$role}@squaresnacres.com",
                'password' => ucfirst($role).'@123',
            ]);
            $this->tokens[$role] = (string) $response->json('data.token');
        }

        return $this->tokens[$role];
    }

    /** A JSON request as one of the seed's accounts. */
    protected function as(string $role, string $method, string $uri, array $data = []): TestResponse
    {
        return $this->json($method, $uri, $data, ['Authorization' => 'Bearer '.$this->tokenFor($role)]);
    }
}
