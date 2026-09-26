/**
 * `usePropertyForm` — what a save does when the listing moved under it (QA-62).
 *
 * The form sends the version it read; a save made over somebody else's is
 * refused and answered with a choice rather than written; a listing deleted
 * elsewhere keeps the work on screen; a session that ends keeps it as a draft;
 * and "Discard changes" forgets the draft it would otherwise offer back.
 *
 * The record is the seed's first listing, read from `db.json`, so the saves
 * below are of a listing every publish rule is already happy with.
 */

import fs from 'fs';
import path from 'path';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ApiError from '../../../../../services/apiError';
import ToastProvider from '../../../../../components/common/ToastProvider';
import propertyService from '../../../../../services/propertyService';
import redirectService from '../../../../../services/redirectService';
import storage from '../../../../../utils/storage';
import usePropertyForm, { draftKey } from '../usePropertyForm';
import { SITE } from '../../../../../config/site';
import { applySeoSideEffects } from '../../../../../components/seo/seoSideEffects';

jest.mock('../../../../../services/propertyService', () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
    create: jest.fn(),
    adminGet: jest.fn(),
    checkSlug: jest.fn(),
    previewToken: jest.fn(),
  },
}));

jest.mock('../../../../../services/redirectService', () => ({
  __esModule: true,
  default: { deactivateByFromPath: jest.fn(), upsertByFromPath: jest.fn() },
}));

jest.mock('../../../../../components/seo/seoSideEffects', () => ({
  ...jest.requireActual('../../../../../components/seo/seoSideEffects'),
  applySeoSideEffects: jest.fn(() => Promise.resolve()),
}));

const SEED = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'db.json'), 'utf8')
);
const RECORD = SEED.properties.find((property) => property.id === 1);

const wrapper = ({ children }) => (
  <MemoryRouter>
    <ToastProvider>{children}</ToastProvider>
  </MemoryRouter>
);

const renderForm = (record = RECORD) =>
  renderHook(() => usePropertyForm({ propertyId: String(record.id), record }), { wrapper });

/** Waits for the record to become the form, then types into the project name. */
async function editProjectName(result, value = 'Lakeview Heights Phase II') {
  await waitFor(() => expect(result.current.values.title).toBe(RECORD.title));
  act(() => result.current.setField('projectName', value));
  expect(result.current.dirty).toBe(true);
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

describe('usePropertyForm — a live listing that moves (prompt 51)', () => {
  const moveTo = async (result, slug) => {
    await waitFor(() => expect(result.current.values.title).toBe(RECORD.title));
    act(() => result.current.setFields({ slug, 'seo.slug': slug }));
  };

  beforeEach(() => {
    // CRA resets every mock between tests: the side effects answer as they do.
    applySeoSideEffects.mockResolvedValue({ ok: true, error: null });
  });

  it('leaves a 301 from the old address, on by default', async () => {
    redirectService.deactivateByFromPath.mockResolvedValue({ data: null });
    redirectService.upsertByFromPath.mockResolvedValue({ data: {} });
    propertyService.update.mockResolvedValue({
      data: { ...RECORD, slug: 'lakeview-heights-renamed', updatedAt: 'v2' },
    });
    const { result } = renderHook(
      () => usePropertyForm({ propertyId: '1', record: RECORD, canRedirect: true }),
      { wrapper }
    );
    await moveTo(result, 'lakeview-heights-renamed');

    expect(result.current.slugMove).toEqual(
      expect.objectContaining({
        moved: true,
        livePath: `/properties/${RECORD.slug}`,
        redirect: true,
      })
    );
    await act(() => result.current.save('save'));

    expect(redirectService.upsertByFromPath).toHaveBeenCalledWith(
      expect.objectContaining({
        fromPath: `/properties/${RECORD.slug}`,
        toPath: '/properties/lakeview-heights-renamed',
        statusCode: 301,
      })
    );
  });

  it('writes none when the switch is off, or the editor may not write redirects', async () => {
    propertyService.update.mockResolvedValue({
      data: { ...RECORD, slug: 'lakeview-heights-renamed', updatedAt: 'v2' },
    });
    const { result } = renderHook(
      () => usePropertyForm({ propertyId: '1', record: RECORD, canRedirect: true }),
      { wrapper }
    );
    await moveTo(result, 'lakeview-heights-renamed');
    act(() => result.current.slugMove.setRedirect(false));
    await act(() => result.current.save('save'));
    expect(redirectService.upsertByFromPath).not.toHaveBeenCalled();

    const { result: withoutSeo } = renderHook(
      () => usePropertyForm({ propertyId: '1', record: RECORD }),
      { wrapper }
    );
    await moveTo(withoutSeo, 'lakeview-heights-renamed');
    await act(() => withoutSeo.current.save('save'));
    expect(redirectService.upsertByFromPath).not.toHaveBeenCalled();
  });
});

describe('usePropertyForm — the share link (prompt 51)', () => {
  it('builds a 24-hour link to the saved listing on this site’s own address', async () => {
    propertyService.previewToken.mockResolvedValue({
      data: { token: 'tok 1', expiresAt: '2026-09-27T06:00:00.000Z', url: 'https://elsewhere' },
    });
    const { result } = renderForm();
    await waitFor(() => expect(result.current.values.title).toBe(RECORD.title));

    let link = null;
    await act(async () => {
      link = await result.current.shareLink();
    });

    expect(propertyService.previewToken).toHaveBeenCalledWith('1');
    expect(link).toEqual({
      url: `${SITE.url}/properties/${RECORD.slug}?preview=tok%201`,
      expiresAt: '2026-09-27T06:00:00.000Z',
    });
  });
});

describe('usePropertyForm — the version check (QA-62)', () => {
  it('sends the version it read with every replace, and the one it saved after that', async () => {
    const saved = { ...RECORD, projectName: 'Lakeview Heights Phase II', updatedAt: 'v2' };
    propertyService.update.mockResolvedValue({ data: saved });
    const { result } = renderForm();
    await editProjectName(result);

    await act(() => result.current.save('save'));
    expect(propertyService.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ updatedAt: RECORD.updatedAt, projectName: saved.projectName })
    );

    act(() => result.current.setField('projectName', 'Lakeview Heights Phase III'));
    await act(() => result.current.save('save'));
    expect(propertyService.update).toHaveBeenLastCalledWith(
      '1',
      expect.objectContaining({ updatedAt: 'v2' })
    );
  });

  it('answers a refused replace with the conflict, not a toast or a write', async () => {
    propertyService.update.mockRejectedValue(
      new ApiError({
        status: 409,
        message: 'Admin User saved this listing after you opened it.',
        data: {
          conflict: 'stale',
          current: { updatedAt: 'v9', updatedBy: { id: 1, name: 'Admin User' } },
        },
      })
    );
    const { result } = renderForm();
    await editProjectName(result);

    await act(() => result.current.save('save'));

    expect(result.current.conflict).toEqual(
      expect.objectContaining({ updatedAt: 'v9', updatedBy: { id: 1, name: 'Admin User' } })
    );
    expect(result.current.dirty).toBe(true);

    // "Save mine anyway" replaces over the version the refusal named.
    propertyService.update.mockResolvedValue({ data: { ...RECORD, updatedAt: 'v10' } });
    await act(() => result.current.overwriteConflict());
    expect(propertyService.update).toHaveBeenLastCalledWith(
      '1',
      expect.objectContaining({ updatedAt: 'v9' })
    );
    expect(result.current.conflict).toBeNull();
  });

  it('loads their version and keeps this editor’s own edits, on top of it, as the draft', async () => {
    propertyService.update.mockRejectedValue(
      new ApiError({
        status: 409,
        message: 'Saved by somebody else.',
        data: { conflict: 'stale', current: { updatedAt: 'v9', updatedBy: null } },
      })
    );
    const theirs = { ...RECORD, title: `${RECORD.title} (theirs)`, updatedAt: 'v9' };
    propertyService.adminGet.mockResolvedValue({ data: theirs });
    const { result } = renderForm();
    await editProjectName(result, 'Mine');
    await act(() => result.current.save('save'));

    await act(() => result.current.reloadConflict());

    expect(result.current.values.title).toBe(theirs.title);
    expect(result.current.values.projectName).toBe(RECORD.projectName);
    expect(result.current.conflict).toBeNull();

    // The banner offers this editor's edit back — on their title, not the old one.
    const offer = result.current.draftOffer;
    expect(offer.values.projectName).toBe('Mine');
    expect(offer.values.title).toBe(theirs.title);
    expect(offer.version).toBe('v9');
    expect(storage.getItem(draftKey('1'))?.values.projectName).toBe('Mine');
  });
});

describe('usePropertyForm — the listing or the session gone (QA-62)', () => {
  it('keeps the work when the listing was deleted elsewhere, and saves it as a new one', async () => {
    propertyService.update.mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }));
    const { result } = renderForm();
    await editProjectName(result, 'Kept');

    await act(() => result.current.save('save'));
    expect(result.current.gone).toBe(true);

    propertyService.create.mockResolvedValue({ data: { ...RECORD, id: 77, projectName: 'Kept' } });
    await act(() => result.current.saveAsNew());

    expect(propertyService.create).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: 'Kept', slug: RECORD.slug })
    );
    expect(result.current.gone).toBe(false);
  });

  it('takes a free address when the old one has been taken since', async () => {
    propertyService.update.mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }));
    propertyService.create
      .mockRejectedValueOnce(
        new ApiError({ status: 409, message: 'The slug has already been taken.' })
      )
      .mockResolvedValueOnce({ data: { ...RECORD, id: 78 } });
    const { result } = renderForm();
    await editProjectName(result);
    await act(() => result.current.save('save'));

    await act(() => result.current.saveAsNew());

    expect(propertyService.create).toHaveBeenLastCalledWith(expect.objectContaining({ slug: '' }));
  });

  it('keeps the work as a draft when the session ends, and says nothing of its own', async () => {
    propertyService.update.mockRejectedValue(
      new ApiError({ status: 401, message: 'Unauthenticated.' })
    );
    const { result } = renderForm();
    await editProjectName(result, 'Typed before the session ended');

    await act(() => result.current.save('save'));

    const draft = storage.getItem(draftKey('1'));
    expect(draft.values.projectName).toBe('Typed before the session ended');
    expect(draft.version).toBe(RECORD.updatedAt);
  });

  it('keeps a dirty form as a draft when it goes away without a "discard"', async () => {
    const { result, unmount } = renderForm();
    await editProjectName(result, 'Left without discarding');

    unmount();

    expect(storage.getItem(draftKey('1'))?.values.projectName).toBe('Left without discarding');
  });
});
