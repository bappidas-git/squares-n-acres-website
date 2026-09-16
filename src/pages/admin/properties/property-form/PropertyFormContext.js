import { createContext, useContext } from 'react';

/**
 * What a property-form tab is given.
 *
 * A tab never reaches for the record, the route or the API: it reads `values`,
 * writes through `setField` / the list helpers, and renders `errors[path]` next
 * to the control that owns the path. That is the whole contract, so prompts
 * 19–21 can write a tab without knowing anything about the shell around it.
 *
 * @typedef {object} PropertyFormApi
 * @property {object} state the reducer's state
 * @property {Function} dispatch
 * @property {object} values
 * @property {Record<string, string>} errors dotted path → message
 * @property {(path: string, value: unknown) => void} setField
 * @property {(path: string, item: object, index?: number) => void} addItem
 * @property {(path: string, id: number|string) => void} removeItem
 * @property {(path: string, from: number, to: number) => void} moveItem
 * @property {(path: string, id: number|string, patch: object) => void} updateItem
 * @property {(key: string) => void} goToTab opens another tab — for a field that lives there
 * @property {boolean} disabled true for a sales user — the whole form is read-only (§7)
 * @property {boolean} isNew
 * @property {number|string|null} propertyId
 */

const PropertyFormContext = createContext(null);

export const PropertyFormProvider = PropertyFormContext.Provider;

/**
 * The form API, from inside a tab.
 *
 * @returns {PropertyFormApi}
 */
export function usePropertyFormContext() {
  const value = useContext(PropertyFormContext);
  if (!value) {
    throw new Error('usePropertyFormContext must be used inside the property form.');
  }
  return value;
}

export default PropertyFormContext;
