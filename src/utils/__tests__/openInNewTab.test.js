import openInNewTab from '../openInNewTab';

/**
 * `window.open(url, '_blank', 'noopener')` answers `null` whether or not the
 * tab opened, so "blocked" could not be told from "opened" and every preview
 * also took the editor's own tab to the public page (QA-55).
 */
describe('openInNewTab', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the address in a new tab, cuts the opener and says it did', () => {
    const tab = { opener: window };
    const open = jest.spyOn(window, 'open').mockImplementation(() => tab);

    expect(openInNewTab('/insights/articles/khata?preview=tok')).toBe(true);
    expect(open).toHaveBeenCalledWith('/insights/articles/khata?preview=tok', '_blank');
    // Not asked with `noopener`, which is what made the answer useless.
    expect(open.mock.calls[0]).toHaveLength(2);
    expect(tab.opener).toBeNull();
  });

  it('says so when the browser refuses the tab', () => {
    jest.spyOn(window, 'open').mockImplementation(() => null);
    expect(openInNewTab('/insights/articles/khata')).toBe(false);
  });

  it('opens nothing for an empty address', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => ({}));
    expect(openInNewTab('')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
