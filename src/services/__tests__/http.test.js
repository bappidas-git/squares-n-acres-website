/**
 * `http.js` — URL building, error mapping and the scoped 401 (§5.1–§5.4).
 *
 * The axios instance is stubbed at `client.request`, so these tests exercise
 * the module's own logic rather than the network: what URL and params a
 * registry entry produces, what an ApiError looks like for each failure mode,
 * and which calls sign the session out.
 */

import ApiError from '../apiError';
import http, { buildUrl, client, onUnauthorized, setAuthToken, toApiError } from '../http';
import { endpoints } from '../endpoints';

const respond = (data = { data: null }) => Promise.resolve({ data, status: 200 });

const httpError = (status, data) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data };
  error.config = { url: '/x' };
  return error;
};

describe('http.request', () => {
  let request;

  beforeEach(() => {
    request = jest.spyOn(client, 'request').mockImplementation(() => respond());
  });

  afterEach(() => {
    request.mockRestore();
    setAuthToken(null);
  });

  it('fills path parameters and URL-encodes them', async () => {
    await http.request(endpoints.properties.bySlug, { pathParams: { slug: 'a b/c' } });
    expect(request.mock.calls[0][0].url).toBe('/properties/slug/a%20b%2Fc');
  });

  it('throws when a path parameter is missing', async () => {
    await expect(http.request(endpoints.properties.bySlug, {})).rejects.toThrow(
      /missing path parameter "slug"/
    );
  });

  it('keeps only the query keys the endpoint declares', async () => {
    await http.request(endpoints.properties.list, {
      params: { page: 2, nonsense: 'drop me', q: '' },
    });
    expect(request.mock.calls[0][0].params).toEqual({ page: '2' });
  });

  it('serialises arrays as csv and booleans as true/false', async () => {
    await http.request(endpoints.properties.list, {
      params: { bedrooms: [2, 3], isFeatured: true, amenityIds: [] },
    });
    expect(request.mock.calls[0][0].params).toEqual({ bedrooms: '2,3', isFeatured: 'true' });
  });

  it('returns the envelope untouched', async () => {
    request.mockImplementation(() => respond({ data: [{ id: 1 }], meta: { total: 1 } }));
    const envelope = await http.request(endpoints.properties.list, {});
    expect(envelope).toEqual({ data: [{ id: 1 }], meta: { total: 1 } });
  });

  it('sends a body only for the methods that carry one', async () => {
    await http.request(endpoints.leads.create, { body: { name: 'A' } });
    expect(request.mock.calls[0][0].data).toEqual({ name: 'A' });

    await http.request(endpoints.properties.list, { body: { name: 'A' } });
    expect(request.mock.calls[1][0].data).toBeUndefined();
  });

  it('refuses anything that is not a registry entry', async () => {
    await expect(http.request('properties')).rejects.toThrow(/entry of services\/endpoints/);
    await expect(http.request({ method: 'GET' })).rejects.toThrow(/entry of services\/endpoints/);
  });

  it('refuses a registry entry with an unsupported method', async () => {
    await expect(
      http.request({ ...endpoints.properties.list, method: 'TRACE', key: 'x.y' })
    ).rejects.toThrow(/unsupported method/);
  });
});

describe('buildUrl', () => {
  it('produces an absolute URL with the query string', () => {
    const url = buildUrl(endpoints.properties.list, {}, { page: 2, bedrooms: [2, 3] });
    expect(url).toBe(`${process.env.REACT_APP_API_URL}/properties?page=2&bedrooms=2%2C3`);
  });

  it('omits the question mark when there is no query', () => {
    expect(buildUrl(endpoints.settings.get)).toBe(`${process.env.REACT_APP_API_URL}/settings`);
  });
});

describe('toApiError', () => {
  it('maps a 422 envelope onto field errors', () => {
    const error = toApiError(
      httpError(422, { message: 'The given data was invalid.', errors: { email: ['Required'] } })
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.isValidation).toBe(true);
    expect(error.fieldError('email')).toBe('Required');
  });

  it('maps a dropped connection onto a readable message', () => {
    const error = toApiError({ message: 'Network Error', code: 'ERR_NETWORK' });
    expect(error.isNetworkError).toBe(true);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/Unable to reach the server/);
  });

  it('marks a timeout as both network error and timeout', () => {
    const error = toApiError({ message: 'timeout', code: 'ECONNABORTED' });
    expect(error.isTimeout).toBe(true);
    expect(error.isNetworkError).toBe(true);
  });

  it('marks a cancellation so callers can ignore it', () => {
    const canceled = new Error('canceled');
    canceled.name = 'CanceledError';
    expect(toApiError(canceled).isCanceled).toBe(true);
  });
});

describe('401 handling', () => {
  let restore;
  let onSessionEnd;

  beforeEach(() => {
    onSessionEnd = jest.fn();
    restore = onUnauthorized(onSessionEnd);
  });

  afterEach(() => restore());

  /** Drives the response interceptor the way axios would. */
  const reject = (url) => {
    const handler = client.interceptors.response.handlers.find((entry) => entry?.rejected);
    const error = httpError(401, { message: 'Unauthenticated.' });
    error.config = { url };
    return handler.rejected(error).catch((thrown) => thrown);
  };

  it('signs the session out on an admin call', async () => {
    await reject('/admin/properties?page=1');
    expect(onSessionEnd).toHaveBeenCalledTimes(1);
  });

  it('leaves a public call alone', async () => {
    await reject('/properties?page=1');
    expect(onSessionEnd).not.toHaveBeenCalled();
  });

  it('leaves the login call alone, so a wrong password is just an error', async () => {
    const error = await reject('/auth/login');
    expect(onSessionEnd).not.toHaveBeenCalled();
    expect(error.status).toBe(401);
  });

  it('signs the session out when the profile call expires', async () => {
    await reject('/auth/profile');
    expect(onSessionEnd).toHaveBeenCalledTimes(1);
  });
});

describe('setAuthToken', () => {
  afterEach(() => setAuthToken(null));

  it('puts the bearer token on the request', () => {
    setAuthToken('token-123');
    const handler = client.interceptors.request.handlers.find((entry) => entry?.fulfilled);
    const config = handler.fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('sends no Authorization header when there is no session', () => {
    setAuthToken(null);
    const handler = client.interceptors.request.handlers.find((entry) => entry?.fulfilled);
    const config = handler.fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
