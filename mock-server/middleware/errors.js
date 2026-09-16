/**
 * Errors (00_MASTER_CONTEXT.md §5.3).
 *
 * Every failure leaves the API as `{ message }`, plus `errors` when the failure
 * is per-field — the shape Laravel produces and `useForm.setServerErrors()`
 * consumes. A route signals one by throwing an `ApiError`; the handler at the
 * bottom of the stack turns it into the response.
 */

/**
 * An HTTP failure with a status, a human-readable message and, for a 422, the
 * per-field messages.
 *
 * A few failures also carry `data`: the 409 of a master-data delete returns
 * `data.usedBy` so the admin panel can list what is still pointing at the
 * record instead of only saying that something is (§5.14, D88).
 */
class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {Record<string, string[]>} [errors]
   * @param {object} [data] extra payload rendered alongside `message`
   */
  constructor(status, message, errors, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? null;
    this.data = data ?? null;
  }
}

const badRequest = (message = 'Bad request', errors) => new ApiError(400, message, errors);
const unauthorized = (message = 'Unauthenticated.') => new ApiError(401, message);
const forbidden = (message = 'This action is unauthorized.') => new ApiError(403, message);
const notFound = (message = 'Not found') => new ApiError(404, message);
const conflict = (message, errors, data) => new ApiError(409, message, errors, data);
const validation = (errors, message = 'The given data was invalid.') =>
  new ApiError(422, message, errors);
const tooManyRequests = (message = 'Too many requests. Please try again in a minute.') =>
  new ApiError(429, message);

/** Express's own body-parser failures, mapped to the contract's 400. */
function normalize(error) {
  if (error instanceof ApiError) return error;
  if (error?.type === 'entity.parse.failed') return badRequest('Malformed JSON body.');
  if (error?.type === 'entity.too.large') return badRequest('Request body is too large.');
  return null;
}

/**
 * The terminal error handler.
 *
 * Known failures answer with their own status; anything else is a bug in the
 * mock, so the client gets a bare 500 and the stack goes to stderr where the
 * developer running `npm run mock` will see it.
 */
// `_next` is unused but mandatory: Express recognises an error handler by its
// four parameters.
function errorHandler(error, req, res, _next) {
  const known = normalize(error);

  if (!known) {
    console.error(error?.stack ?? error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }

  const body = { message: known.message };
  if (known.errors) body.errors = known.errors;
  if (known.data) body.data = known.data;
  res.status(known.status).json(body);
}

module.exports = {
  ApiError,
  errorHandler,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validation,
  tooManyRequests,
};
