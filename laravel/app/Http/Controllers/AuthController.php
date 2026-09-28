<?php

namespace App\Http\Controllers;

use App\Contract\Contract;
use App\Domain\Auth\Tokens;
use App\Models\AdminUser;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use App\Support\Validation\SchemaValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Authentication (02_AUTH_AND_RBAC.md → "Token flow").
 *
 *   POST /auth/login      e-mail + password → a bearer token
 *   POST /auth/logout     revokes the token that made the call
 *   POST /auth/refresh    the same token, a full lifetime from now
 *   GET  /auth/profile    the signed-in user
 *   PUT  /auth/profile    their own name, phone and avatar
 *   PUT  /auth/password   their own password — the other sessions end
 *
 * Only `login` is public.
 */
class AuthController extends Controller
{
    /** The same answer for an unknown address and for a wrong password. */
    private const INVALID_CREDENTIALS = 'Invalid email or password.';

    /** A password holds a letter and a digit as well as its eight characters. */
    public const PASSWORD_PATTERN = '/^(?=.*[A-Za-z])(?=.*\d)/';

    public static function passwordMessage(string $field = 'password'): string
    {
        return "The {$field} must contain at least one letter and one digit.";
    }

    public function login(Request $request): JsonResponse
    {
        $body = $this->normalize($this->body($request));
        SchemaValidator::validate(Contract::schema('auth.login'), $body);

        Tokens::purgeExpired();

        $email = Js::lower((string) $body['email']);
        $user = AdminUser::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->first();
        if ($user === null || ! is_string($body['password']) || ! Hash::check($body['password'], $user->password)) {
            ApiLog::warning('auth', 'Sign-in refused', ['email' => $email]);

            throw ApiException::unauthorized(self::INVALID_CREDENTIALS);
        }

        $this->store->setColumns('adminUsers', $user->getKey(), ['last_login_at' => Clock::storage(Clock::now())]);
        // A session beside the account's others: a desk and a phone at once.
        $issued = Tokens::issue($user);
        ApiLog::info('auth', "Signed in #{$user->getKey()} ({$user->role})");

        return Envelope::ok([...$issued, 'user' => $this->sessionUser($user->getKey())]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $expiresAt = Tokens::extend($user?->currentAccessToken());
        if ($expiresAt === null) {
            throw ApiException::unauthorized();
        }

        return Envelope::ok([
            'token' => $request->attributes->get('plainToken'),
            'expiresAt' => $expiresAt,
            'user' => $this->sessionUser($user->getKey()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Tokens::revoke($this->user($request)?->currentAccessToken());

        return Envelope::message('Logged out.');
    }

    public function profile(Request $request): JsonResponse
    {
        return Envelope::ok($this->userDocument($request));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $body = $this->normalize($this->body($request));
        SchemaValidator::validate(Contract::schema('auth.profile'), $body);

        $user = $this->userDocument($request);
        // A PUT states the whole form: the optional fields it leaves out are reset.
        $stored = $this->store->update('adminUsers', [
            ...$user,
            'name' => $body['name'],
            'phone' => $body['phone'] ?? null,
            'avatarUrl' => $body['avatarUrl'] ?? null,
            'updatedAt' => Clock::nowIso(),
        ], $user);
        ApiLog::info('auth', "Profile of #{$user['id']} updated");

        return Envelope::ok($stored);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('auth.password'), $body);

        $user = $this->user($request);
        $errors = [];
        if (! is_string($body['currentPassword']) || ! Hash::check($body['currentPassword'], $user->password)) {
            $errors['currentPassword'] = 'Current password is incorrect.';
        }
        if (! preg_match(self::PASSWORD_PATTERN, (string) $body['newPassword'])) {
            $errors['newPassword'] = self::passwordMessage('newPassword');
        }
        if ($errors !== []) {
            throw ApiException::validation($errors);
        }

        $this->store->setColumns('adminUsers', $user->getKey(), [
            'password' => Hash::make($body['newPassword']),
            'updated_at' => Clock::storage(Clock::now()),
        ]);
        // The session that changed the password stays signed in; every other one does not.
        Tokens::revokeUser($user->getKey(), $user->currentAccessToken()?->getKey());
        ApiLog::info('auth', "Password of #{$user->getKey()} changed; other sessions ended");

        return Envelope::message('Password updated.');
    }

    /** The `user` of a session: the six fields of the login response. */
    private function sessionUser(int $id): array
    {
        $user = $this->store->find('adminUsers', $id);

        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'avatarUrl' => $user['avatarUrl'] ?? null,
            'phone' => $user['phone'] ?? null,
        ];
    }

    /** Trims the text a form sends; e-mail matching ignores whitespace. */
    private function normalize(array $body): array
    {
        foreach (['email', 'name', 'phone', 'avatarUrl'] as $field) {
            if (is_string($body[$field] ?? null)) {
                $body[$field] = Js::trim($body[$field]);
            }
        }

        return $body;
    }
}
