import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isCanceled } from '../services/apiError';

/** A stable string for an arbitrary dependency list, so the effect can key on it. */
const keyOf = (deps) =>
  deps
    .map((dep) => (dep !== null && typeof dep === 'object' ? JSON.stringify(dep) : String(dep)))
    .join('');

/**
 * One API call, with the four states every screen needs (§8.2).
 *
 * The hook owns an `AbortController` per call: changing the dependencies or
 * unmounting aborts the request in flight, so a slow answer can never write
 * into a component that has gone away and an abort never surfaces as an error.
 *
 *   const { data, meta, loading, error, refetch } = useApi(
 *     (signal) => propertyService.featured({ perPage: 8 }, { signal }),
 *     []
 *   );
 *
 * @param {(signal: AbortSignal) => Promise<{data: unknown, meta?: object}>} fetcher
 * @param {Array<unknown>} [deps] re-runs the call when these change
 * @param {object} [options]
 * @param {boolean} [options.enabled] skip the call entirely while false
 * @param {unknown} [options.initialData]
 * @param {boolean} [options.keepPreviousData] keep the last answer on screen while reloading
 * @param {(data: unknown, envelope: object) => void} [options.onSuccess]
 * @param {(error: import('../services/apiError').default) => void} [options.onError]
 * @returns {{data: unknown, meta: object|null, loading: boolean, fetching: boolean,
 *            error: object|null, refetch: () => Promise<void>, setData: Function}}
 *   `loading` is the first answer; `fetching` is any request in flight, which
 *   with `keepPreviousData` is the only sign that the rows on screen are about
 *   to be replaced.
 */
export default function useApi(fetcher, deps = [], options = {}) {
  const {
    enabled = true,
    initialData = null,
    keepPreviousData = false,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(initialData);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [fetching, setFetching] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  // Everything the call reads lives in a ref, so a new inline callback or a
  // fresh options object never restarts the request on its own.
  const latest = useRef({});
  latest.current = { fetcher, initialData, keepPreviousData, onSuccess, onError };

  const controllerRef = useRef(null);
  const mountedRef = useRef(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(async () => {
    const config = latest.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (!config.keepPreviousData) {
      setData(config.initialData);
      setLoading(true);
    } else if (!loadedRef.current) {
      setLoading(true);
    }
    setFetching(true);
    setError(null);

    try {
      const envelope = await config.fetcher(controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;

      const payload =
        envelope && typeof envelope === 'object' && 'data' in envelope ? envelope.data : envelope;
      loadedRef.current = true;
      setData(payload);
      setMeta(envelope?.meta ?? null);
      setLoading(false);
      setFetching(false);
      config.onSuccess?.(payload, envelope);
    } catch (thrown) {
      if (isCanceled(thrown) || controller.signal.aborted || !mountedRef.current) return;
      setError(thrown);
      setLoading(false);
      setFetching(false);
      config.onError?.(thrown);
    }
  }, []);

  const depsKey = useMemo(() => keyOf(deps), [deps]);

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.abort();
      setLoading(false);
      setFetching(false);
      return undefined;
    }

    run();
    return () => controllerRef.current?.abort();
  }, [enabled, run, depsKey]);

  return { data, meta, loading, fetching, error, refetch: run, setData };
}
