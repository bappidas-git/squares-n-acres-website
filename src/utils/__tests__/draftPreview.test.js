/**
 * "Preview changes" hands a form to its public page through this browser's
 * storage, once (prompt 51).
 */

import {
  DRAFT_PREVIEW_PREFIX,
  resetDraftPreviews,
  stashDraftPreview,
  takeDraftPreview,
} from '../draftPreview';

beforeEach(() => {
  window.localStorage.clear();
  resetDraftPreviews();
});

describe('draftPreview', () => {
  it('keeps a record under sna-draft-preview-<id> and gives it back once', () => {
    const id = stashDraftPreview('article', { title: 'Khata transfer, revised' });
    expect(window.localStorage.getItem(`${DRAFT_PREVIEW_PREFIX}${id}`)).not.toBeNull();

    expect(takeDraftPreview(id, 'article')).toEqual({ title: 'Khata transfer, revised' });
    // Spent: the key is gone as it is read…
    expect(window.localStorage.getItem(`${DRAFT_PREVIEW_PREFIX}${id}`)).toBeNull();
    // …the same page load still sees what it took (a second render)…
    expect(takeDraftPreview(id, 'article')).toEqual({ title: 'Khata transfer, revised' });
    // …and a new page load — a second opening — finds nothing.
    resetDraftPreviews();
    expect(takeDraftPreview(id, 'article')).toBeNull();
  });

  it('gives a page nothing that was kept for an article', () => {
    const id = stashDraftPreview('article', { title: 'x' });
    expect(takeDraftPreview(id, 'page')).toBeNull();
  });

  it('drops a hand-off nobody opened within the hour', () => {
    window.localStorage.setItem(
      `${DRAFT_PREVIEW_PREFIX}old`,
      JSON.stringify({ type: 'page', record: {}, savedAt: '2020-01-01T00:00:00.000Z' })
    );
    stashDraftPreview('page', { title: 'new' });
    expect(window.localStorage.getItem(`${DRAFT_PREVIEW_PREFIX}old`)).toBeNull();
  });
});
