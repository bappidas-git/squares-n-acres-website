import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import Chip from '../../../components/ui/Chip';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import SeoScoreChip from '../../../components/seo/SeoScoreChip';
import StatusChip from '../../../components/admin/StatusChip';
import pageService from '../../../services/pageService';
import useApiList from '../../../hooks/useApiList';
import { FOOTER_COLUMNS, HEADER_MENUS, PAGE_STATUS, PAGE_TEMPLATES } from '../../../config/enums';
import { firstFieldMessage } from '../../../services/apiError';
import { formatDate } from '../../../utils/format';
import { resetNavPagesCache } from '../../../hooks/useNavPages';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './PagesListPage.module.css';
import { TABLES } from '../../../config/adminCopy';

/**
 * Admin → Pages (`/admin/pages`) — the CMS list.
 *
 * Every page of the public site that is not a listing, a locality, a builder or
 * an article is a row here: About, Contact, the three buyer-assistance guides,
 * the service pages, the legal texts. The boilerplate had each of them as a
 * `.jsx` file full of hardcoded copy (BUG-11); the only way to change a word
 * was a deploy. Now it is this table.
 *
 * The status chip writes: one press publishes or unpublishes, optimistically,
 * rolling back if the API disagrees. Publishing changes what the header and the
 * footer menus contain, so the cached navigation lists are dropped afterwards
 * (D93) — otherwise a page an editor has just published would not appear in the
 * menu until they reloaded the site.
 */

/** `POST /admin/pages/bulk` (§5.14). */
const BULK_ACTIONS = [
  { key: 'publish', label: 'Publish', icon: 'mdi:eye-outline' },
  { key: 'unpublish', label: 'Unpublish', icon: 'mdi:eye-off-outline' },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: 'Delete the selected pages?',
      message: '{count} will be deleted, with the blocks of each. This cannot be undone.',
    },
  },
];

const LIST_DEFAULTS = {
  page: 1,
  perPage: 20,
  sort: 'order',
  order: 'asc',
  q: '',
  status: '',
  template: '',
};

const LIST_PARAM_KEYS = {
  page: 'int',
  perPage: 'int',
  sort: 'string',
  order: 'string',
  q: 'string',
  status: 'string',
  template: 'string',
};

export default function PagesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAdminAuth();

  const canEdit = can('content', 'edit');
  const canCreate = can('content', 'create');
  const canDelete = can('content', 'delete');

  const {
    items,
    meta,
    loading,
    error,
    params,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList((query, options) => pageService.adminList(query, options), {
    syncToUrl: true,
    paramKeys: LIST_PARAM_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [overrides, setOverrides] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  /** A page's own URL, slug and all — nested slugs keep their separators. */
  const publicHref = useCallback((row) => PATHS.page(row.slug), []);

  const toggleStatus = useCallback(
    async (row) => {
      const status = row.status === 'published' ? 'draft' : 'published';
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { status } }));

      try {
        await pageService.patch(row.id, { status });
        // The header and footer menus are built from the published pages and
        // are cached for the page load (D93); this is what makes them wrong.
        resetNavPagesCache();
        toast.success(
          status === 'published' ? `“${row.title}” is live.` : `“${row.title}” is a draft again.`
        );
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        toast.error(firstFieldMessage(thrown, 'The status could not be changed.'));
      }
    },
    [toast]
  );

  /**
   * "Duplicate" is a create, not an API call of its own (§5.14 has no copy
   * endpoint for pages): `pageService.duplicate` reads the record, chooses the
   * copy's `<slug>-copy` and posts it back as a draft that is in neither menu.
   *
   * The payload lives in the service rather than here because it is the whole of
   * the feature — what a copy may inherit and what names only the original — and
   * it is worth a unit test of its own (NEW-36).
   */
  const duplicate = useCallback(
    async (row) => {
      setBusy(true);
      try {
        const { data: copy } = await pageService.duplicate(row.id);
        toast.success(`“${copy.title}” created as a draft.`);
        navigate(PATHS.adminPageEdit(copy.id));
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The page could not be duplicated.'));
      } finally {
        setBusy(false);
      }
    },
    [navigate, toast]
  );

  const runBulk = useCallback(
    async (action, ids) => {
      setBusy(true);
      try {
        const { message } = await pageService.bulk({ ids, action });
        resetNavPagesCache();
        toast.success(message || `${ids.length} pages updated.`);
        setSelectedIds([]);
        refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The bulk action could not be applied.'));
      } finally {
        setBusy(false);
      }
    },
    [refetch, toast]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await pageService.remove(deleting.id);
      resetNavPagesCache();
      toast.success(`“${deleting.title}” deleted.`);
      setDeleting(null);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The page could not be deleted.'));
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        primary: true,
        render: (row) => (
          <span className={styles.titleCell}>
            <span className={styles.title}>{row.title}</span>
            <span className={styles.slug}>{publicHref(row)}</span>
          </span>
        ),
      },
      {
        key: 'template',
        label: 'Template',
        width: '140px',
        hideBelow: 'md',
        mobile: false,
        render: (row) => <Chip size="sm">{PAGE_TEMPLATES.labelOf(row.template)}</Chip>,
      },
      {
        key: 'status',
        label: 'Status',
        width: '130px',
        render: (row) => (
          <button
            type="button"
            className={styles.statusButton}
            disabled={!canEdit}
            title={canEdit ? 'Publish or unpublish this page' : undefined}
            onClick={() => toggleStatus(row)}
          >
            <StatusChip
              tone={PAGE_STATUS.meta[row.status]?.tone ?? 'neutral'}
              label={PAGE_STATUS.labelOf(row.status)}
            />
          </button>
        ),
      },
      {
        key: 'showInHeader',
        label: 'Header',
        width: '150px',
        hideBelow: 'lg',
        mobile: false,
        render: (row) =>
          row.showInHeader && row.headerMenu ? HEADER_MENUS.labelOf(row.headerMenu) : '—',
      },
      {
        key: 'showInFooter',
        label: 'Footer',
        width: '140px',
        hideBelow: 'lg',
        mobile: false,
        render: (row) =>
          row.showInFooter && row.footerColumn ? FOOTER_COLUMNS.labelOf(row.footerColumn) : '—',
      },
      {
        key: 'seoScore',
        label: 'SEO',
        width: '132px',
        hideBelow: 'lg',
        mobile: false,
        render: (row) => <SeoScoreChip seo={row.seo} />,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        sortable: true,
        width: '130px',
        hideBelow: 'lg',
        mobile: false,
        render: (row) => formatDate(row.updatedAt),
      },
    ],
    [canEdit, publicHref, toggleStatus]
  );

  const rowActions = useCallback(
    (row) => {
      const actions = [
        { key: 'edit', label: 'Edit', icon: 'mdi:pencil-outline', to: PATHS.adminPageEdit(row.id) },
      ];

      if (row.status === 'published') {
        actions.push({
          key: 'view',
          label: 'View on the site',
          icon: 'mdi:open-in-new',
          href: publicHref(row),
        });
      }

      if (canCreate) {
        actions.push({
          key: 'duplicate',
          label: 'Duplicate',
          icon: 'mdi:content-copy',
          disabled: busy,
          onClick: () => duplicate(row),
        });
      }

      if (canDelete) {
        actions.push({
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          onClick: () => setDeleting(row),
        });
      }

      return actions;
    },
    [busy, canCreate, canDelete, duplicate, publicHref]
  );

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Title or URL' },
      {
        key: 'status',
        type: 'select',
        label: 'Status',
        placeholder: 'Any status',
        options: PAGE_STATUS.options,
      },
      {
        key: 'template',
        type: 'select',
        label: 'Template',
        placeholder: 'Any template',
        options: PAGE_TEMPLATES.options,
      },
    ],
    []
  );

  const filtered = Boolean(params.q || params.status || params.template);

  const emptyState = useMemo(() => {
    if (filtered) {
      return {
        title: 'No pages match',
        text: 'Nothing in the CMS answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }
    return {
      title: 'No pages yet',
      text: 'About, Contact, the service pages and the legal texts all live here.',
      action: canCreate ? <Button to={PATHS.adminPageNew}>New page</Button> : undefined,
    };
  }, [canCreate, filtered, resetFilters]);

  return (
    <>
      <PageHeader
        title="Pages"
        count={meta?.total}
        subtitle="Every page of the site that is written rather than generated."
        actions={
          canCreate ? (
            <Button to={PATHS.adminPageNew} icon={<Icon icon="mdi:plus" width="18" height="18" />}>
              New page
            </Button>
          ) : null
        }
      />

      <div className={styles.screen}>
        <FilterBar
          fields={filterFields}
          values={params}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <DataTable
          caption="Pages"
          columns={columns}
          rows={rows}
          meta={meta}
          loading={loading}
          error={error}
          onRetry={refetch}
          sort={{ field: params.sort, order: params.order }}
          onSortChange={(next) => setSort(next.field, next.order)}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setFilters({ perPage })}
          selectable={canEdit}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={canEdit ? BULK_ACTIONS : []}
          bulkNounOne="page"
          bulkNounMany="pages"
          onBulkAction={runBulk}
          bulkBusy={busy}
          rowActions={rowActions}
          rowActionsMenu
          rowActionsLabel={(row) => `Actions for ${row.title}`}
          rowLink={canEdit ? (row) => PATHS.adminPageEdit(row.id) : undefined}
          emptyState={emptyState}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this page?"
        message={
          deleting
            ? `“${deleting.title}” and its blocks will be deleted, and ${publicHref(deleting)} will answer 404. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
