import { useEffect, useState } from 'react';

const read = (name, fallback) => {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

/**
 * Read a design token from the document at render time, for the few places that
 * need a concrete colour string rather than a `var()` reference — chart
 * libraries that paint to canvas/SVG attributes, mostly.
 *
 * @param {string} name     token name including the leading dashes
 * @param {string} fallback value used before the stylesheet is available
 */
export function useCssVar(name, fallback = '') {
  const [value, setValue] = useState(() => read(name, fallback));
  useEffect(() => setValue(read(name, fallback)), [name, fallback]);
  return value;
}

/**
 * Same, for a list of tokens. The returned array is stable for a stable `names`
 * argument, so it can feed a chart's colour prop without re-rendering.
 *
 * @param {string[]} names
 */
export function useCssVars(names) {
  const key = names.join(',');
  const [values, setValues] = useState(() => names.map((n) => read(n, '')));
  useEffect(() => {
    setValues(key.split(',').map((n) => read(n, '')));
  }, [key]);
  return values;
}

export default useCssVar;
