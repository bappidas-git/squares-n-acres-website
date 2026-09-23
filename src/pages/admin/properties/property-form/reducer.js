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
  SET_COMPUTED: 'SET_COMPUTED',
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
  setComputed: (patch) => ({ type: ACTIONS.SET_COMPUTED, patch }),
  listAdd: (path, item, index) => ({ type: ACTIONS.LIST_ADD, path, item, index }),
  listRemove: (path, id) => ({ type: ACTIONS.LIST_REMOVE, path, id }),
  listMove: (path, from, to) => ({ type: ACTIONS.LIST_MOVE, path, from, to }),
  listUpdate: (path, id, patch) => ({ type: ACTIONS.LIST_UPDATE, path, id, patch }),
  setErrors: (errors) => ({ type: ACTIONS.SET_ERRORS, errors }),
  clearError: (path) => ({ type: ACTIONS.CLEAR_ERROR, path }),
  setSaving: (saving) => ({ type: ACTIONS.SET_SAVING, saving }),
  markSaved: (record, sent) => ({ type: ACTIONS.MARK_SAVED, record, sent }),
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
 * A new image is the cover only when no image is one yet.
 *
 * The tab decides "the first image is the cover" from the gallery it rendered
 * with; two uploads started together both saw an empty gallery, so both
 * arrived marked as the cover — two radios checked, and the one saved was not
 * necessarily the one shown.
 */
const withSingleCover = (images, added) =>
  added?.isCover === true && images.some((image) => image?.isCover === true)
    ? { ...added, isCover: false }
    : added;

/** The computed half of `seo`, which the panel rewrites on its own. */
const COMPUTED_SEO = [
  'score',
  'scoreBand',
  'testsPassed',
  'testsTotal',
  'analysis',
  'lastAnalyzedAt',
];

/** Values as an editor made them — without the analysis the SEO panel writes back. */
const edited = (values) => {
  if (!values?.seo) return values;
  const seo = { ...values.seo };
  COMPUTED_SEO.forEach((key) => delete seo[key]);
  return { ...values, seo };
};

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
        // The field somebody has just corrected stops shouting before they
        // leave it — and so does everything under it: a tab that writes a
        // whole list (the highlights) used to leave `highlights.3` shouting
        // after the fourth line had been shortened.
        errors: dropErrorsUnder(state.errors, action.path),
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
        errors = dropErrorsUnder(errors, path);
        touched[path] = true;
      }
      return { ...state, values, errors, touched };
    }

    /**
     * Fields the form works out for itself, rather than ones a person typed.
     *
     * The SEO panel writes its score, its band, its test counts, its test
     * results and the moment it ran back into the record it analysed, through
     * the same channel an editor's typing uses — and the first analysis runs as
     * soon as the tab mounts. Counting that as an edit made an untouched form
     * ask "Discard unsaved changes?" on the way out. `initial` moves with the
     * value, so `dirty` sees no difference here and every other path still
     * differs exactly as much as the editor made it differ.
     */
    case ACTIONS.SET_COMPUTED: {
      const entries = Object.entries(action.patch ?? {});
      if (entries.length === 0) return state;

      let values = state.values;
      let initial = state.initial;
      for (const [path, value] of entries) {
        values = setIn(values, path, value);
        initial = setIn(initial, path, value);
      }
      return { ...state, values, initial };
    }

    case ACTIONS.LIST_ADD: {
      const current = listAt(state.values, action.path);
      const at =
        action.index === undefined || action.index === null ? current.length : action.index;
      const item = action.path === 'images' ? withSingleCover(current, action.item) : action.item;
      const next = [...current.slice(0, at), item, ...current.slice(at)];
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
      const saved = fromRecord(action.record);
      // The inputs stay live while a save is in flight. When the editor typed
      // on after pressing Save, what they typed stays on screen — and stays
      // unsaved, since `initial` is the record the server returned — rather
      // than being replaced by the server's copy of the values sent.
      const typedSince =
        action.sent !== undefined &&
        JSON.stringify(edited(state.values)) !== JSON.stringify(edited(action.sent));
      return {
        ...state,
        values: typedSince ? state.values : saved,
        initial: saved,
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
