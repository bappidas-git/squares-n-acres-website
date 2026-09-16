/**
 * The property form's state machine.
 *
 * A sixteen-tab form is too big for `useState` per field: every tab would
 * re-render on every keystroke and the list operations (add a row, move a row,
 * patch a row by id) would be written out again in each tab. So one reducer
 * owns the record, and the tabs dispatch against it by dotted path.
 *
 * `initial` is the **last saved** record, which is what `dirty` compares
 * against — the hook does that comparison, because it has to be memoised on
 * `values` rather than recomputed inside every dispatch.
 */

import { getIn, setIn } from '../../../../hooks/useForm';
import createInitialState from './initialState';
import fromRecord from './fromRecord';

/** Every action the form can take. */
export const ACTIONS = {
  LOAD: 'LOAD',
  SET: 'SET',
  SET_MANY: 'SET_MANY',
  LIST_ADD: 'LIST_ADD',
  LIST_REMOVE: 'LIST_REMOVE',
  LIST_MOVE: 'LIST_MOVE',
  LIST_UPDATE: 'LIST_UPDATE',
  SET_ERRORS: 'SET_ERRORS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_SAVING: 'SET_SAVING',
  MARK_SAVED: 'MARK_SAVED',
  RESTORE_DRAFT: 'RESTORE_DRAFT',
  RESET: 'RESET',
};

/** Action creators — the only place an action's shape is written down. */
export const actions = {
  load: (record) => ({ type: ACTIONS.LOAD, record }),
  set: (path, value) => ({ type: ACTIONS.SET, path, value }),
  setMany: (patch) => ({ type: ACTIONS.SET_MANY, patch }),
  listAdd: (path, item, index) => ({ type: ACTIONS.LIST_ADD, path, item, index }),
  listRemove: (path, id) => ({ type: ACTIONS.LIST_REMOVE, path, id }),
  listMove: (path, from, to) => ({ type: ACTIONS.LIST_MOVE, path, from, to }),
  listUpdate: (path, id, patch) => ({ type: ACTIONS.LIST_UPDATE, path, id, patch }),
  setErrors: (errors) => ({ type: ACTIONS.SET_ERRORS, errors }),
  clearError: (path) => ({ type: ACTIONS.CLEAR_ERROR, path }),
  setSaving: (saving) => ({ type: ACTIONS.SET_SAVING, saving }),
  markSaved: (record) => ({ type: ACTIONS.MARK_SAVED, record }),
  restoreDraft: (draft) => ({ type: ACTIONS.RESTORE_DRAFT, draft }),
  reset: () => ({ type: ACTIONS.RESET }),
};

/**
 * The state a form starts in.
 *
 * @param {{propertyId?: number|string|null, record?: object|null}} [options]
 */
export function createFormState({ propertyId = null, record = null } = {}) {
  const values = record ? fromRecord(record) : createInitialState();

  return {
    values,
    initial: values,
    errors: {},
    touched: {},
    saving: false,
    lastSavedAt: record?.updatedAt ?? null,
    isNew: !propertyId,
    restoredDraft: false,
  };
}

/** A copy of an object without one key. */
const omit = (source, key) => {
  if (!(key in source)) return source;
  const { [key]: _removed, ...rest } = source;
  return rest;
};

/** Every error under a dotted prefix goes when its list changes shape. */
const dropErrorsUnder = (errors, prefix) => {
  const keys = Object.keys(errors).filter((key) => key === prefix || key.startsWith(`${prefix}.`));
  if (keys.length === 0) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !keys.includes(key)));
};

const listAt = (values, path) => {
  const current = getIn(values, path);
  return Array.isArray(current) ? current : [];
};

const sameId = (left, right) => String(left) === String(right);

/**
 * @param {object} state
 * @param {object} action
 * @returns {object} the next state
 */
export default function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD: {
      const values = fromRecord(action.record);
      return {
        ...state,
        values,
        initial: values,
        errors: {},
        touched: {},
        saving: false,
        lastSavedAt: action.record?.updatedAt ?? state.lastSavedAt,
        isNew: false,
        restoredDraft: false,
      };
    }

    case ACTIONS.SET: {
      if (getIn(state.values, action.path) === action.value) return state;
      return {
        ...state,
        values: setIn(state.values, action.path, action.value),
        // The field somebody has just corrected stops shouting before they leave it.
        errors: omit(state.errors, action.path),
        touched: { ...state.touched, [action.path]: true },
      };
    }

    case ACTIONS.SET_MANY: {
      const entries = Object.entries(action.patch ?? {});
      if (entries.length === 0) return state;

      let values = state.values;
      let errors = state.errors;
      const touched = { ...state.touched };
      for (const [path, value] of entries) {
        values = setIn(values, path, value);
        errors = omit(errors, path);
        touched[path] = true;
      }
      return { ...state, values, errors, touched };
    }

    case ACTIONS.LIST_ADD: {
      const current = listAt(state.values, action.path);
      const at =
        action.index === undefined || action.index === null ? current.length : action.index;
      const next = [...current.slice(0, at), action.item, ...current.slice(at)];
      return {
        ...state,
        values: setIn(state.values, action.path, next),
        errors: dropErrorsUnder(state.errors, action.path),
      };
    }

    case ACTIONS.LIST_REMOVE: {
      const current = listAt(state.values, action.path);
      const next = current.filter((row) => !sameId(row?.id, action.id));
      if (next.length === current.length) return state;
      return {
        ...state,
        values: setIn(state.values, action.path, next),
        // The indexes below the removed row have all moved, so their messages
        // now point at the wrong field: the section is revalidated instead.
        errors: dropErrorsUnder(state.errors, action.path),
      };
    }

    case ACTIONS.LIST_MOVE: {
      const current = listAt(state.values, action.path);
      const { from, to } = action;
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return state;
      }
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return {
        ...state,
        values: setIn(state.values, action.path, next),
        errors: dropErrorsUnder(state.errors, action.path),
      };
    }

    case ACTIONS.LIST_UPDATE: {
      const current = listAt(state.values, action.path);
      const index = current.findIndex((row) => sameId(row?.id, action.id));
      if (index === -1) return state;

      const next = [...current];
      next[index] = { ...next[index], ...action.patch };

      // Only the fields this patch touched stop shouting.
      const errors = Object.keys(action.patch ?? {}).reduce(
        (carried, field) => omit(carried, `${action.path}.${index}.${field}`),
        state.errors
      );

      return { ...state, values: setIn(state.values, action.path, next), errors };
    }

    case ACTIONS.SET_ERRORS: {
      const errors = action.errors ?? {};
      return {
        ...state,
        errors,
        touched: {
          ...state.touched,
          ...Object.fromEntries(Object.keys(errors).map((key) => [key, true])),
        },
      };
    }

    case ACTIONS.CLEAR_ERROR:
      return { ...state, errors: omit(state.errors, action.path) };

    case ACTIONS.SET_SAVING:
      return { ...state, saving: Boolean(action.saving) };

    case ACTIONS.MARK_SAVED: {
      const values = fromRecord(action.record);
      return {
        ...state,
        values,
        initial: values,
        errors: {},
        saving: false,
        lastSavedAt: action.record?.updatedAt ?? new Date().toISOString(),
        isNew: false,
        restoredDraft: false,
      };
    }

    case ACTIONS.RESTORE_DRAFT: {
      const draft = action.draft?.values;
      if (!draft) return state;
      // The draft is layered over the blank record, so a draft written before a
      // field existed still restores into a complete form.
      return {
        ...state,
        values: { ...createInitialState(), ...draft },
        errors: {},
        restoredDraft: true,
      };
    }

    case ACTIONS.RESET:
      return { ...state, values: state.initial, errors: {}, touched: {}, restoredDraft: false };

    default:
      return state;
  }
}
