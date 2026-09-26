# Backend notes — authentication and roles

Merged into `backend_developer_guidelines/02_AUTH_AND_RBAC.md`. The role matrix
itself is generated from `src/config/rbac.js`; this file carries the mechanics
Laravel has to implement.

Edit this file, never the generated one.

## Token flow

Authentication is **Laravel Sanctum personal access tokens** — not the SPA cookie
mode. The site and the API are separate origins, the admin panel is a static
bundle, and a bearer token in a header needs neither a CSRF dance nor a shared
cookie domain.

```
POST /api/auth/login  { email, password }
        │
        ├─ user not found, inactive, or password mismatch
        │     └─→ 401  { message: 'Invalid email or password.' }
        │
        └─ match
              ├─ $token = $user->createToken('admin-panel', ['*'], now()->addHours(24))   // beside the others
              ├─ $user->forceFill(['last_login_at' => now()])->save()
              └─→ 200 { data: { token, expiresAt, user: { id, name, email, role, avatarUrl, phone } } }

Every later call
        Authorization: Bearer <token>
        │
        ├─ unknown / revoked / expired token  →  401 { message: 'Unauthenticated.' }
        ├─ known token, role not allowed      →  403 { message: 'You do not have permission to perform this action.' }
        └─ known token, role allowed          →  the handler runs, with $request->user() set

POST /api/auth/refresh                                     (prompt 51)
        ├─ $token = $request->user()->currentAccessToken()
        ├─ $token->forceFill(['expires_at' => now()->addMinutes(config('sanctum.expiration'))])->save()
        └─→ 200 { data: { token, expiresAt, user } }   — the token the request carried, a later expiresAt

POST /api/auth/logout
        └─ $request->user()->currentAccessToken()->delete()  →  200 { data: null, message: 'Logged out.' }
```

Notes that matter:

- **An account may be signed in on several devices at once** — a desk and a
  phone (QA-65). A login creates a token beside the account's others and deletes
  none of them: a second sign-in must leave the first working. A session ends
  when it signs out (only `currentAccessToken()` is deleted), when its token
  expires, and when the account's password is changed or reset or the account
  is deactivated or deleted — each of which deletes every token of the account
  but the caller's own (below). The admin tells the user so — "Password changed.
  Your other sessions have been signed out." — and
  `mock-server/__tests__/auth.test.js` checks that a first token still answers
  200 after a second login.

- `expiresAt` is part of the login response because the client enforces expiry
  too: it stores `sna_auth_token`, `sna_auth_user` and `sna_auth_expires_at`, sets
  a timer, and signs the user out with a toast the moment the clock runs out. Send
  it as ISO-8601 UTC, the same instant the token record carries.
- **"Stay signed in"** (prompt 51). Five minutes before `expiresAt` the admin
  shows "Your session ends in 5 minutes." with a button that calls
  `POST /auth/refresh`: the **same** token, its `expires_at` moved a full
  lifetime from now, answered in the login response's shape. Do not issue a new
  token there — the requests already on their way, and the admin's other tabs,
  hold the old one, and revoking it signs them all out. A token that is no
  longer live answers `401`. Unsaved work in the record forms is kept in the
  browser if the session ends anyway.
- A `401` from **any** endpoint makes the frontend drop its stored session and
  redirect to the login screen, so never answer 401 for an authorisation failure —
  that is what `403` is for.
- The user object of the login response and of `GET /auth/profile` is the same
  shape. Return it from one API resource so the two cannot drift.
- `PUT /auth/password` answers `422` with `errors.currentPassword` when the
  current password is wrong, and requires at least 8 characters **with a letter
  and a digit** for the new one (`errors.newPassword`: "The newPassword must
  contain at least one letter and one digit."). Revoke every other token of that
  user on success.
- `PUT /auth/password` is throttled per **account**, five attempts a minute
  (QA-65) — it takes the current password, so it is a way to guess it — and the
  sixth answers `429` with `Retry-After` and "Too many attempts to change the
  password. Try again in a minute.". In Laravel, a named limiter keyed on the
  user id — `Limit::perMinute(5)->by($request->user()->id)`.
- `PUT /auth/profile` takes an `avatarUrl` of at most 500 characters, the
  width of `admin_users.avatar_url` (`nullable|url|max:500`); longer answers
  `422` on `avatarUrl` instead of failing the write (QA-65).
- The same rule holds wherever a password is set (QA-64): `POST /admin/users`
  and a `PUT` or `PATCH /admin/users/:id` that carries `password` answer `422`
  on `password` ("The password must contain at least one letter and one
  digit.") for eight letters or eight digits. A password set that way — an
  administrator's reset — revokes **every** token of that account, except the
  caller's own when an administrator resets their own password.

## Token lifetime

The mock expires a token after `MOCK_TOKEN_TTL_HOURS`, default **24 hours**.
Match it in Laravel:

```php
// config/sanctum.php
'expiration' => env('SANCTUM_TOKEN_TTL_MINUTES', 1440),   // 24 hours
```

Schedule `sanctum:prune-expired --hours=48` daily so the token table does not
grow without bound. Twenty-four hours is a deliberate compromise: long enough
that a working day needs one sign-in, short enough that a token copied out of a
laptop stops working overnight. Changing it is a one-line config change and
needs no frontend release — the client reads the expiry the server sends.

## Seed passwords

`db.json` ships three accounts so the mock is usable out of the box:

| E-mail                      | Password      | Role      |
| --------------------------- | ------------- | --------- |
| `admin@squaresnacres.com`   | `Admin@123`   | `admin`   |
| `manager@squaresnacres.com` | `Manager@123` | `manager` |
| `sales@squaresnacres.com`   | `Sales@123`   | `sales`   |

They are **plaintext in the seed file and only there**. The mock compares them
directly because it is a development server on a developer's machine.

On import into MySQL, hash them:

```php
DB::table('admin_users')->get()->each(function ($user) {
    DB::table('admin_users')->where('id', $user->id)
        ->update(['password' => Hash::make($user->password)]);
});
```

and on the first deployment of a real environment, **rotate all three**:

```bash
php artisan tinker
>>> User::where('email', 'admin@squaresnacres.com')->update(['password' => Hash::make('<a new password>')]);
```

The three seed passwords are published in this handover package, in the
repository, and in the mock's README. Treat them as compromised from the moment
the API is reachable from anything but `localhost`. The go-live checklist of
`07_DEPLOYMENT.md` will not let you past that step.

`password` is never returned by any endpoint. It carries `secret: true` in the
model descriptor, and the API resource for a user must not include it — not even
hashed.

## Sales scoping

A sales user sees the leads **assigned to them or unassigned**, and nothing else.
The rule is enforced on the server; the frontend hides what it is not allowed to
show, but that is decoration.

```sql
-- every read, export and aggregate a sales user makes
SELECT *
  FROM leads
 WHERE deleted_at IS NULL
   AND (assigned_to = :user_id OR assigned_to IS NULL)
```

In Eloquent, one scope used by every lead query:

```php
public function scopeVisibleTo(Builder $query, User $user): Builder
{
    if ($user->role === 'sales') {
        return $query->where(fn ($q) => $q->where('assigned_to', $user->id)
                                          ->orWhereNull('assigned_to'));
    }

    return $query;   // admin and manager see everything
}
```

It applies to more than the list:

| Call                                    | What scoping means                                                                                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/leads`                      | the `WHERE` above, and `meta.total` counts only the visible rows                                                                                                                        |
| `GET /admin/leads/:id`                  | a lead outside the scope is **404**, never 403 — a sales user must not learn that a lead exists                                                                                         |
| `PATCH /admin/leads/:id`                | same 404; and a sales user may not set `assignedTo` to anybody but themselves                                                                                                           |
| `POST /admin/leads/:id/claim`           | allowed only while `assigned_to IS NULL`; sets it to the caller                                                                                                                         |
| `DELETE /admin/leads/:id`               | **403** for sales, whatever the scope says                                                                                                                                              |
| `GET /admin/leads/export`               | the same `WHERE`, so the CSV holds the visible rows only                                                                                                                                |
| `DELETE /admin/leads/:id/notes/:noteId` | a sales user may withdraw a note they wrote (`created_by = :user_id`); anybody else's is 403                                                                                            |
| `GET /admin/dashboard`                  | every **lead** figure is scoped — totals, the 30-day trend, the source and status breakdowns, the recent list and the follow-ups. Property, article and SEO figures stay global (§6.16) |

The one thing scoping must not do is leak through a count: a sales user who sees
`leadsTotal: 312` while their list shows 41 rows has been told how much of the
pipeline is hidden from them.
