/**
 * Every word the **admin panel** says on its own behalf
 * (00_MASTER_CONTEXT.md §8.5; the public site's words are in `copy.js`).
 *
 * The panel is read by three or four people who use it every day, so its voice
 * is different from the website's: short, factual, and always naming the record
 * it is talking about. What it must **not** be is inconsistent — twelve screens
 * inventing twelve ways to say "that did not save" is how an operator learns to
 * ignore the toasts.
 *
 * The shapes this file standardises, and which every screen uses:
 *
 *   saved(entity)        "Locality saved"          — a create or an update
 *   published(entity)    "Article published"
 *   deleted(entity)      "“Aurelia Court” deleted"
 *   updatedCount(n)      "12 leads updated"        — a bulk action
 *   copied(what)         "Link copied"             — a clipboard write
 *   failed(verb, noun)   "The lead could not be saved."
 *
 * Every success is a statement of fact in the past tense, under 60 characters
 * so a phone shows all of it. Every failure says what could not happen, and —
 * where the API told us why — `firstFieldMessage` puts the real reason in
 * front of the fallback. Neither ends in an exclamation mark.
 *
 * Confirmations name the record (§8.2): "Delete “Aurelia Court”?" and not
 * "Are you sure?". A destructive confirm carries `danger` and says whether the
 * change can be taken back.
 */

/* ------------------------------------------------------------------ *
 * tables — the list screens
 * ------------------------------------------------------------------ */

const TABLES = {
  empty: 'Nothing here yet',
  emptyFiltered: 'Nothing here answers every filter you have set.',
  emptyPage: 'Nothing on this page',
  emptyPageText: 'The list is shorter than the address you opened.',
  firstPage: 'Go to first page',
  resetFilters: 'Reset filters',
  clearFilters: 'Clear filters',

  rowActions: 'Row actions',
  selectAll: 'Select all on this page',
  clearSelection: 'Clear selection',
  bulkActions: 'Bulk actions',
  perPage: 'Per page',
  loading: 'Loading…',

  edit: 'Edit',
  view: 'View',
  duplicate: 'Duplicate',
  delete: 'Delete',
  activate: 'Activate',
  deactivate: 'Deactivate',
  preview: 'Preview',
  openPublicPage: 'Open the public page',
};

/* ------------------------------------------------------------------ *
 * forms — the verbs of every editor in the panel
 * ------------------------------------------------------------------ */

const FORMS = {
  save: 'Save',
  saveChanges: 'Save changes',
  create: 'Create',
  cancel: 'Cancel',
  close: 'Close',
  delete: 'Delete',
  discard: 'Discard changes',
  keepEditing: 'Keep editing',
  publish: 'Publish',
  unpublish: 'Unpublish',
  saveAnyway: 'Save anyway',

  required: 'Required',
  optional: 'Optional',
  unsaved: 'Unsaved changes',
  fixFields: 'Fix the highlighted fields before saving.',
};

/* ------------------------------------------------------------------ *
 * toasts — the one vocabulary of every confirmation in the panel
 * ------------------------------------------------------------------ */

/** What each boolean column is called once it has been flipped. */
const FLAG_STATES = {
  isActive: (on) => (on ? 'is now live' : 'is no longer live'),
  isFeatured: (on) => (on ? 'is now featured' : 'is no longer featured'),
  isVerified: (on) => (on ? 'is now verified' : 'is no longer verified'),
  isTrending: (on) => (on ? 'is now trending' : 'is no longer trending'),
  showOnHome: (on) => (on ? 'is now on the home page' : 'is off the home page'),
  isSample: (on) => (on ? 'is marked as a sample' : 'is no longer a sample'),
  default: (on) => (on ? 'is on' : 'is off'),
};

const TOASTS = {
  /** `saved('Locality')` → `'Locality saved'`. */
  saved: (entity) => `${entity} saved`,
  /** `published('Article')` → `'Article published'`. */
  published: (entity) => `${entity} published`,
  /** `unpublished('Article')` → `'Article unpublished'`. */
  unpublished: (entity) => `${entity} unpublished`,
  /** `created('Locality')` → `'Locality created'`. */
  created: (entity) => `${entity} created`,
  /** `deleted('“Aurelia Court”')` → `'“Aurelia Court” deleted'`. */
  deleted: (entity) => `${entity} deleted`,
  /** `duplicated('“Aurelia Court”')` → `'“Aurelia Court” duplicated'`. */
  duplicated: (entity) => `${entity} duplicated`,

  /**
   * `updatedCount(12, 'lead')` → `'12 leads updated'`; the plural is the noun
   * with an `s` unless a second form is given ('property', 'properties').
   */
  updatedCount: (count, one = 'item', many = null) =>
    `${count} ${count === 1 ? one : (many ?? `${one}s`)} updated`,

  /** `copied('Link')` → `'Link copied'`. */
  copied: (what = 'Link') => `${what} copied`,

  /**
   * What an optimistic toggle says once the API has agreed. The switch has
   * already moved, so the toast's job is only to confirm the write landed —
   * which is exactly what an operator who flipped six of them needs.
   *
   * `flagged('“Whitefield”', 'isActive', true)` → `'“Whitefield” is now live'`.
   */
  flagged: (entity, field, on) => `${entity} ${(FLAG_STATES[field] ?? FLAG_STATES.default)(on)}`,

  /**
   * The failure half of the vocabulary: `failed('save', 'the lead')` →
   * `'The lead could not be saved.'` Used as the fallback of
   * `firstFieldMessage`, which puts the API's own reason in front of it when
   * there is one.
   */
  failed: (message) => message,

  copyBlocked: 'Your browser did not allow copying. Select the text and copy it instead.',
  addressCopyBlocked: 'Your browser did not allow copying. Select the address and copy it instead.',
  noPublicPage: 'This record has no public page yet.',
  csvReady: 'The CSV is in your downloads.',
};

/* ------------------------------------------------------------------ *
 * dialogs — confirmations, every one naming its record (§8.2)
 * ------------------------------------------------------------------ */

const DIALOGS = {
  /** `deleteTitle('locality')` → `'Delete locality?'`. */
  deleteTitle: (singular) => `Delete ${singular}?`,
  /** `deleteMessage('Aurelia Court')` → `'“Aurelia Court” will be removed. …'`. */
  deleteMessage: (name) => `“${name}” will be removed. This cannot be undone.`,
  deleteConfirm: 'Delete',

  discardTitle: 'Discard unsaved changes?',
  discardMessage: 'The changes on this screen have not been saved. Leaving loses them.',
  discardConfirm: 'Discard changes',
  discardCancel: 'Keep editing',

  /** `bulkDeleteTitle('properties')` → `'Delete the selected properties?'`. */
  bulkDeleteTitle: (plural) => `Delete the selected ${plural}?`,
  /** `{count}` is substituted by `BulkActionsBar` with "3 properties". */
  bulkDeleteMessage: '{count} will be deleted. This cannot be undone.',
  bulkDeleteGuardedMessage:
    '{count} will be deleted. One a property still points at is refused. This cannot be undone.',

  cancel: 'Cancel',
};

/* ------------------------------------------------------------------ *
 * seo — the panel, the dashboard and the redirects screen
 * ------------------------------------------------------------------ */

const SEO = {
  panelTitle: 'Search engines',
  saved: 'Search appearance saved',
  saveFailed: 'The search appearance of this record could not be saved.',
  settingsSaved: 'SEO settings saved',

  dashboard: {
    empty: 'Nothing analysed yet',
    emptyText: 'Run an analysis to see how every published record scores, and what would raise it.',
    reanalyse: 'Re-analyse all',
    analysing: 'Analysing…',
  },

  redirects: {
    deleted: 'Redirect deleted',
    /** `updatedCount` with the right plural. */
    one: 'redirect',
    many: 'redirects',
  },
};

/* ------------------------------------------------------------------ *
 * dashboard
 * ------------------------------------------------------------------ */

const DASHBOARD = {
  leadsEmpty: 'No leads yet.',
  followUpsEmpty: 'Nothing is due in the next two weeks.',
  propertiesEmpty: 'No listings have been viewed yet.',
  viewAll: 'View all',
};

module.exports = {
  TABLES,
  FORMS,
  TOASTS,
  DIALOGS,
  SEO,
  DASHBOARD,
};
