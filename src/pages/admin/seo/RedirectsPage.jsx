import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Switch from '@mui/material/Switch';
import { useSearchParams } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import Modal from '../../../components/ui/Modal';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import RedirectImportDialog from './RedirectImportDialog';
import RedirectTester from './RedirectTester';
import StatusChip from '../../../components/admin/StatusChip';
import redirectService from '../../../services/redirectService';
import useApiList from '../../../hooks/useApiList';
import useForm from '../../../hooks/useForm';
import { NGINX_FILENAME, nginxSnippet } from './nginxSnippet';
import { REDIRECT_CODES } from '../../../config/enums';
import { SelectField, SwitchField, TextField } from '../../../components/ui/FormField';
import { csvFileName } from '../../../utils/csv';
import { downloadAuthenticated, downloadBlob } from '../../../utils/download';
import { endpoints } from '../../../services/endpoints';
import { formatRelative } from '../../../utils/format';
import { firstFieldMessage } from '../../../services/apiError';
import { schemas } from '../../../services/schemas';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './RedirectsPage.module.css';
import { FORMS, SEO, TOASTS } from '../../../config/adminCopy';

/** What the table asks for before anybody touches a control (D23, D47). */
const LIST_DEFAULTS = { page: 1, perPage: DEFAULT_PER_PAGE, sort: 'fromPath', order: 'asc' };

const PARAM_KEYS = {
  q: 'string',
  isActive: 'string',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

const FILTER_KEYS = ['q', 'isActive'];

/** A blank rule, as the dialog starts it. */
const BLANK = { fromPath: '', toPath: '', statusCode: 301, isActive: true, note: '' };

const BULK_ACTIONS = [
  { key: 'activate', label: 'Activate', icon: 'mdi:check-circle-outline' },
  { key: 'deactivate', label: 'Deactivate', icon: 'mdi:pause-circle-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: 'Delete the selected redirects?',
      message: '{count} will be deleted and the old URLs will answer 404 again.',
    },
  },
];

/**
 * A path split where a reader would break it: after each `/` or `-` with more
 * of the path behind it — never after the leading slash, and never inside
 * the `//` of an absolute target. `/flats-in-whitefield` is `/flats-`, `in-`,
 * `whitefield`; `https://example.com/new` is `https://`, `example.com/`,
 * `new`.
 *
 * @param {string} path
 * @returns {string[]} the pieces, which join back to `path`
 */
export function pathSegments(path) {
  const text = String(path ?? '');
  const segments = [];
  let current = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    current += char;
    if ((char === '/' || char === '-') && current.length > 1 && next && next !== '/') {
      segments.push(current);
      current = '';
    }
  }
  if (current) segments.push(current);
  return segments;
}

/**
 * A path in a table cell. It wraps at the `<wbr>` after a slash or a hyphen,
 * so a path too long for its column reads `/properties/` `lakeview-`
 * `heights` rather than `/propert` `ies/lake…`; only a single piece longer
 * than the column itself breaks inside, as the last resort (the page's CSS).
 * `<wbr>` adds no character, so a copied path is the path.
 * (`overflow-wrap: anywhere` used to split them mid-word — and let the table
 * squeeze these columns to a few characters, since it counts every character
 * as a place to break.)
 */
export function RedirectPath({ path }) {
  return (
    <code className={styles.path}>
      {pathSegments(path).map((segment, index) => (
        // A path's pieces never move, so their place is part of their name.
        <Fragment key={`${index}:${segment}`}>
          {index > 0 ? <wbr /> : null}
          {segment}
        </Fragment>
      ))}
    </code>
  );
}

/**
 * Admin → SEO → Redirects (`/admin/seo/redirects`, §9.10, D30).
 *
 * Every URL the site has ever published is a promise: somebody has it in a
 * bookmark, a mail, a listing portal, or Google's index. This screen is where
 * that promise is kept when a slug changes — and, because a single-page
 * application can only do the redirect **after** it has loaded, where the same
 * table is exported as Nginx rules for the server that fronts the build.
 *
 * The rules that keep the table sane belong to the API (§4.12 of prompt 09): a
 * path that does not start with `/`, a duplicate, a rule pointing at itself and
 * a rule pointing at another rule's source are each a 422 with the reason on
 * the field. The dialog shows those messages where they were raised rather than
 * re-implementing the checks and disagreeing with the server about them.
 */
export default function RedirectsPage() {
  const toast = useToast();
  const { can } = useAdminAuth();

  const canEdit = can('seo', 'edit');
  const canDelete = can('seo', 'delete');
  const canBulk = can('seo', 'bulk');

  const {
    items,
    meta,
    loading,
    error,
    params,
    setParams,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList((query, options) => redirectService.adminList(query, options), {
    syncToUrl: true,
    paramKeys: PARAM_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [editing, setEditing] = useState(null);

  // "Create redirect" from SEO → 404s (prompt 51) opens the form on the
  // address: `?create=/flats-in-hebal`. Read once, then taken out of the
  // address, so a reload does not open the form again.
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('create');
  useEffect(() => {
    if (!asked || !canEdit) return;
    setEditing({ ...BLANK, fromPath: asked });
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('create');
        return next;
      },
      { replace: true }
    );
  }, [asked, canEdit, setSearchParams]);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [snippet, setSnippet] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);

  /* ---------------- writes ---------------- */

  const toggleActive = useCallback(
    async (row, next) => {
      setBusyId(row.id);
      try {
        await redirectService.patch(row.id, { isActive: next });
        refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'That redirect could not be changed.'));
      } finally {
        setBusyId(null);
      }
    },
    [refetch, toast]
  );

  const remove = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await redirectService.remove(deleting.id);
      toast.success(SEO.redirects.deleted);
      setDeleting(null);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'That redirect could not be deleted.'));
    } finally {
      setDeletingBusy(false);
    }
  };

  const runBulk = async (action, ids) => {
    setBulkBusy(true);
    try {
      await redirectService.bulk({ ids: ids.map(Number), action });
      setSelectedIds([]);
      refetch();
      toast.success(TOASTS.updatedCount(ids.length, SEO.redirects.one, SEO.redirects.many));
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'That action could not be completed.'));
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------------- export ---------------- */

  const exportCsv = async () => {
    setExporting(true);
    try {
      // What the list is showing, not every rule there is (prompt 51).
      const filters = Object.fromEntries(
        ['q', 'isActive'].filter((key) => isSet(params[key])).map((key) => [key, params[key]])
      );
      await downloadAuthenticated(
        endpoints.adminRedirects.exportCsv,
        filters,
        csvFileName('redirects'),
        { type: 'text/csv;charset=utf-8' }
      );
      toast.success(TOASTS.csvReady);
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The export could not be built.'));
    } finally {
      setExporting(false);
    }
  };

  const openSnippet = async () => {
    try {
      const { data } = await redirectService.adminList({ perPage: 'all', sort: 'fromPath' });
      setSnippet(nginxSnippet(Array.isArray(data) ? data : []));
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The snippet could not be built.'));
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet ?? '');
      toast.success(TOASTS.copied('Snippet'));
    } catch {
      toast.error(TOASTS.copyBlocked);
    }
  };

  /* ---------------- table ---------------- */

  const columns = useMemo(
    () => [
      // The two paths are the rule, so they get the room: each column holds a
      // path of about twenty characters on one line at 1280 px, and a longer
      // one wraps after a slash or a hyphen (`RedirectPath`). The widths are
      // the page's CSS, which caps a path in a cell by the same numbers.
      {
        key: 'fromPath',
        label: 'From',
        sortable: true,
        primary: true,
        width: 'var(--redirect-from-width)',
        render: (row) => <RedirectPath path={row.fromPath} />,
      },
      {
        key: 'toPath',
        label: 'To',
        width: 'var(--redirect-to-width)',
        render: (row) => (
          <span className={styles.toCell}>
            <Icon icon="mdi:arrow-right" width="16" height="16" aria-hidden="true" />
            <RedirectPath path={row.toPath} />
          </span>
        ),
      },
      {
        key: 'statusCode',
        label: 'Type',
        width: '5rem',
        hideBelow: 'md',
        render: (row) => (
          <StatusChip
            tone={row.statusCode === 302 ? 'info' : 'neutral'}
            label={String(row.statusCode)}
            title={REDIRECT_CODES.labelOf(row.statusCode)}
          />
        ),
      },
      {
        key: 'isActive',
        label: 'Active',
        width: '5rem',
        render: (row) => (
          <Switch
            size="small"
            checked={row.isActive !== false}
            disabled={!canEdit || busyId === row.id}
            onChange={(event) => toggleActive(row, event.target.checked)}
            // `slotProps.input`, not `inputProps`: MUI 7 stopped forwarding the
            // latter from `Switch`, so the label never reached the `<input>` and
            // Chrome reported three switches with no accessible name at all.
            // `DataTable`'s row checkboxes already use this form. `role` is
            // repeated because these props replace the set `Switch` would
            // otherwise pass, and without it the control drops to a checkbox.
            slotProps={{
              input: { role: 'switch', 'aria-label': `Redirect ${row.fromPath} is active` },
            }}
          />
        ),
      },
      {
        key: 'hits',
        label: 'Hits',
        sortable: true,
        width: '5rem',
        align: 'right',
        hideBelow: 'lg',
        render: (row) => <span className={styles.hits}>{row.hits ?? 0}</span>,
      },
      {
        key: 'note',
        label: 'Note',
        hideBelow: 'lg',
        render: (row) => <span className={styles.note}>{row.note || '—'}</span>,
      },
      // The least of the row's facts; below 1536 px its room is the note's.
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '9rem',
        hideBelow: 'xl',
        render: (row) => formatRelative(row.updatedAt),
      },
    ],
    [canEdit, busyId, toggleActive]
  );

  const rowActions = useCallback(
    (row) => [
      ...(canEdit
        ? [
            {
              key: 'edit',
              label: 'Edit this redirect',
              icon: 'mdi:pencil-outline',
              onClick: () => setEditing(row),
            },
          ]
        : []),
      ...(canDelete
        ? [
            {
              key: 'delete',
              label: 'Delete this redirect',
              icon: 'mdi:delete-outline',
              danger: true,
              onClick: () => setDeleting(row),
            },
          ]
        : []),
    ],
    [canEdit, canDelete]
  );

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'From or to path' },
      {
        key: 'isActive',
        type: 'select',
        label: 'Status',
        options: [
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' },
        ],
      },
    ],
    []
  );

  const activeFilters = FILTER_KEYS.filter((key) => isSet(params[key])).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Redirects"
        icon="mdi:swap-horizontal"
        count={meta?.total}
        subtitle="Every URL the site has retired, and where it sends visitors now."
        breadcrumbs={[{ label: 'SEO', to: PATHS.adminSeo }, { label: 'Redirects' }]}
        actions={
          <div className={styles.headerActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={openSnippet}
              icon={<Icon icon="mdi:server-outline" width="18" height="18" />}
            >
              Nginx snippet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportCsv}
              loading={exporting}
              icon={<Icon icon="mdi:download-outline" width="18" height="18" />}
            >
              Export CSV
            </Button>
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImporting(true)}
                icon={<Icon icon="mdi:upload-outline" width="18" height="18" />}
              >
                Import
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="sm"
                onClick={() => setEditing(BLANK)}
                icon={<Icon icon="mdi:plus" width="18" height="18" />}
              >
                Add a redirect
              </Button>
            ) : null}
          </div>
        }
      />

      <RedirectTester />

      <FilterBar
        fields={filterFields}
        values={params}
        onChange={setFilters}
        onReset={resetFilters}
        activeCount={activeFilters}
      />

      <DataTable
        columns={columns}
        rows={items}
        meta={meta}
        loading={loading}
        error={error}
        onRetry={refetch}
        sort={{ field: params.sort, order: params.order }}
        onSortChange={({ field, order }) => setSort(field, order)}
        onPageChange={setPage}
        onPerPageChange={(perPage) => setParams({ perPage })}
        selectable={canBulk}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={canBulk ? BULK_ACTIONS : []}
        bulkNounOne="redirect"
        bulkNounMany="redirects"
        onBulkAction={runBulk}
        bulkBusy={bulkBusy}
        rowActions={rowActions}
        rowActionsLabel={(row) => `Actions for ${row.fromPath}`}
        caption="Redirect rules"
        emptyState={{
          title: 'No redirects yet',
          text: 'Add one whenever a page changes its address, so the old link keeps working.',
          action: canEdit ? (
            <Button variant="outline" onClick={() => setEditing(BLANK)}>
              Add a redirect
            </Button>
          ) : null,
        }}
      />

      <RedirectFormDialog
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <RedirectImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={refetch}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this redirect?"
        message={
          deleting
            ? `${deleting.fromPath} will answer 404 again for anyone who still has the old link.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deletingBusy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />

      <Modal
        open={snippet !== null}
        onClose={() => setSnippet(null)}
        size="md"
        mobile="fullscreen"
        title="Nginx redirects"
        description="Server-level 301s, for the deployment that fronts this build. The app performs the same rules in the browser."
        footer={
          <>
            <Button variant="outline" onClick={() => setSnippet(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={copySnippet}
              icon={<Icon icon="mdi:content-copy" width="18" height="18" />}
            >
              Copy
            </Button>
            <Button
              onClick={() =>
                downloadBlob(new Blob([snippet ?? ''], { type: 'text/plain' }), NGINX_FILENAME)
              }
              icon={<Icon icon="mdi:download-outline" width="18" height="18" />}
            >
              Download
            </Button>
          </>
        }
      >
        <pre className={styles.snippet}>
          <code>{snippet}</code>
        </pre>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The form
 * ------------------------------------------------------------------ */

/**
 * Create or edit one rule.
 *
 * @param {object} props
 * @param {object|null} props.record the rule, or the blank one, or `null` when closed
 * @param {() => void} props.onClose
 * @param {() => void} props.onSaved
 */
export function RedirectFormDialog({ record, onClose, onSaved }) {
  const editing = Boolean(record?.id);

  const form = useForm({
    initialValues: record ?? BLANK,
    schema: schemas['redirect.create'],
    validate: (values) => validateRedirectValues(values),
    normalize: (values) => ({
      fromPath: String(values.fromPath ?? '').trim(),
      toPath: String(values.toPath ?? '').trim(),
      statusCode: Number(values.statusCode) || 301,
      isActive: values.isActive !== false,
      note: String(values.note ?? '').trim() || null,
    }),
    onSubmit: (payload) =>
      editing ? redirectService.update(record.id, payload) : redirectService.create(payload),
    successMessage: editing ? 'The redirect is saved.' : 'The redirect is created.',
  });

  // `useForm` keeps the values it was created with, and the dialog is mounted
  // once: opening it on another row has to reset the fields to that row's.
  const [loadedId, setLoadedId] = useState(null);
  const key = record ? (record.id ?? 'new') : null;
  if (record && key !== loadedId) {
    setLoadedId(key);
    form.reset(record);
  }

  const save = async () => {
    const saved = await form.submit();
    if (saved === false) return;
    onSaved?.();
  };

  const conflict = form.getError('fromPath');

  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      size="sm"
      mobile="fullscreen"
      title={editing ? 'Edit the redirect' : 'Add a redirect'}
      description="From a path this site used to serve, to where that content lives now."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={form.submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={form.submitting}>
            {editing ? FORMS.save : FORMS.create}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <TextField
          label="From"
          required
          value={form.values.fromPath ?? ''}
          onChange={(event) => form.setField('fromPath', event.target.value)}
          onBlur={() => form.handleBlur('fromPath')}
          error={conflict}
          hint="A path on this site, starting with “/”."
          placeholder="/old-properties"
        />
        <TextField
          label="To"
          required
          value={form.values.toPath ?? ''}
          onChange={(event) => form.setField('toPath', event.target.value)}
          onBlur={() => form.handleBlur('toPath')}
          error={form.getError('toPath')}
          hint="A path on this site, or a full https:// address."
          placeholder="/properties"
        />
        <SelectField
          label="Type"
          value={String(form.values.statusCode ?? 301)}
          onChange={(event) => form.setField('statusCode', Number(event.target.value))}
          options={REDIRECT_CODES.options.map((option) => ({
            value: String(option.value),
            label: option.label,
          }))}
          error={form.getError('statusCode')}
          hint="301 tells search engines the move is permanent and passes the ranking on."
        />
        <TextField
          label="Note"
          value={form.values.note ?? ''}
          onChange={(event) => form.setField('note', event.target.value)}
          error={form.getError('note')}
          hint="Why this rule exists — the next editor will want to know."
        />
        <SwitchField
          label="Active"
          checked={form.values.isActive !== false}
          onChange={(next) => form.setField('isActive', next)}
          hint="An inactive rule is kept but not applied."
        />
      </div>
    </Modal>
  );
}

/**
 * The two rules worth catching before the request (the API checks all four).
 *
 * @param {{fromPath?: string, toPath?: string}} values
 * @returns {Record<string, string>}
 */
export function validateRedirectValues(values = {}) {
  const errors = {};
  const from = String(values.fromPath ?? '').trim();
  const to = String(values.toPath ?? '').trim();

  if (from && !from.startsWith('/')) {
    errors.fromPath = 'Start with “/” — this is a path on this site, not a full address.';
  }
  if (to && !/^(\/|https?:\/\/)/.test(to)) {
    errors.toPath = 'Start with “/” for a page on this site, or with https:// for another.';
  }
  if (from && to && from.replace(/\/+$/, '') === to.replace(/\/+$/, '')) {
    errors.toPath = 'A redirect cannot point at itself.';
  }

  return errors;
}

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);
