/*
 * `@testing-library/user-event` is pinned at 13.5 (§3.1), which — unlike v14 —
 * does not wrap its own interactions in `act`. The wrappers below are what keep
 * the state updates that follow a click inside the click's `act` scope, so the
 * rule that assumes v14 is switched off for this file rather than the tests
 * being rewritten around a version this project does not use.
 */
/* eslint-disable testing-library/no-unnecessary-act */
/**
 * The redirects screen's validation (prompt 37 §4.7).
 *
 * Four rules keep the table from looping a browser, and the API owns all four
 * (§4.12 of prompt 09). Two of them are worth catching before the request —
 * a path that is not a path, and a rule pointing at itself — and the other two
 * can only be answered by the server, which means the dialog's job is to put
 * the server's message on the field it belongs to rather than in a toast
 * nobody can act on.
 */

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import redirectService from '../../../../services/redirectService';
import renderWith from '../../../../test-utils';
import {
  RedirectFormDialog,
  RedirectPath,
  pathSegments,
  validateRedirectValues,
} from '../RedirectsPage';

jest.mock('../../../../services/redirectService', () => ({
  __esModule: true,
  default: { create: jest.fn(), update: jest.fn() },
}));

const click = (element) =>
  act(async () => {
    await userEvent.click(element);
  });

const type = (element, text) =>
  act(async () => {
    await userEvent.clear(element);
    await userEvent.type(element, text);
  });

const BLANK = { fromPath: '', toPath: '', statusCode: 301, isActive: true, note: '' };

beforeEach(() => {
  jest.clearAllMocks();
  redirectService.create.mockResolvedValue({ data: { id: 1 } });
  redirectService.update.mockResolvedValue({ data: { id: 1 } });
});

describe('validateRedirectValues', () => {
  it('accepts a path-to-path rule', () => {
    expect(validateRedirectValues({ fromPath: '/old', toPath: '/new' })).toEqual({});
  });

  it('accepts an absolute target', () => {
    expect(validateRedirectValues({ fromPath: '/old', toPath: 'https://example.com/new' })).toEqual(
      {}
    );
  });

  it('refuses a from path that is not a path', () => {
    expect(validateRedirectValues({ fromPath: 'old', toPath: '/new' })).toHaveProperty('fromPath');
  });

  it('refuses a target that is neither a path nor an address', () => {
    expect(validateRedirectValues({ fromPath: '/old', toPath: 'new' })).toHaveProperty('toPath');
  });

  it('refuses a rule that points at itself, trailing slash and all', () => {
    expect(validateRedirectValues({ fromPath: '/old', toPath: '/old/' })).toHaveProperty('toPath');
  });

  it('says nothing about a half-typed rule', () => {
    expect(validateRedirectValues({ fromPath: '', toPath: '' })).toEqual({});
  });
});

// The table's paths wrap after a slash or a hyphen, never inside a word: at
// 1280 px `overflow-wrap: anywhere` had split `/flats-in-whitefield` into
// "/flats- / in- / whitefiel / d".
describe('a path in the table', () => {
  it('splits after each slash or hyphen that has more of the path behind it', () => {
    expect(pathSegments('/flats-in-whitefield')).toEqual(['/flats-', 'in-', 'whitefield']);
    expect(pathSegments('/insights/articles')).toEqual(['/insights/', 'articles']);
    expect(pathSegments('/blog')).toEqual(['/blog']);
    expect(pathSegments('/old/')).toEqual(['/old/']);
  });

  it('never breaks after the leading slash, or inside the // of an address', () => {
    expect(pathSegments('/')).toEqual(['/']);
    expect(pathSegments('https://example.com/new-page')).toEqual([
      'https://',
      'example.com/',
      'new-',
      'page',
    ]);
  });

  it('gives back exactly the path it was given', () => {
    ['/flats-in-whitefield', 'https://example.com/a/b-c', '/', ''].forEach((path) =>
      expect(pathSegments(path).join('')).toBe(path)
    );
    expect(pathSegments(null)).toEqual([]);
  });

  it('marks the breaks with <wbr>, so the text a reader copies is the path', () => {
    renderWith(<RedirectPath path="/flats-in-whitefield" />);

    const code = screen.getByText('/flats-in-whitefield');
    expect(code).toHaveTextContent(/^\/flats-in-whitefield$/);
    expect(code).toContainHTML('/flats-<wbr>in-<wbr>whitefield');
  });
});

describe('the create dialog', () => {
  it('will not send a rule the API would refuse', async () => {
    renderWith(<RedirectFormDialog record={BLANK} onClose={jest.fn()} onSaved={jest.fn()} />);

    await type(screen.getByLabelText(/^From/), 'old-properties');
    await type(screen.getByLabelText(/^To/), '/properties');
    await click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText(/start with “\/”/i)).toBeInTheDocument();
    expect(redirectService.create).not.toHaveBeenCalled();
  });

  it('sends a valid rule and reports it upwards', async () => {
    const onSaved = jest.fn();
    renderWith(<RedirectFormDialog record={BLANK} onClose={jest.fn()} onSaved={onSaved} />);

    await type(screen.getByLabelText(/^From/), '/old-properties');
    await type(screen.getByLabelText(/^To/), '/properties');
    await click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(redirectService.create).toHaveBeenCalledTimes(1));
    expect(redirectService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fromPath: '/old-properties',
        toPath: '/properties',
        statusCode: 301,
        isActive: true,
        note: null,
      })
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('puts a duplicate-path 422 on the field it belongs to', async () => {
    redirectService.create.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { fromPath: ['A redirect for this path already exists.'] },
      })
    );

    renderWith(<RedirectFormDialog record={BLANK} onClose={jest.fn()} onSaved={jest.fn()} />);

    await type(screen.getByLabelText(/^From/), '/old-properties');
    await type(screen.getByLabelText(/^To/), '/properties');
    await click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('A redirect for this path already exists.')).toBeInTheDocument();
  });

  it('puts a redirect-chain 422 on the target field', async () => {
    redirectService.create.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { toPath: ['This target is itself redirected to /properties.'] },
      })
    );

    renderWith(<RedirectFormDialog record={BLANK} onClose={jest.fn()} onSaved={jest.fn()} />);

    await type(screen.getByLabelText(/^From/), '/old-properties');
    await type(screen.getByLabelText(/^To/), '/retired');
    await click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('This target is itself redirected to /properties.')
    ).toBeInTheDocument();
  });

  it('updates rather than creates when it was opened on a stored rule', async () => {
    const record = {
      id: 7,
      fromPath: '/blog',
      toPath: '/insights/articles',
      statusCode: 301,
      isActive: true,
      note: 'Renamed section',
    };

    renderWith(<RedirectFormDialog record={record} onClose={jest.fn()} onSaved={jest.fn()} />);

    expect(screen.getByLabelText(/^From/)).toHaveValue('/blog');
    await click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(redirectService.update).toHaveBeenCalledTimes(1));
    expect(redirectService.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ fromPath: '/blog', note: 'Renamed section' })
    );
    expect(redirectService.create).not.toHaveBeenCalled();
  });
});
