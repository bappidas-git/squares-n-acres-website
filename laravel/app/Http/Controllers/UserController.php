<?php

namespace App\Http\Controllers;

use App\Contract\Contract;
use App\Domain\Auth\Tokens;
use App\Support\Api\ApiException;
use App\Support\Api\Envelope;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\Sorter;
use App\Support\Time\Clock;
use App\Support\Validation\Documents;
use App\Support\Validation\SchemaValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Admin users (05_BUSINESS_RULES.md → "Admin users").
 *
 *   GET    /admin/users            `q`, `role`, `isActive`, `ids` (admin and manager: naming an assignee)
 *   POST   /admin/users            409 when the e-mail is taken
 *   GET    /admin/users/{id}
 *   PUT    /admin/users/{id}       full replace; the password is optional
 *   PATCH  /admin/users/{id}       partial; sending `password` resets it
 *   DELETE /admin/users/{id}       unassigns the user's leads
 *   POST   /admin/users/bulk       activate | deactivate | delete
 *
 * The rules the role matrix cannot express: you cannot deactivate or delete
 * yourself, nor change your own role; the last active admin cannot be
 * deactivated, demoted or deleted (checked on the state the request would
 * produce); e-mail addresses are unique, case-insensitively; a password holds
 * a letter and a digit; setting one signs the account out everywhere but the
 * session that set it; deactivating or deleting one revokes its tokens.
 * The password is never part of a response.
 */
class UserController extends Controller
{
    private const SORTABLE = ['name', 'createdAt', 'lastLoginAt'];

    private const BULK_ACTIONS = ['activate', 'deactivate', 'delete'];

    private const EMAIL_TAKEN = 'The email has already been taken.';

    private const LAST_ADMIN = 'The last active admin cannot be deactivated, demoted or deleted.';

    private const SELF_DEACTIVATE = 'You cannot deactivate your own account.';

    private const SELF_DELETE = 'You cannot delete your own account.';

    private const SELF_ROLE = 'You cannot change your own role.';

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $roles = Filters::csv($query->get('role'));
        $ids = Filters::csv($query->get('ids'));
        $active = Filters::bool($query->get('isActive'));
        $q = $query->first('q');

        $matched = array_values(array_filter($this->store->all('adminUsers'), function (array $user) use ($roles, $ids, $active, $q) {
            return Filters::matchesQ($user, ['name', 'email'], $q)
                && ($roles === [] || in_array($user['role'], $roles, true))
                && ($ids === [] || in_array((string) $user['id'], $ids, true))
                && ($active === null || (bool) $user['isActive'] === $active);
        }));

        $sort = (string) $query->first('sort');
        $sortable = in_array($sort, self::SORTABLE, true);
        $sorted = Sorter::sort($matched, $sortable ? $sort : 'name', $sortable ? $query->first('order') : 'asc');

        $perPage = $query->first('perPage');
        [$page, $meta] = Paginator::paginate($sorted, $query->first('page'), $perPage === 'all' ? null : ($perPage ?? Paginator::DEFAULT_PER_PAGE_ADMIN));

        return Envelope::list($page, $meta);
    }

    public function bulk(Request $request): JsonResponse
    {
        $body = $this->body($request);
        SchemaValidator::validate(Contract::schema('bulk'), $body);
        if (! in_array($body['action'], self::BULK_ACTIONS, true)) {
            throw ApiException::validation(['action' => 'The selected action is invalid.']);
        }

        $me = $this->user($request);
        $ids = array_map(fn ($id) => Js::string($id), $body['ids']);
        $targets = array_values(array_filter($this->store->all('adminUsers'), fn ($user) => in_array((string) $user['id'], $ids, true)));
        $hitsSelf = array_filter($targets, fn ($user) => $user['id'] === $me->getKey()) !== [];

        if ($body['action'] === 'deactivate') {
            $this->assertAdminSurvives(updates: array_fill_keys(array_column($targets, 'id'), ['isActive' => false]));
            if ($hitsSelf) {
                throw ApiException::validation(['id' => self::SELF_DEACTIVATE]);
            }
        }
        if ($body['action'] === 'delete') {
            $this->assertAdminSurvives(deleted: array_column($targets, 'id'));
            if ($hitsSelf) {
                throw ApiException::validation(['id' => self::SELF_DELETE]);
            }
        }

        $affected = DB::transaction(function () use ($body, $targets, $me) {
            if ($body['action'] === 'delete') {
                foreach ($targets as $user) {
                    $this->removeUser($user, $me->getKey());
                }

                return count($targets);
            }
            $isActive = $body['action'] === 'activate';
            $changed = 0;
            foreach ($targets as $user) {
                // An account already in that state is not written and not counted.
                if (($user['isActive'] !== false) === $isActive) {
                    continue;
                }
                $this->store->update('adminUsers', [...$user, 'isActive' => $isActive, 'updatedAt' => Clock::nowIso()], $user);
                if (! $isActive) {
                    Tokens::revokeUser($user['id']);
                }
                $changed++;
            }

            return $changed;
        });

        ApiLog::info('users', "Bulk {$body['action']}: {$affected} affected");
        $noun = $affected === 1 ? 'user' : 'users';

        return Envelope::message("{$affected} {$noun} ".($body['action'] === 'delete' ? 'deleted' : 'updated').'.', ['affected' => $affected]);
    }

    public function store(Request $request): JsonResponse
    {
        $body = $this->normalize($this->body($request));
        SchemaValidator::validate(Contract::schema('user.create'), $body, ['fillDefaults' => true]);
        $this->assertStrongPassword($body['password'] ?? null);
        $this->assertEmailFree($body['email'], null);

        $fields = Contract::model('adminUsers')['fields'];
        $clean = Documents::sanitize($body, $fields);
        $now = Clock::nowIso();
        $record = [
            ...Documents::mergeDefaults(Documents::defaults($fields), $clean),
            'lastLoginAt' => null,
            'createdAt' => $now,
            'updatedAt' => $now,
        ];
        unset($record['password']);

        $stored = $this->store->insert('adminUsers', $record, ['password' => Hash::make($clean['password'])]);
        ApiLog::info('users', "Created #{$stored['id']} ({$stored['role']})");

        return Envelope::created($stored);
    }

    public function show(string $id): JsonResponse
    {
        return Envelope::ok($this->store->find('adminUsers', $id) ?? throw ApiException::notFound());
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $existing = $this->store->find('adminUsers', $id) ?? throw ApiException::notFound();
        $body = $this->normalize($this->body($request));
        SchemaValidator::validate(Contract::schema('user.update'), $body);
        $this->assertStrongPassword($body['password'] ?? null);
        $this->assertEmailFree($body['email'], $existing['id']);

        $me = $this->user($request);
        $isSelf = $existing['id'] === $me->getKey();
        $fields = Contract::model('adminUsers')['fields'];
        $clean = Documents::sanitize($body, $fields);
        // Editing yourself keeps your role, whatever the form sends.
        $role = $isSelf ? $existing['role'] : $clean['role'];
        $isActive = ($clean['isActive'] ?? true) !== false;

        $this->assertAdminSurvives(updates: [$existing['id'] => ['role' => $role, 'isActive' => $isActive]]);
        if ($isSelf && ! $isActive) {
            throw ApiException::validation(['id' => self::SELF_DEACTIVATE]);
        }

        $record = [
            ...Documents::mergeDefaults(
                [...Documents::defaults($fields), ...Documents::serverManagedValues($existing, $fields)],
                $clean,
            ),
            'role' => $role,
            'id' => $existing['id'],
            'createdAt' => $existing['createdAt'],
            'updatedAt' => Clock::nowIso(),
        ];
        unset($record['password']);
        // The form does not carry the stored password: an absent one means unchanged.
        $extra = ! empty($clean['password']) ? ['password' => Hash::make($clean['password'])] : [];

        $stored = $this->store->update('adminUsers', $record, $existing, $extra);
        $this->afterAccountChange($stored, ! empty($clean['password']), $me);

        return Envelope::ok($stored);
    }

    public function patch(Request $request, string $id): JsonResponse
    {
        $existing = $this->store->find('adminUsers', $id) ?? throw ApiException::notFound();
        $body = $this->normalize($this->body($request));
        SchemaValidator::validate(Contract::schema('user.update'), $body, ['partial' => true]);
        $this->assertStrongPassword($body['password'] ?? null);

        $me = $this->user($request);
        $isSelf = $existing['id'] === $me->getKey();
        $clean = Documents::sanitize($body, Contract::model('adminUsers')['fields']);
        $role = $clean['role'] ?? $existing['role'];
        $isActive = $clean['isActive'] ?? $existing['isActive'];

        if ($isSelf && $role !== $existing['role']) {
            throw ApiException::validation(['role' => self::SELF_ROLE]);
        }
        if (array_key_exists('email', $clean)) {
            $this->assertEmailFree($clean['email'], $existing['id']);
        }
        $this->assertAdminSurvives(updates: [$existing['id'] => ['role' => $role, 'isActive' => $isActive]]);
        if ($isSelf && $isActive === false) {
            throw ApiException::validation(['id' => self::SELF_DEACTIVATE]);
        }

        $password = $clean['password'] ?? null;
        unset($clean['password']);
        $extra = $password ? ['password' => Hash::make($password)] : [];
        $stored = $this->store->update('adminUsers', [...$existing, ...$clean, 'updatedAt' => Clock::nowIso()], $existing, $extra);
        $this->afterAccountChange($stored, (bool) $password, $me);

        return Envelope::ok($stored);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $existing = $this->store->find('adminUsers', $id) ?? throw ApiException::notFound();
        $me = $this->user($request);

        $this->assertAdminSurvives(deleted: [$existing['id']]);
        if ($existing['id'] === $me->getKey()) {
            throw ApiException::validation(['id' => self::SELF_DELETE]);
        }

        DB::transaction(fn () => $this->removeUser($existing, $me->getKey()));

        return Envelope::message('Deleted');
    }

    /* ------------------------------------------------------------------ */

    /** Deactivated: every session ends. A password set by an administrator: every other one. */
    private function afterAccountChange(array $user, bool $passwordSet, $me): void
    {
        if ($user['isActive'] === false) {
            Tokens::revokeUser($user['id']);
        } elseif ($passwordSet) {
            $own = $user['id'] === $me->getKey() ? $me->currentAccessToken()?->getKey() : null;
            Tokens::revokeUser($user['id'], $own);
        }
    }

    /** Unassigns the user's leads (each with an activity saying why), revokes their tokens, deletes them. */
    private function removeUser(array $user, int $actorId): void
    {
        $now = Clock::nowIso();
        foreach ($this->store->all('leads') as $lead) {
            if (($lead['assignedTo'] ?? null) !== $user['id']) {
                continue;
            }
            $activities = $lead['activities'] ?? [];
            $activities[] = [
                'id' => max([0, ...array_map(fn ($entry) => (int) ($entry['id'] ?? 0), $activities)]) + 1,
                'type' => 'assigned',
                'description' => 'Unassigned (user deleted)',
                'note' => null,
                'createdBy' => $actorId,
                'createdAt' => $now,
            ];
            $this->store->update('leads', [...$lead, 'assignedTo' => null, 'activities' => $activities, 'updatedAt' => $now], $lead);
        }
        Tokens::revokeUser($user['id']);
        $this->store->delete('adminUsers', $user['id']);
        ApiLog::info('users', "Deleted #{$user['id']}; their leads unassigned");
    }

    /** Refuses a change that would leave the panel without an active admin. */
    private function assertAdminSurvives(array $deleted = [], array $updates = []): void
    {
        foreach ($this->store->all('adminUsers') as $user) {
            if (in_array($user['id'], $deleted, true)) {
                continue;
            }
            $user = [...$user, ...($updates[$user['id']] ?? [])];
            if ($user['role'] === 'admin' && $user['isActive'] !== false) {
                return;
            }
        }

        throw ApiException::validation(['id' => self::LAST_ADMIN]);
    }

    private function assertEmailFree(mixed $email, ?int $excludeId): void
    {
        $wanted = Js::lower(Js::trim((string) $email));
        foreach ($this->store->all('adminUsers') as $user) {
            if ($user['id'] !== $excludeId && Js::lower(Js::trim((string) $user['email'])) === $wanted) {
                throw ApiException::conflict(self::EMAIL_TAKEN, ['email' => [self::EMAIL_TAKEN]]);
            }
        }
    }

    private function assertStrongPassword(mixed $password): void
    {
        if (is_string($password) && $password !== '' && ! preg_match(AuthController::PASSWORD_PATTERN, $password)) {
            throw ApiException::validation(['password' => AuthController::passwordMessage()]);
        }
    }

    private function normalize(array $body): array
    {
        foreach (['name', 'email', 'phone', 'avatarUrl'] as $field) {
            if (is_string($body[$field] ?? null)) {
                $body[$field] = Js::trim($body[$field]);
            }
        }

        return $body;
    }
}
