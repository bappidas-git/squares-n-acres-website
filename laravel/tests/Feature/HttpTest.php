<?php

namespace Tests\Feature;

use App\Support\Api\ApiException;
use Illuminate\Http\Request;
use Tests\TestCase;

/** 01_API_CONTRACT.md → "Rate limiting", "CORS"; 07_DEPLOYMENT.md → hosts: what a request meets before its route. */
class HttpTest extends TestCase
{
    public function test_a_form_over_its_limit_is_a_429_in_the_envelope(): void
    {
        config(['sna.rate_limits.public_forms_per_minute' => 2]);

        $this->postJson('/api/newsletter/subscribe', [])->assertStatus(422);
        $this->postJson('/api/newsletter/subscribe', [])->assertStatus(422);
        $this->postJson('/api/newsletter/subscribe', [])
            ->assertStatus(429)
            ->assertExactJson(['message' => ApiException::TOO_MANY])
            ->assertHeader('Retry-After')
            ->assertHeader('X-Request-Id');
    }

    public function test_signing_in_over_the_limit_is_refused_before_the_password_is_asked(): void
    {
        config(['sna.rate_limits.login_per_minute' => 1]);

        $this->postJson('/api/auth/login', ['email' => 'sales@squaresnacres.com', 'password' => 'nope-nope'])->assertStatus(401);
        $this->postJson('/api/auth/login', ['email' => 'sales@squaresnacres.com', 'password' => 'Sales@123'])
            ->assertStatus(429)
            ->assertExactJson(['message' => ApiException::TOO_MANY]);
        // The limit is per address: another account signs in.
        $this->postJson('/api/auth/login', ['email' => 'admin@squaresnacres.com', 'password' => 'Admin@123'])->assertOk();
    }

    public function test_the_sites_origin_may_call_the_api_and_others_may_not(): void
    {
        $preflight = fn (string $origin) => $this->call('OPTIONS', '/api/leads', server: [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        $preflight('http://localhost:3000')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        $preflight('https://elsewhere.example')->assertHeaderMissing('Access-Control-Allow-Origin');
    }

    public function test_a_numeric_host_header_is_an_ordinary_request(): void
    {
        // Laravel's own CORS middleware read `Host: 1` as an index into the paths: a 500.
        $this->getJson('http://1/api/health')->assertOk()->assertJsonPath('data.status', 'ok');
    }

    public function test_a_body_whose_keys_are_numbers_names_no_field(): void
    {
        // It stays an object: the answer is the create's own 422, not "must be an object".
        $this->as('admin', 'POST', '/api/admin/amenities', ['0' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('errors.name', ['The name field is required.']);
        $this->as('admin', 'PATCH', '/api/admin/amenities/1', ['0' => 'x'])->assertOk();
    }

    public function test_a_deployed_api_answers_only_for_its_own_hosts(): void
    {
        // Laravel checks the host outside the local environment and tests only.
        $this->app['env'] = 'production';
        config(['sna.trusted_hosts' => ['www.squaresnacres.com']]);

        try {
            $this->getJson('http://www.squaresnacres.com/api/health')->assertOk();
            $this->getJson('http://www.squaresnacres.com.elsewhere.example/api/health')
                ->assertStatus(400)
                ->assertExactJson(['message' => 'Bad request.']);
            $this->getJson('http://api.example/api/health', ['X-Forwarded-Host' => 'www.squaresnacres.com'])->assertOk();
        } finally {
            // Symfony keeps the list in a static: the next test starts without it.
            Request::setTrustedHosts([]);
        }
    }
}
