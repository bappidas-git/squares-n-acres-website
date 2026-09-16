/**
 * The admin UI kit (prompt 13).
 *
 * Every admin screen from prompt 14 onwards is assembled from these: a table
 * that pages on the server, a filter row that lives in the URL, forms built
 * from field descriptions, and `MasterDataPage`, which is all of it wired
 * together from one configuration object.
 *
 *   import { DataTable, MasterDataPage, PageHeader } from '../../components/admin';
 *
 * The exports are alphabetical, which is **not** the order `MasterDataPage`
 * reaches for the same components. A screen that pulls several of them without
 * pulling `MasterDataPage` — an editor on its own route, like
 * `LocalityFormPage` — should therefore import the files it needs directly, in
 * `MasterDataPage`'s order: two admin chunks holding the same CSS in two orders
 * is a `mini-css-extract-plugin` conflict, and `build:ci` treats it as an error.
 */

export { default as AdminPlaceholderPage } from './AdminPlaceholderPage';
export { default as AdminTabs, AdminTabPanel } from './AdminTabs';
export { default as BulkActionsBar } from './BulkActionsBar';
export { default as DataTable, PER_PAGE_OPTIONS, DEFAULT_PER_PAGE } from './DataTable';
export { default as DeleteGuardDialog } from './DeleteGuardDialog';
export { default as EntityPicker } from './EntityPicker';
export { default as FilterBar, SEARCH_DEBOUNCE_MS } from './FilterBar';
export { default as Forbidden } from './Forbidden';
export { default as FormSection, FormColumn } from './FormSection';
export { default as IconPicker, ICON_CATEGORIES, ALL_ICONS } from './IconPicker';
export { default as ImageField, IMAGE_HINTS, ImageHint } from './ImageField';
export { default as MasterDataForm, FormFieldControl } from './MasterDataForm';
export { default as MasterDataPage, useMasterDataCrud } from './MasterDataPage';
export { default as MultiSelect } from './MultiSelect';
export { default as PageHeader } from './PageHeader';
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as RoleRoute } from './RoleRoute';
export { default as RowActions } from './RowActions';
export { default as SeoGuidelines } from './SeoGuidelines';
export { default as SlugField, CHECK_DEBOUNCE_MS } from './SlugField';
export { default as SortableList } from './SortableList';
export { default as StatusChip } from './StatusChip';
export { default as ToneSelect } from './ToneSelect';
