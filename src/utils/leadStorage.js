/**
 * What this visit already told us, kept for the length of the visit.
 *
 * One record under `sna_lead` (sessionStorage, §4.2) holds the name, e-mail and
 * phone the visitor last typed — so the second form on the site opens with the
 * boxes filled — the properties they have enquired about, and the gated content
 * they have earned the right to see.
 *
 * Unlocks are **per kind** (`floorPlans`, `documents`): sharing a phone number
 * to read a floor plan is not the same as asking for the legal papers, and the
 * page says which one it is asking for. The exceptions are the forms in which a
 * visitor identifies themselves about the whole listing rather than about one
 * file — an enquiry, and either of the eligibility checks, which ask for more
 * than any download gate does (prompt 24 §7, prompt 25 §4.2).
 *
 * Nothing here is a permission system: it decides what a page shows this
 * visitor, and the lead it records is the thing of value. Clearing the session
 * simply asks again.
 */

const STORAGE_KEY = 'sna_lead';

/** The kinds of gated content a property page can unlock. */
export const UNLOCK_KINDS = ['floorPlans', 'documents'];

/** Lead sources that identify a visitor for the whole listing, not one file. */
export const UNLOCKS_EVERYTHING = ['property-enquiry', 'financial-assessment', 'bank-eligibility'];

/**
 * The event a section listens for when another part of the page opens a gate.
 *
 * Unlocking is a write to `sessionStorage`, which fires no event in the tab
 * that made it, so a component that read the gate when it mounted would keep
 * showing a lock after an enquiry elsewhere on the page had opened it.
 */
export const LEAD_CHANGE_EVENT = 'sna:lead-change';

const announce = () => {
  try {
    window.dispatchEvent(new CustomEvent(LEAD_CHANGE_EVENT));
  } catch {
    // No window (a Node render) means nothing is listening.
  }
};

/** Storage keys are strings; a property id arrives as either. */
const key = (propertyId) =>
  propertyId === null || propertyId === undefined || propertyId === '' ? null : String(propertyId);

const readRaw = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeRaw = (data) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // A full or blocked session store costs the visitor a prefilled form, not
    // the lead: the POST has already happened by the time this is called.
  }
  announce();
  return data;
};

export const leadStorage = {
  /**
   * Remember who just filled a form in.
   *
   * @param {{name?: string, email?: string, phone?: string}} userDetails
   * @param {number|string|null} [propertyId] the listing the form was about
   * @param {string} [source] a `LEAD_SOURCES` value
   * @returns {object} the stored record
   */
  save(userDetails = {}, propertyId, source) {
    const existing = this.get();
    const id = key(propertyId);

    const data = {
      name: userDetails.name || existing?.name || '',
      email: userDetails.email || existing?.email || '',
      phone: userDetails.phone || existing?.phone || '',
      capturedProperties: existing?.capturedProperties || [],
      capturedSources: existing?.capturedSources || [],
      unlocks: existing?.unlocks || {},
    };

    if (propertyId && !data.capturedProperties.includes(propertyId)) {
      data.capturedProperties.push(propertyId);
    }

    if (source) {
      data.capturedSources.push({ propertyId: propertyId ?? null, source, timestamp: Date.now() });
    }

    // Somebody who has enquired about the listing, or answered the eligibility
    // questionnaire about it, has already told us who they are; asking again
    // before each file would be theatre.
    if (id && UNLOCKS_EVERYTHING.includes(source)) {
      data.unlocks = { ...data.unlocks, [id]: [...UNLOCK_KINDS] };
    }

    return writeRaw(data);
  },

  /** The whole record, or `null` when this visit has not filled anything in. */
  get() {
    return readRaw();
  },

  /** The three fields a form prefills itself from. */
  getUserDetails() {
    const data = this.get();
    if (!data) return null;
    return { name: data.name, email: data.email, phone: data.phone };
  },

  /**
   * Record that this visitor may see one kind of gated content on one listing.
   *
   * @param {number|string} propertyId
   * @param {string} kind a member of {@link UNLOCK_KINDS}
   * @returns {boolean} whether anything was written
   */
  unlock(propertyId, kind) {
    const id = key(propertyId);
    if (!id || !UNLOCK_KINDS.includes(kind)) return false;

    const data = this.get() ?? {
      name: '',
      email: '',
      phone: '',
      capturedProperties: [],
      capturedSources: [],
      unlocks: {},
    };
    const unlocks = { ...(data.unlocks ?? {}) };
    const kinds = Array.isArray(unlocks[id]) ? unlocks[id] : [];
    if (kinds.includes(kind)) return true;

    unlocks[id] = [...kinds, kind];
    writeRaw({ ...data, unlocks });
    return true;
  },

  /**
   * Whether one kind of gated content is already open on one listing.
   *
   * @param {number|string} propertyId
   * @param {string} kind a member of {@link UNLOCK_KINDS}
   * @returns {boolean}
   */
  isUnlocked(propertyId, kind) {
    const id = key(propertyId);
    if (!id) return false;
    const kinds = this.get()?.unlocks?.[id];
    return Array.isArray(kinds) && kinds.includes(kind);
  },

  /** Whether a form has already been filled in about this listing. */
  isLeadCapturedForProperty(propertyId) {
    const data = this.get();
    if (!data || !propertyId) return false;
    return data.capturedProperties?.includes(propertyId) || false;
  },

  /** Whether this visit has identified itself at all. */
  isLeadCaptured() {
    const data = this.get();
    return !!(data?.name && data?.phone);
  },

  clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear if the store cannot be reached.
    }
    announce();
  },
};

export default leadStorage;
