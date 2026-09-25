/**
 * Authentication, the role matrix and the users resource, end to end
 * (00_MASTER_CONTEXT.md §5.4, §5.14, §7).
 *
 * Run with `npm run test:mock`, which is `node --test` inside `mock-server/`
 * (Node 22 no longer expands a directory passed to `--test`, and Node 20 does
 * not expand a glob, so the portable form is a directory to run *from*). No
 * test framework is installed and none is on the dependency allow-list (§3.3),
 * so these use Node's own `node:test` and `node:assert`.
 *
 * Every test builds its **own** application over its own copy of the seed
 * (`./helpers.js`), which keeps the committed `db.json` untouched and gives
 * each test a fresh login rate-limit counter — ten attempts a minute per IP is
 * a rule this file also has to test.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const {
  ADMIN,
  MANAGER,
  SALES,
  cleanupTempFiles,
  silenceRequestLog,
  withServer,
} = require('./helpers');

silenceRequestLog();

after(cleanupTempFiles);

describe('POST /auth/login', () => {
  it('returns a 48-character token, the expiry and the user', async () => {
    await withServer(async ({ request, db }) => {
      const response = await request('POST', '/auth/login', { body: ADMIN });

      assert.equal(response.status, 200);
      assert.equal(response.body.data.token.length, 48);
      assert.ok(Date.parse(response.body.data.expiresAt) > Date.now());
      assert.deepEqual(Object.keys(response.body.data.user).sort(), [
        'avatarUrl',
        'email',
        'id',
        'name',
        'phone',
        'role',
      ]);
      assert.equal(response.body.data.user.role, 'admin');

      const stored = db.getCollection('adminUsers').find((user) => user.id === 1);
      assert.ok(Date.parse(stored.lastLoginAt) <= Date.now(), 'lastLoginAt is set on login');
      assert.equal(db.getCollection('apiTokens').length, 1);
    });
  });

  it('matches the e-mail case-insensitively and ignores surrounding spaces', async () => {
    await withServer(async ({ request }) => {
      const response = await request('POST', '/auth/login', {
        body: { email: '  ADMIN@SquaresNAcres.com ', password: ADMIN.password },
      });
      assert.equal(response.status, 200);
    });
  });

  it('answers 401 for a wrong password and 422 for a malformed body', async () => {
    await withServer(async ({ request }) => {
      const wrong = await request('POST', '/auth/login', {
        body: { email: ADMIN.email, password: 'admin@123' },
      });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body.message, 'Invalid email or password.');

      const malformed = await request('POST', '/auth/login', { body: { email: 'nope' } });
      assert.equal(malformed.status, 422);
      assert.ok(malformed.body.errors.email);
      assert.ok(malformed.body.errors.password);
    });
  });

  it('throttles the eleventh attempt of a minute (429)', async () => {
    await withServer(async ({ request }) => {
      const attempt = () =>
        request('POST', '/auth/login', { body: { email: ADMIN.email, password: 'wrong-one' } });

      for (let index = 0; index < 10; index += 1) {
        assert.equal((await attempt()).status, 401);
      }

      const throttled = await attempt();
      assert.equal(throttled.status, 429);
      assert.equal(throttled.body.message, 'Too many requests. Please try again in a minute.');
    });
  });
});

describe('GET /auth/profile', () => {
  it('answers 401 without a token, with a bad token and with an expired one', async () => {
    await withServer(async ({ request, login, db }) => {
      const missing = await request('GET', '/auth/profile');
      assert.equal(missing.status, 401);
      assert.equal(missing.body.message, 'Unauthenticated.');

      assert.equal((await request('GET', '/auth/profile', { token: 'not-a-token' })).status, 401);

      const token = await login(ADMIN);
      const record = db.getCollection('apiTokens').find((entry) => entry.token === token);
      record.expiresAt = new Date(Date.now() - 1000).toISOString();
      db.write();

      const expired = await request('GET', '/auth/profile', { token });
      assert.equal(expired.status, 401);
      assert.equal(
        db.getCollection('apiTokens').length,
        0,
        'an expired token is purged when it is presented'
      );
    });
  });

  it('returns the signed-in user without the password', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(MANAGER);
      const response = await request('GET', '/auth/profile', { token });

      assert.equal(response.status, 200);
      assert.equal(response.body.data.email, MANAGER.email);
      assert.equal(response.body.data.password, undefined);
    });
  });

  it('stops working as soon as the account is deactivated', async () => {
    await withServer(async ({ request, login }) => {
      const salesToken = await login(SALES);
      const adminToken = await login(ADMIN);

      const patched = await request('PATCH', '/admin/users/3', {
        token: adminToken,
        body: { isActive: false },
      });
      assert.equal(patched.status, 200);

      const response = await request('GET', '/auth/profile', { token: salesToken });
      assert.equal(response.status, 401);
      assert.equal(response.body.message, 'Unauthenticated.');
    });
  });
});

describe('PUT /auth/profile and PUT /auth/password', () => {
  it('updates the own profile and resets the fields a PUT leaves out', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);
      const response = await request('PUT', '/auth/profile', {
        token,
        body: { name: 'Sales Lead', phone: '9880000099' },
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.data.name, 'Sales Lead');
      assert.equal(response.body.data.phone, '9880000099');
      assert.equal(response.body.data.avatarUrl, null);

      const invalid = await request('PUT', '/auth/profile', { token, body: { name: 'X' } });
      assert.equal(invalid.status, 422);
      assert.ok(invalid.body.errors.name);
    });
  });

  it('refuses a wrong current password and a weak new one', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(MANAGER);

      const wrong = await request('PUT', '/auth/password', {
        token,
        body: { currentPassword: 'nope', newPassword: 'Str0ngPass' },
      });
      assert.equal(wrong.status, 422);
      assert.deepEqual(wrong.body.errors.currentPassword, ['Current password is incorrect.']);

      const weak = await request('PUT', '/auth/password', {
        token,
        body: { currentPassword: MANAGER.password, newPassword: 'onlyletters' },
      });
      assert.equal(weak.status, 422);
      assert.ok(weak.body.errors.newPassword);
    });
  });

  it('refuses an avatar address longer than its 500-character column (QA-65)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);
      const address = (length) => `https://cdn.example.com/${'a'.repeat(length - 28)}.png`;

      const fits = await request('PUT', '/auth/profile', {
        token,
        body: { name: 'Sales User', phone: null, avatarUrl: address(500) },
      });
      assert.equal(fits.status, 200);
      assert.equal(fits.body.data.avatarUrl.length, 500);

      const long = await request('PUT', '/auth/profile', {
        token,
        body: { name: 'Sales User', phone: null, avatarUrl: address(501) },
      });
      assert.equal(long.status, 422);
      assert.deepEqual(long.body.errors.avatarUrl, [
        'The avatarUrl may not be greater than 500 characters.',
      ]);
    });
  });

  it('stops guessing the current password after five tries a minute, per account (QA-65)', async () => {
    await withServer(async ({ request, login }) => {
      const manager = await login(MANAGER);
      const guess = (token, attempt) =>
        request('PUT', '/auth/password', {
          token,
          body: { currentPassword: `guess-${attempt}`, newPassword: 'Str0ngPass' },
        });

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        assert.equal((await guess(manager, attempt)).status, 422, `attempt ${attempt}`);
      }
      const sixth = await guess(manager, 6);
      assert.equal(sixth.status, 429);
      assert.equal(
        sixth.body.message,
        'Too many attempts to change the password. Try again in a minute.'
      );
      assert.ok(Number(sixth.headers.get('retry-after')) > 0);

      // A second session of the same account shares the count …
      const again = await login(MANAGER);
      assert.equal((await guess(again, 7)).status, 429);
      // … and another account does not.
      const sales = await login(SALES);
      assert.equal((await guess(sales, 1)).status, 422);
    });
  });

  it('changes the password and revokes every other token of the user', async () => {
    await withServer(async ({ request, login }) => {
      const first = await login(MANAGER);
      const second = await login(MANAGER);

      const changed = await request('PUT', '/auth/password', {
        token: second,
        body: { currentPassword: MANAGER.password, newPassword: 'Str0ngPass' },
      });
      assert.equal(changed.status, 200);
      assert.deepEqual(changed.body, { data: null, message: 'Password updated.' });

      assert.equal((await request('GET', '/auth/profile', { token: first })).status, 401);
      assert.equal((await request('GET', '/auth/profile', { token: second })).status, 200);

      const again = await request('POST', '/auth/login', {
        body: { email: MANAGER.email, password: 'Str0ngPass' },
      });
      assert.equal(again.status, 200);
    });
  });
});

describe('POST /auth/logout', () => {
  it('revokes the token it was called with', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const response = await request('POST', '/auth/logout', { token });
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { data: null, message: 'Logged out.' });

      assert.equal((await request('GET', '/auth/profile', { token })).status, 401);
    });
  });
});

describe('the role matrix on /api/admin', () => {
  it('answers 401 without a token', async () => {
    await withServer(async ({ request }) => {
      assert.equal((await request('GET', '/admin/users')).status, 401);
      assert.equal((await request('GET', '/admin/properties')).status, 401);
      assert.equal((await request('GET', '/admin/dashboard')).status, 401);
    });
  });

  it('keeps sales out of the users resource and managers out of its writes', async () => {
    await withServer(async ({ request, login }) => {
      const sales = await login(SALES);
      const refused = await request('GET', '/admin/users', { token: sales });
      assert.equal(refused.status, 403);
      assert.equal(refused.body.message, 'You do not have permission to perform this action.');

      // A manager assigns leads, and naming a colleague means reading the
      // directory (`users.list`); managing the accounts stays admin-only.
      const manager = await login(MANAGER);
      assert.equal((await request('GET', '/admin/users', { token: manager })).status, 200);
      assert.equal((await request('GET', '/admin/users/3', { token: manager })).status, 200);
      assert.equal(
        (await request('POST', '/admin/users', { token: manager, body: { name: 'New' } })).status,
        403
      );
      assert.equal(
        (await request('PATCH', '/admin/users/3', { token: manager, body: { isActive: false } }))
          .status,
        403
      );
      assert.equal((await request('DELETE', '/admin/users/3', { token: manager })).status, 403);
    });
  });

  it('lets sales read properties but not write them', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);

      assert.equal((await request('GET', '/admin/properties', { token })).status, 200);
      assert.equal(
        (await request('POST', '/admin/properties', { token, body: { title: 'New' } })).status,
        403
      );
      assert.equal((await request('DELETE', '/admin/properties/1', { token })).status, 403);
      assert.equal((await request('GET', '/admin/localities', { token })).status, 403);
    });
  });

  it('denies an admin path that declares no permission', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      assert.equal((await request('GET', '/admin/apiTokens', { token })).status, 403);
      assert.equal((await request('GET', '/admin/adminUsers', { token })).status, 403);
    });
  });
});

describe('private collections', () => {
  it('are not reachable without the admin prefix', async () => {
    await withServer(async ({ request }) => {
      for (const collection of [
        'adminUsers',
        'apiTokens',
        'media',
        'leads',
        'jobApplications',
        'newsletterSubscribers',
        'propertyViews',
      ]) {
        const response = await request('GET', `/${collection}`);
        assert.equal(response.status, 404, `${collection} must not be public`);
      }
    });
  });
});

describe('/admin/users', () => {
  it('lists, filters, sorts and paginates without ever echoing a password', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const all = await request('GET', '/admin/users?perPage=all', { token });
      assert.equal(all.status, 200);
      assert.equal(all.body.data.length, 3);
      assert.deepEqual(all.body.meta, { page: 1, perPage: 3, total: 3, totalPages: 1 });
      assert.ok(
        !/"password"|Admin@123|Manager@123|Sales@123/i.test(all.text),
        'no password may appear in a response'
      );

      const filtered = await request('GET', '/admin/users?role=sales&isActive=true', { token });
      assert.equal(filtered.body.data.length, 1);
      assert.equal(filtered.body.data[0].role, 'sales');

      const searched = await request('GET', '/admin/users?q=manager', { token });
      assert.equal(searched.body.data.length, 1);

      const sorted = await request('GET', '/admin/users?sort=name&order=desc', { token });
      assert.deepEqual(
        sorted.body.data.map((user) => user.name),
        ['Sales User', 'Manager User', 'Admin User']
      );

      const paged = await request('GET', '/admin/users?page=2&perPage=2', { token });
      assert.equal(paged.body.data.length, 1);
      assert.deepEqual(paged.body.meta, { page: 2, perPage: 2, total: 3, totalPages: 2 });
    });
  });

  it('creates a user, rejects a duplicate e-mail with 409 and never returns the password', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const body = {
        name: 'Priya Editor',
        email: 'priya@squaresnacres.com',
        password: 'Editor@123',
        role: 'manager',
        phone: '9880000013',
      };

      const created = await request('POST', '/admin/users', { token, body });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.id, 4);
      assert.equal(created.body.data.password, undefined);
      assert.equal(created.body.data.isActive, true);
      assert.equal(created.body.data.lastLoginAt, null);

      const duplicate = await request('POST', '/admin/users', {
        token,
        body: { ...body, email: 'PRIYA@squaresnacres.com' },
      });
      assert.equal(duplicate.status, 409);
      assert.deepEqual(duplicate.body.errors.email, ['The email has already been taken.']);

      const invalid = await request('POST', '/admin/users', {
        token,
        body: { ...body, email: 'another@squaresnacres.com', password: 'short' },
      });
      assert.equal(invalid.status, 422);
      assert.ok(invalid.body.errors.password);

      const signedIn = await request('POST', '/auth/login', {
        body: { email: body.email, password: body.password },
      });
      assert.equal(signedIn.status, 200);
    });
  });

  it('keeps your own role on PUT and refuses to change it on PATCH', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const replaced = await request('PUT', '/admin/users/1', {
        token,
        body: {
          name: 'Admin User',
          email: ADMIN.email,
          role: 'sales',
          phone: '9880000010',
          avatarUrl: null,
          isActive: true,
        },
      });
      assert.equal(replaced.status, 200);
      assert.equal(replaced.body.data.role, 'admin');

      const patched = await request('PATCH', '/admin/users/1', { token, body: { role: 'sales' } });
      assert.equal(patched.status, 422);
      assert.deepEqual(patched.body.errors.role, ['You cannot change your own role.']);
    });
  });

  it('protects the last active admin against deactivation and delete', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const message = 'The last active admin cannot be deactivated, demoted or deleted.';

      const deactivated = await request('PATCH', '/admin/users/1', {
        token,
        body: { isActive: false },
      });
      assert.equal(deactivated.status, 422);
      assert.deepEqual(deactivated.body.errors.id, [message]);

      const deleted = await request('DELETE', '/admin/users/1', { token });
      assert.equal(deleted.status, 422);
      assert.deepEqual(deleted.body.errors.id, [message]);

      const replaced = await request('PUT', '/admin/users/1', {
        token,
        body: {
          name: 'Admin User',
          email: ADMIN.email,
          role: 'admin',
          phone: '9880000010',
          avatarUrl: null,
          isActive: false,
        },
      });
      assert.equal(replaced.status, 422);
      assert.deepEqual(replaced.body.errors.id, [message]);
    });
  });

  it('refuses to deactivate or delete yourself while another admin is active', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/users', {
        token,
        body: {
          name: 'Second Admin',
          email: 'second@squaresnacres.com',
          password: 'Second@123',
          role: 'admin',
        },
      });
      assert.equal(created.status, 201);

      const patched = await request('PATCH', '/admin/users/1', {
        token,
        body: { isActive: false },
      });
      assert.equal(patched.status, 422);
      assert.deepEqual(patched.body.errors.id, ['You cannot deactivate your own account.']);

      const deleted = await request('DELETE', '/admin/users/1', { token });
      assert.equal(deleted.status, 422);
      assert.deepEqual(deleted.body.errors.id, ['You cannot delete your own account.']);

      // The other admin is not the last one, so the same changes go through.
      const other = `/admin/users/${created.body.data.id}`;
      assert.equal(
        (await request('PATCH', other, { token, body: { role: 'manager' } })).status,
        200
      );
      assert.equal((await request('DELETE', other, { token })).status, 200);
    });
  });

  it('applies the same guards to a bulk action', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/users', {
        token,
        body: {
          name: 'Second Admin',
          email: 'second@squaresnacres.com',
          password: 'Second@123',
          role: 'admin',
        },
      });
      const id = created.body.data.id;

      const both = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [1, id], action: 'deactivate' },
      });
      assert.equal(both.status, 422);
      assert.ok(both.body.errors.id, 'deactivating every admin at once is refused');

      const others = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [id], action: 'deactivate' },
      });
      assert.equal(others.status, 200);
      assert.deepEqual(others.body, { data: { affected: 1 }, message: '1 user updated.' });

      // Only the account that was switched off is switched on: the manager was
      // active already, and is neither written nor counted (§5.8, QA-64).
      const reactivated = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [id, 2], action: 'activate' },
      });
      assert.deepEqual(reactivated.body, { data: { affected: 1 }, message: '1 user updated.' });

      const unsupported = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [id], action: 'feature' },
      });
      assert.equal(unsupported.status, 422);
      assert.ok(unsupported.body.errors.action);

      const removed = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [id], action: 'delete' },
      });
      assert.deepEqual(removed.body, { data: { affected: 1 }, message: '1 user deleted.' });
      assert.equal((await request('GET', `/admin/users/${id}`, { token })).status, 404);
    });
  });

  it('unassigns the leads of a deleted user and revokes their tokens', async () => {
    await withServer(async ({ request, login, db }) => {
      const adminToken = await login(ADMIN);
      const salesToken = await login(SALES);

      const lead = db.getCollection('leads')[0];
      lead.assignedTo = 3;
      db.write();

      const removed = await request('DELETE', '/admin/users/3', { token: adminToken });
      assert.equal(removed.status, 200);
      assert.deepEqual(removed.body, { data: null, message: 'Deleted' });

      const updated = db.getCollection('leads')[0];
      assert.equal(updated.assignedTo, null);
      const activity = updated.activities.at(-1);
      assert.equal(activity.type, 'assigned');
      assert.equal(activity.description, 'Unassigned (user deleted)');
      assert.equal(activity.createdBy, 1);

      assert.equal((await request('GET', '/auth/profile', { token: salesToken })).status, 401);
      assert.equal((await request('GET', '/admin/users/3', { token: adminToken })).status, 404);
    });
  });
});

describe('/admin/users — QA-64', () => {
  const WEAK = ['aaaaaaaa', '12345678', '        ', 'abcdefghij'];
  const RULE = 'The password must contain at least one letter and one digit.';

  it('refuses a password of letters only or digits only, as /auth/password does', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const base = { name: 'Weak Password', email: 'weak@squaresnacres.com', role: 'sales' };

      for (const password of WEAK) {
        const created = await request('POST', '/admin/users', {
          token,
          body: { ...base, password },
        });
        assert.equal(created.status, 422, `POST with ${JSON.stringify(password)}`);
        // Spaces alone are no password at all on a create ("…is required").
        assert.deepEqual(
          created.body.errors.password,
          password.trim() === '' ? ['The password field is required.'] : [RULE]
        );

        const reset = await request('PATCH', '/admin/users/3', { token, body: { password } });
        assert.equal(reset.status, 422, `PATCH with ${JSON.stringify(password)}`);
        assert.deepEqual(reset.body.errors.password, [RULE]);
      }

      const replaced = await request('PUT', '/admin/users/3', {
        token,
        body: {
          name: 'Sales User',
          email: SALES.email,
          role: 'sales',
          password: '12345678',
          isActive: true,
        },
      });
      assert.equal(replaced.status, 422);
      assert.deepEqual(replaced.body.errors.password, [RULE]);

      // A PUT that leaves the password out keeps it, as before.
      const kept = await request('PUT', '/admin/users/3', {
        token,
        body: { name: 'Sales User', email: SALES.email, role: 'sales', isActive: true },
      });
      assert.equal(kept.status, 200);
      assert.equal((await request('POST', '/auth/login', { body: SALES })).status, 200);

      assert.equal(
        (
          await request('POST', '/admin/users', {
            token,
            body: { ...base, password: 'Str0ngPass' },
          })
        ).status,
        201
      );
    });
  });

  it('signs the account out everywhere when an administrator sets its password', async () => {
    await withServer(async ({ request, login }) => {
      const adminToken = await login(ADMIN);
      const salesToken = await login(SALES);
      const salesPhone = await login(SALES);

      const reset = await request('PATCH', '/admin/users/3', {
        token: adminToken,
        body: { password: 'N3wSales!' },
      });
      assert.equal(reset.status, 200);

      assert.equal((await request('GET', '/auth/profile', { token: salesToken })).status, 401);
      assert.equal((await request('GET', '/auth/profile', { token: salesPhone })).status, 401);
      // The administrator who reset it is still signed in.
      assert.equal((await request('GET', '/auth/profile', { token: adminToken })).status, 200);
      assert.equal(
        (
          await request('POST', '/auth/login', {
            body: { email: SALES.email, password: 'N3wSales!' },
          })
        ).status,
        200
      );

      // The same through the edit form's PUT.
      const again = await login({ email: SALES.email, password: 'N3wSales!' });
      const replaced = await request('PUT', '/admin/users/3', {
        token: adminToken,
        body: {
          name: 'Sales User',
          email: SALES.email,
          role: 'sales',
          password: 'Th1rdOne',
          isActive: true,
        },
      });
      assert.equal(replaced.status, 200);
      assert.equal((await request('GET', '/auth/profile', { token: again })).status, 401);
    });
  });

  it('keeps the session an administrator resets their own password from, and ends the others', async () => {
    await withServer(async ({ request, login }) => {
      const here = await login(ADMIN);
      const elsewhere = await login(ADMIN);

      const reset = await request('PATCH', '/admin/users/1', {
        token: here,
        body: { password: 'Admin@456' },
      });
      assert.equal(reset.status, 200);

      assert.equal((await request('GET', '/auth/profile', { token: here })).status, 200);
      assert.equal((await request('GET', '/auth/profile', { token: elsewhere })).status, 401);
    });
  });

  it('does not count, or write, an account already in the state asked for', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);
      const before = db.getCollection('adminUsers').find((user) => user.id === 3).updatedAt;

      const unchanged = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [2, 3], action: 'activate' },
      });
      assert.equal(unchanged.status, 200);
      assert.equal(unchanged.body.data.affected, 0);
      assert.equal(db.getCollection('adminUsers').find((user) => user.id === 3).updatedAt, before);

      const once = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [3], action: 'deactivate' },
      });
      assert.deepEqual(once.body, { data: { affected: 1 }, message: '1 user updated.' });

      const twice = await request('POST', '/admin/users/bulk', {
        token,
        body: { ids: [3], action: 'deactivate' },
      });
      assert.equal(twice.body.data.affected, 0);
    });
  });
});

describe('MOCK_TOKEN_TTL_HOURS', () => {
  it('sets the expiry of a fresh token', async () => {
    await withServer({ tokenTtlHours: 0.01 }, async ({ request }) => {
      const response = await request('POST', '/auth/login', { body: ADMIN });
      const lifetimeMs = Date.parse(response.body.data.expiresAt) - Date.now();

      assert.ok(lifetimeMs > 30_000 && lifetimeMs <= 36_000, `36s expected, got ${lifetimeMs}ms`);
    });
  });
});
