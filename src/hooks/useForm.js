import { useCallback, useMemo, useRef, useState } from 'react';

import { useToast } from '../components/common/ToastProvider';
import { validate as validateSchema } from '../utils/validation';

/**
 * One admin form: values, errors, touched, dirty, and a submit that knows what
 * a 422 looks like (00_MASTER_CONTEXT.md §5.3).
 *
 *   const form = useForm({
 *     initialValues: { name: '', role: 'sales' },
 *     schema: schemas['user.create'],
 *     onSubmit: (values) => userService.create(values),
 *   });
 *
 * **Errors are a flat, dotted map** — `errors['location.localityId']`,
 * `errors['images.0.alt']` — the same keyspace a 422 body uses, so a server
 * message and a client message land on the same field and `getError(path)` is
 * one lookup however deep the field sits (§5.3).
 *
 * @param {object} options
 * @param {object} options.initialValues
 * @param {Record<string, object>} [options.schema] a `src/services/schemas` descriptor
 * @param {(values: object) => Record<string, string>} [options.validate] extra rules
 * @param {(values: object) => Promise<unknown>} [options.onSubmit]
 * @param {(values: object) => object} [options.normalize] the body the API will
 *   receive; it is what gets validated, so the form checks what it sends
 * @param {boolean} [options.partial] validate as a PATCH (no `required` checks)
 * @param {string} [options.successMessage] toasted when `submit()` resolves
 */
export default function useForm({
  initialValues = {},
  schema = null,
  validate: customValidate = null,
  normalize = null,
  onSubmit = null,
  partial = false,
  successMessage = '',
} = {}) {
  const toast = useToast();

  const [values, setValuesState] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // The baseline `dirty` compares against. `reset()` and a successful `submit()`
  // move it, so a saved form stops warning about changes that are persisted.
  // It is state rather than a ref because `dirty` has to be recomputed when it
  // moves, not only when the values do.
  const [baseline, setBaseline] = useState(initialValues);

  // Read by `submit()` without becoming a dependency of it: a new inline
  // `onSubmit` arrow on every render must not change the callback's identity.
  const latest = useRef({});
  latest.current = {
    schema,
    customValidate,
    normalize,
    onSubmit,
    partial,
    successMessage,
    toast,
    values,
  };

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline]
  );

  const setValues = useCallback((next) => {
    setValuesState((current) => (typeof next === 'function' ? next(current) : next));
  }, []);

  /** Sets one field by dotted path (`location.localityId`, `images.0.alt`). */
  const setField = useCallback((path, value) => {
    setValuesState((current) => setIn(current, path, value));
    // The field the user just corrected stops shouting before they leave it.
    setErrors((current) => (current[path] === undefined ? current : omit(current, path)));
  }, []);

  const handleBlur = useCallback((path) => {
    setTouched((current) => (current[path] ? current : { ...current, [path]: true }));
  }, []);

  /** The body the API will receive for a set of form values. */
  const toPayload = useCallback(
    (candidate) => (latest.current.normalize ? latest.current.normalize(candidate) : candidate),
    []
  );

  /** Every rule that applies to a set of values, as one flat map. */
  const runValidation = useCallback(
    (candidate) => {
      const { schema: shape, customValidate: extra, partial: isPartial } = latest.current;
      const payload = toPayload(candidate);
      return {
        ...(shape ? validateSchema(payload, shape, { partial: isPartial }) : {}),
        ...(extra ? (extra(candidate) ?? {}) : {}),
      };
    },
    [toPayload]
  );

  const validateAll = useCallback(() => {
    const found = runValidation(latest.current.values);
    setErrors(found);
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(found).map((key) => [key, true])),
    }));
    return Object.keys(found).length === 0;
  }, [runValidation]);

  /**
   * Paints an `ApiError` onto the form: a 422's `errors` become field messages
   * and its `message` becomes the toast; anything else is only a toast, because
   * a 500 belongs to no field.
   *
   * @param {import('../services/apiError').default} apiError
   * @returns {boolean} whether any field was painted
   */
  const setServerErrors = useCallback((apiError) => {
    const fields = apiError?.errors ?? {};
    const mapped = Object.fromEntries(
      Object.entries(fields).map(([key, messages]) => [
        key,
        Array.isArray(messages) ? String(messages[0]) : String(messages),
      ])
    );

    if (Object.keys(mapped).length > 0) {
      setErrors((current) => ({ ...current, ...mapped }));
      setTouched((current) => ({
        ...current,
        ...Object.fromEntries(Object.keys(mapped).map((key) => [key, true])),
      }));
    }
    return Object.keys(mapped).length > 0;
  }, []);

  const reset = useCallback((next) => {
    setBaseline((current) => {
      const base = next === undefined ? current : next;
      setValuesState(base);
      return base;
    });
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Validates, submits, and turns a failure into whatever the failure is.
   *
   * @returns {Promise<unknown|false>} the resolved value, or `false` when the
   *   form did not validate or the call failed
   */
  const submit = useCallback(async () => {
    if (!validateAll()) return false;

    const config = latest.current;
    setSubmitting(true);
    try {
      const payload = toPayload(config.values);
      const result = config.onSubmit ? await config.onSubmit(payload) : payload;
      setBaseline(config.values);
      if (config.successMessage) config.toast.success(config.successMessage);
      return result === undefined ? true : result;
    } catch (thrown) {
      setServerErrors(thrown);
      config.toast.error(thrown?.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [validateAll, setServerErrors, toPayload]);

  /** The message of a field, by dotted path — `undefined` when it is fine. */
  const getError = useCallback((path) => errors[path], [errors]);

  return {
    values,
    errors,
    touched,
    dirty,
    submitting,
    isValid: Object.keys(errors).length === 0,
    setField,
    setValues,
    setErrors,
    setServerErrors,
    setTouched,
    handleBlur,
    getError,
    validateAll,
    submit,
    reset,
  };
}

/* ------------------------------------------------------------------ *
 * Dotted paths
 * ------------------------------------------------------------------ */

/** The value at a dotted path, or `undefined`. */
export function getIn(source, path) {
  return String(path)
    .split('.')
    .reduce((node, key) => (node === null || node === undefined ? undefined : node[key]), source);
}

/**
 * A copy of `source` with the dotted path set — arrays stay arrays, and a
 * missing level is created as an array when the next key is an index.
 *
 * @param {object} source
 * @param {string} path
 * @param {unknown} value
 */
export function setIn(source, path, value) {
  const keys = String(path).split('.');

  const write = (node, index) => {
    const key = keys[index];
    const last = index === keys.length - 1;
    const isIndex = /^\d+$/.test(key);

    const container = Array.isArray(node)
      ? [...node]
      : node && typeof node === 'object'
        ? { ...node }
        : isIndex
          ? []
          : {};

    container[isIndex ? Number(key) : key] = last ? value : write(container[key], index + 1);
    return container;
  };

  return write(source, 0);
}

/** A copy of an object without one key. */
function omit(source, key) {
  const { [key]: _removed, ...rest } = source;
  return rest;
}
