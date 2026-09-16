/**
 * The single error shape the data layer throws (00_MASTER_CONTEXT.md §5.3).
 *
 * Every failure — a 422 from the API, a dropped connection, a timeout, an
 * aborted request — reaches a component as an `ApiError`, so a screen never
 * has to know whether it is looking at an axios error, a DOM abort or a
 * Laravel validation envelope.
 *
 *   status          the HTTP status, or 0 when the request never got an answer
 *   message         ready to show in a toast
 *   errors          `{ fieldName: ['message', …] }` for inline field errors
 *   isNetworkError  the request never reached the server
 *   isTimeout       the request reached the timeout
 *   isCanceled      the caller aborted it — callers ignore these
 *   original        the underlying error, for debugging
 */

/** What we say when the server could not be reached at all. */
export const NETWORK_MESSAGE =
  'Unable to reach the server. Please check your connection and try again.';

/** What we say when nothing better is available. */
export const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

export default class ApiError extends Error {
  constructor({
    status = 0,
    message = GENERIC_MESSAGE,
    errors = {},
    isNetworkError = false,
    isTimeout = false,
    isCanceled = false,
    original = null,
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
    this.isCanceled = isCanceled;
    this.original = original;
  }

  /** The first message recorded for a field, or `undefined`. */
  fieldError(field) {
    const messages = this.errors?.[field];
    return Array.isArray(messages) ? messages[0] : messages;
  }

  /** `true` for 422 — the caller should paint the form rather than a toast. */
  get isValidation() {
    return this.status === 422;
  }
}

/** `true` when a thrown value is an aborted request nobody needs to react to. */
export const isCanceled = (error) => Boolean(error && error.isCanceled);
