import { renderHook, waitFor } from '@testing-library/react';

import seoService from '../../../../services/seoService';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS } from '../../../../services/http';
import { resetSeoCaches, useSiteSeoIndex } from '../useSiteSeoIndex';

jest.mock('../../../../services/seoService', () => ({
  __esModule: true,
  default: { overview: jest.fn(), settings: jest.fn() },
}));

/**
 * The site-wide rows three SEO tests compare against, which only admins and
 * managers may read (QA-62): a sales user opens a listing read-only, SEO tab
 * and all, and the refused request was a console error every time the tab
 * opened.
 */
describe('useSiteSeoIndex', () => {
  beforeEach(() => {
    resetSeoCaches();
    window.localStorage.clear();
    seoService.overview.mockResolvedValue({ data: [{ id: 1, entityType: 'property' }] });
  });

  const signIn = (role) => storage.setItem(AUTH_STORAGE_KEYS.user, { id: 3, role });

  it('does not ask for what the signed-in role may not read', async () => {
    signIn('sales');
    const { result } = renderHook(() => useSiteSeoIndex());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(seoService.overview).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
  });

  it('reads the rows for an editor', async () => {
    signIn('manager');
    const { result } = renderHook(() => useSiteSeoIndex());

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(seoService.overview).toHaveBeenCalledWith({ perPage: 'all' });
  });
});
