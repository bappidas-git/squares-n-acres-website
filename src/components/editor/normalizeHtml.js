/**
 * The tidy-up that runs between the editor and the sanitiser.
 *
 * ProseMirror always keeps one paragraph at the end of a document so there is
 * somewhere to put the cursor, and a writer pressing Return to "make space"
 * leaves more. None of that is content: stored, it becomes a stack of empty
 * bands under an article and a `description` that looks unsaved because it ends
 * in blank lines. This trims the tail and collapses the runs in the middle,
 * without touching a deliberate blank line between two paragraphs.
 *
 * It is a string transform rather than a DOM walk so the same rules apply in
 * the browser, in Jest and in any Node script that ever needs them.
 */

/** A paragraph holding nothing a reader can see. */
const EMPTY_PARAGRAPH = '<p(?:\\s[^>]*)?>(?:\\s|&nbsp;|&#160;|<br\\s*/?>)*</p>';

const TRAILING = new RegExp(`(?:${EMPTY_PARAGRAPH})+\\s*$`, 'gi');
const LEADING = new RegExp(`^\\s*(?:${EMPTY_PARAGRAPH})+`, 'gi');
const RUN = new RegExp(`(?:${EMPTY_PARAGRAPH}\\s*){2,}`, 'gi');

/**
 * @param {string} html
 * @returns {string} `''` when nothing but empty paragraphs is left
 */
export function normalizeHtml(html) {
  if (html === null || html === undefined) return '';

  const collapsed = String(html)
    .replace(RUN, '<p></p>')
    .replace(LEADING, '')
    .replace(TRAILING, '')
    .trim();

  return collapsed;
}

export default normalizeHtml;
