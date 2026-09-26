/**
 * Runs a Postman collection the way the Postman Runner does (prompt 51) — the
 * generator's own check, since newman is not a dependency of this repository.
 *
 * It executes the collection file itself, not a description of it: every
 * request in order, the collection's and each item's pre-request scripts, the
 * request with its variables resolved (the environment's enabled rows, then
 * the collection variables, then `{{$timestamp}}`), and the test scripts, in a
 * sandbox that offers the part of the `pm` API the generated scripts use —
 * `pm.test`, `pm.expect`, `pm.response`, `pm.environment`,
 * `pm.collectionVariables`, `pm.variables` and `pm.sendRequest`. A script
 * using anything else fails loudly, which is the point: what this runs green,
 * Postman runs green.
 */

const vm = require('vm');

/* ------------------------------------------------------------------ *
 * The assertions the generated scripts make
 * ------------------------------------------------------------------ */

class AssertionFailure extends Error {}

const describe = (value) => {
  try {
    return JSON.stringify(value)?.slice(0, 120) ?? String(value);
  } catch {
    return String(value);
  }
};

const typeOf = (value) => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/** The slice of chai's `expect` the collection uses. */
function expect(value, label = '') {
  const fail = (message) => {
    throw new AssertionFailure(`${label ? `${label}: ` : ''}${message}`);
  };
  const chain = (negated) => {
    const assert = (ok, message) => {
      if (negated ? ok : !ok) fail(negated ? `not ${message}` : message);
    };
    const be = {
      a: (type) => assert(typeOf(value) === type, `expected ${describe(value)} to be a ${type}`),
      an: (type) => assert(typeOf(value) === type, `expected ${describe(value)} to be an ${type}`),
      within: (low, high) =>
        assert(value >= low && value <= high, `expected ${value} to be within ${low}..${high}`),
    };
    return {
      eql: (other) =>
        assert(deepEqual(value, other), `expected ${describe(value)} to eql ${describe(other)}`),
      match: (pattern) =>
        assert(pattern.test(String(value)), `expected ${describe(value)} to match ${pattern}`),
      be,
      have: {
        property: (name, ...expected) => {
          const has = value !== null && typeof value === 'object' && name in value;
          assert(
            has && (expected.length === 0 || deepEqual(value[name], expected[0])),
            `expected ${describe(value)} to have property ${name}${expected.length ? ` = ${describe(expected[0])}` : ''}`
          );
        },
      },
    };
  };
  const positive = chain(false);
  return { to: { ...positive, not: chain(true) } };
}

/* ------------------------------------------------------------------ *
 * Variables
 * ------------------------------------------------------------------ */

/** The environment's values: of a key's rows, the last enabled one wins. */
function environmentValues(environment) {
  const values = {};
  for (const row of environment?.values ?? []) {
    if (row.enabled !== false) values[row.key] = row.value;
  }
  return values;
}

/* ------------------------------------------------------------------ *
 * The run
 * ------------------------------------------------------------------ */

/** Every request item of a collection, in the order the Runner takes them. */
function requestItems(items, trail = []) {
  return items.flatMap((item) =>
    item.item ? requestItems(item.item, [...trail, item.name]) : [{ item, trail }]
  );
}

/**
 * Runs a collection.
 *
 * @param {object} options
 * @param {object} options.collection a Postman v2.1 collection
 * @param {object} options.environment a Postman environment
 * @param {Record<string, string>} [options.overrides] environment values to set
 *   first — the `baseUrl` of the API under test
 * @returns {Promise<{requests: number, tests: number, failures: Array<{item: string, test: string, error: string}>}>}
 */
async function runCollection({ collection, environment, overrides = {} }) {
  const env = { ...environmentValues(environment), ...overrides };
  const collectionVars = Object.fromEntries(
    (collection.variable ?? []).map((row) => [row.key, row.value])
  );

  const lookup = (name) => {
    if (name in env && env[name] !== '') return env[name];
    if (name in collectionVars) return collectionVars[name];
    return env[name];
  };

  const replaceIn = (text) => {
    const stamp = String(Math.floor(Date.now() / 1000));
    return String(text).replace(/\{\{(\$?[A-Za-z0-9_]+)\}\}/g, (match, name) => {
      if (name === '$timestamp') return stamp;
      const value = lookup(name);
      return value === undefined || value === null ? match : String(value);
    });
  };

  const send = async ({ url, method, header = {}, body }) => {
    const response = await fetch(url, { method, headers: header, ...(body ? { body } : {}) });
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());
    return {
      code: response.status,
      text: () => text,
      json: () => JSON.parse(text),
      headers: response.headers,
    };
  };

  const failures = [];
  let tests = 0;

  /** Runs one script, and waits for every request it (and its callbacks) sent. */
  const runScript = async (lines, name, response) => {
    const pending = new Set();
    const record = (test, error) => failures.push({ item: name, test, error });

    const pm = {
      test: (testName, body) => {
        tests += 1;
        try {
          body();
        } catch (error) {
          record(testName, error.message);
        }
      },
      expect,
      environment: {
        get: (key) => env[key],
        set: (key, value) => {
          env[key] = value;
        },
      },
      collectionVariables: {
        get: (key) => collectionVars[key],
        set: (key, value) => {
          collectionVars[key] = value;
        },
      },
      variables: { get: lookup, replaceIn },
      response: response
        ? {
            code: response.code,
            text: response.text,
            json: response.json,
            to: {
              have: {
                status: (status) => expect(response.code, 'status').to.eql(status),
              },
            },
          }
        : undefined,
      sendRequest: (request, callback) => {
        const header = request.header ?? {};
        const body = request.body?.raw;
        const promise = send({ url: request.url, method: request.method, header, body })
          .then(
            (answer) => callback(null, answer),
            (error) => callback(error, null)
          )
          .catch((error) => record('a callback of pm.sendRequest', error.message))
          .finally(() => pending.delete(promise));
        pending.add(promise);
      },
    };

    try {
      vm.runInNewContext(
        lines.join('\n'),
        { pm, console, JSON, Number, String, Array, Math },
        {
          filename: `${name}.js`,
        }
      );
    } catch (error) {
      record('the script', error.message);
    }
    while (pending.size > 0) {
      // eslint-disable-next-line no-await-in-loop -- a callback may send the next request
      await Promise.all([...pending]);
    }
  };

  const collectionScripts = (listen) =>
    (collection.event ?? []).filter((event) => event.listen === listen);

  const items = requestItems(collection.item ?? []);
  for (const { item, trail } of items) {
    const name = [...trail, item.name].join(' › ');
    const scripts = (listen) => [
      ...collectionScripts(listen),
      ...(item.event ?? []).filter((event) => event.listen === listen),
    ];

    for (const event of scripts('prerequest')) {
      // eslint-disable-next-line no-await-in-loop -- a run is a sequence
      await runScript(event.script.exec, name);
    }

    const { request } = item;
    const auth = request.auth ?? collection.auth;
    const header = Object.fromEntries(
      (request.header ?? []).map((entry) => [entry.key, replaceIn(entry.value)])
    );
    if (auth?.type === 'bearer') {
      const token = replaceIn(auth.bearer.find((entry) => entry.key === 'token')?.value ?? '');
      if (token) header.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      // eslint-disable-next-line no-await-in-loop -- a run is a sequence
      response = await send({
        url: replaceIn(request.url.raw),
        method: request.method,
        header,
        body: request.body?.raw !== undefined ? replaceIn(request.body.raw) : undefined,
      });
    } catch (error) {
      failures.push({ item: name, test: 'the request', error: error.message });
      continue;
    }

    for (const event of scripts('test')) {
      // eslint-disable-next-line no-await-in-loop -- a run is a sequence
      await runScript(event.script.exec, name, response);
    }
  }

  return { requests: items.length, tests, failures };
}

module.exports = { expect, runCollection };
