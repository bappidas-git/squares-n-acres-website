/**
 * Saving an authenticated file (D46), when the endpoint fails (QA-61).
 *
 * Asked for a blob, the HTTP client hands the API's JSON error over as a blob
 * too, and a failed export toasted the client's own words — "Request failed
 * with status code 500" — instead of the API's.
 */

import ApiError from '../../services/apiError';
import http from '../../services/http';
import { downloadAuthenticated } from '../download';

jest.mock('../../services/http', () => ({ __esModule: true, default: { request: jest.fn() } }));

const ENDPOINT = { key: 'test.export', method: 'GET', path: '/admin/test/export' };

/** What `http.request` throws for a failed blob request. */
const blobFailure = (status, text) =>
  new ApiError({
    status,
    message: `Request failed with status code ${status}`,
    original: { response: { status, data: new Blob([text], { type: 'application/json' }) } },
  });

describe('downloadAuthenticated (QA-61)', () => {
  it('reads the API’s message out of a blob body', async () => {
    http.request.mockRejectedValue(
      blobFailure(500, JSON.stringify({ message: 'The export service is down.' }))
    );

    await expect(downloadAuthenticated(ENDPOINT, {}, 'x.csv')).rejects.toMatchObject({
      status: 500,
      message: 'The export service is down.',
    });
  });

  it('keeps a 422’s field messages', async () => {
    http.request.mockRejectedValue(
      blobFailure(
        422,
        JSON.stringify({ message: 'The given data was invalid.', errors: { status: ['Bad.'] } })
      )
    );

    await expect(downloadAuthenticated(ENDPOINT, {}, 'x.csv')).rejects.toMatchObject({
      status: 422,
      errors: { status: ['Bad.'] },
    });
  });

  it('leaves the caller’s own sentence to stand when the body is not JSON', async () => {
    http.request.mockRejectedValue(blobFailure(502, '<html>Bad gateway</html>'));

    await expect(downloadAuthenticated(ENDPOINT, {}, 'x.csv')).rejects.toMatchObject({
      status: 502,
      message: '',
    });
  });

  it('hands a failure with no body back as it came', async () => {
    const offline = new ApiError({ status: 0, message: 'Unable to reach the server.' });
    http.request.mockRejectedValue(offline);

    await expect(downloadAuthenticated(ENDPOINT, {}, 'x.csv')).rejects.toBe(offline);
  });
});
