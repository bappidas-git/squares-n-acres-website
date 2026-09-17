import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import storage from '../utils/storage';

/**
 * The properties a visitor has saved, in `localStorage` under `sna_shortlist`.
 *
 * A shortlist belongs to the person, not to the session: somebody comparing
 * four projects over a fortnight expects to find them still there, which is why
 * this is the one visitor-side list that is not in `sessionStorage`. It holds
 * ids and nothing else — the `/shortlist` page (prompt 26) reads the live
 * records, so a saved listing can never show a stale price.
 *
 * The heart on a card and the count on the bottom navigation read the same
 * provider, and a second tab is picked up through the `storage` event, so two
 * open tabs cannot disagree about what is saved.
 */

export const SHORTLIST_KEY = 'sna_shortlist';

const ShortlistContext = createContext(null);

/** Ids as strings, deduplicated, in the order they were saved. */
const normalise = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter((id) => id !== null && id !== undefined && id !== '')
    .map(String)
    .filter((id) => (seen.has(id) ? false : seen.add(id)));
};

const readStored = () => normalise(storage.getItem(SHORTLIST_KEY, []));

export const ShortlistProvider = ({ children }) => {
  const [ids, setIds] = useState(readStored);

  // What is saved *now*, which is not what the last render was told when two
  // hearts are pressed in the same tick — on a grid of twelve cards that is an
  // ordinary thing to do, and reading the render's copy would lose the first.
  const latest = useRef(ids);
  latest.current = ids;

  // Another tab saved or removed something: follow it rather than overwriting
  // it the next time this one writes.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onStorage = (event) => {
      if (event.key !== null && event.key !== SHORTLIST_KEY) return;
      const stored = readStored();
      latest.current = stored;
      setIds(stored);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const write = useCallback((next) => {
    latest.current = next;
    setIds(next);
    storage.setItem(SHORTLIST_KEY, next);
    return next;
  }, []);

  const has = useCallback((id) => ids.includes(String(id)), [ids]);

  /** @returns {boolean} whether the property was not already saved */
  const add = useCallback(
    (id) => {
      const key = String(id ?? '');
      if (key === '' || latest.current.includes(key)) return false;
      write([...latest.current, key]);
      return true;
    },
    [write]
  );

  /** @returns {boolean} whether the property was saved before the call */
  const remove = useCallback(
    (id) => {
      const key = String(id ?? '');
      if (key === '' || !latest.current.includes(key)) return false;
      write(latest.current.filter((entry) => entry !== key));
      return true;
    },
    [write]
  );

  /**
   * Save or unsave in one call.
   * @returns {boolean} `true` when the property is now saved
   */
  const toggle = useCallback(
    (id) => {
      const key = String(id ?? '');
      if (key === '') return false;
      const saved = !latest.current.includes(key);
      write(saved ? [...latest.current, key] : latest.current.filter((entry) => entry !== key));
      return saved;
    },
    [write]
  );

  const clear = useCallback(() => write([]), [write]);

  const value = useMemo(
    () => ({ ids, count: ids.length, has, add, remove, toggle, clear }),
    [ids, has, add, remove, toggle, clear]
  );

  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
};

/**
 * The shortlist. Safe outside a provider — a card rendered in a test or a
 * story reads an empty list whose writes go nowhere, rather than throwing.
 *
 * @returns {{ids: string[], count: number, has: (id: any) => boolean,
 *   add: (id: any) => boolean, remove: (id: any) => boolean,
 *   toggle: (id: any) => boolean, clear: () => void}}
 */
export function useShortlist() {
  return useContext(ShortlistContext) ?? FALLBACK;
}

const FALLBACK = {
  ids: [],
  count: 0,
  has: () => false,
  add: () => false,
  remove: () => false,
  toggle: () => false,
  clear: () => {},
};

export { ShortlistContext };
export default ShortlistContext;
