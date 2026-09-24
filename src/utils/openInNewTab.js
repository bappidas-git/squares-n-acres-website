/**
 * Opens an address in a new tab and says whether the browser let it.
 *
 * Deliberately **without** the `noopener` window feature: with it,
 * `window.open` returns `null` by specification whether or not the tab
 * opened, so a caller that treats `null` as "the pop-up was blocked" took that
 * branch every time. The article list's and the article form's Preview did —
 * each opened the preview in a new tab and then dragged the editor's own tab
 * to it as well (QA-55; the property form's "Save and view" had the same
 * defect in QA-51). The opener is cut by hand instead, which is what
 * `noopener` would have done.
 *
 *   if (!openInNewTab(path)) navigate(path);
 *
 * @param {string} url
 * @returns {boolean} `false` only when the browser refused the new tab
 */
export default function openInNewTab(url) {
  if (typeof window === 'undefined' || !url) return false;
  const opened = window.open(url, '_blank');
  if (!opened) return false;
  opened.opener = null;
  return true;
}
