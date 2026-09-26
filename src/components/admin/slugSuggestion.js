import ApiError from '../../services/apiError';

/**
 * The 409 of a duplicate slug, with the free variant to take (§5.9).
 *
 * The API answers `{ message, errors: { slug } }` but no suggestion, and the
 * suggestion is the useful half — so it is fetched from `check-slug` and put in
 * front of the field that caused it: "The slug has already been taken. Try
 * “mysuru-2”." The locality and developer forms did this on their own; the
 * dialogs of every other master-data screen said only that the slug was taken,
 * and hid the availability line's own suggestion behind the error (QA-60).
 *
 * @param {unknown} thrown what the write threw
 * @param {string} slug the slug the write sent
 * @param {{checkSlug?: Function, excludeId?: number|string|null}} options
 *   `checkSlug(slug, { excludeId })` answers `{ data: { available, suggestion } }`
 * @returns {Promise<unknown>} the error to throw — the same one when there is
 *   nothing to suggest
 */
export default async function withSlugSuggestion(thrown, slug, { checkSlug, excludeId } = {}) {
  if (thrown?.status !== 409 || !slug || typeof checkSlug !== 'function') return thrown;
  // The other 409: somebody else saved the record first — nothing to do with the slug.
  if (thrown?.data?.conflict === 'stale') return thrown;

  try {
    const envelope = await checkSlug(slug, { excludeId });
    const suggestion = envelope?.data?.suggestion;
    if (!suggestion || suggestion === slug) return thrown;

    return new ApiError({
      status: thrown.status,
      message: thrown.message,
      data: thrown.data,
      original: thrown,
      errors: { ...thrown.errors, slug: [`${thrown.message} Try “${suggestion}”.`] },
    });
  } catch {
    // The suggestion is a nicety; the refusal is the answer.
    return thrown;
  }
}
