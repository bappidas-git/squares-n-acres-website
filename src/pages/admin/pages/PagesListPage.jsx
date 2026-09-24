import { useCallback, useEffect, useMemo, useState } from 'react';
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
import openInNewTab from '../../../utils/openInNewTab';
import pageService from '../../../services/pageService';
import useApiList from '../../../hooks/useApiList';
import useLingering from '../../../hooks/useLingering';
import { FOOTER_COLUMNS, PAGE_STATUS, PAGE_TEMPLATES } from '../../../config/enums';
import {
  deleteRefusal,
  isHomePage,
  isLinkedPage,
  isSystemPage,
  unpublishRefusal,
} from '../../../config/pages';
import { firstFieldMessage } from '../../../services/apiError';
import { formatDate } from '../../../utils/format';
import { headerPlacementLabel, normaliseSearch, useHeaderMenus } from './pagesAdmin';
import { resetNavPagesCache } from '../../../hooks/useNavPages';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './PagesListPage.module.css';
import { TABLES } from '../../../config/adminCopy';

/**
 * Admin → Pages (`/admin/pages`) — every page of the site.
 *
 * The pages an editor writes — About, Contact, the service pages, the legal
 * texts — and, since QA-56, the **built-in** pages the site generates from its
 * own data — Buy, Localities, Articles… — which were missing from this list
 * altogether and so could not be placed in a menu. The home page's record is
 * listed at `/`, which is where it is: at `/home` it was a bare copy of two of
 * its bands (`routes/paths.js`).
 *
 * The status chip writes: one press publishes or unpublishes, optimistically,
 * rolling back if the API disagrees. Publishing changes what the header and the
 * footer contain, so the cached navigation lists are dropped afterwards (D93) —
 * otherwise a page an editor has just published would not appear in the menu
 * until they reloaded the site.
 *
 * Some pages are protected (`config/pages.js`): the built-in ones, and the
 * written ones the site's own templates link to. They keep their address and
 * are never deleted; a built-in page is never unpublished. The list offers
 * neither action for them, and a bulk action that includes one says which ones
 * it will leave alone before it runs.
 */

/**
 * `POST /admin/pages/bulk` (§5.14). A delete is confirmed by this screen rather
 * than by the bar: the bar's "3 pages will be deleted", followed by a second
 * dialog saying two of them could not be, asked twice and was wrong the first
 * time (QA-56).
 */
const BULK_ACTIONS = [
  { key: 'publish', label: 'Publish', icon: 'mdi:eye-outline' },
  { key: 'unpublish', label: 'Unpublish', icon: 'mdi:eye-off-outline' },
  { key: 'delete', label: 'Delete', icon: 'mdi:delete-outline', danger: true },
];

const countOf = (count) => (count === 1 ? '1 page' : `${count} pages`);
const blocksOf = (count) => (count === 1 ? 'its blocks' : 'the blocks of each');

/** What refuses each bulk action, page by page (`config/pages.js`). */
const REFUSALS = { delete: deleteRefusal, unpublish: unpublishRefusal };

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

/**
 * The filters the list actually applies. A value the address carries that no
 * option names — `?status=bogus`, a template since removed — is no filter at
 * all: it used to narrow the list to nothing under a chip reading "Status:
 * bogus", with the select beside it still saying "Any status" (QA-56).
 */
const sanitiseFilters = (params) => ({
  ...params,
  status: PAGE_STATUS.has(params.status) ? params.status : '',
  template: PAGE_TEMPLATES.has(params.template) ? params.template : '',
});

/** What a page is called where a list of them is read aloud. */
const rowLabel = (row) => row.title;

export default function PagesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAdminAuth();

  const canEdit = can('content', 'edit');
  const canCreate = can('content', 'create');
  const canDelete = can('content', 'delete');

  const { menus } = useHeaderMenus();

  const {
    items,
    meta,
    loading,
    refreshing,
    error,
    params,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList(
    (query, options) => {
      const clean = sanitiseFilters(query);
      return pageService.adminList({ ...clean, q: normaliseSearch(clean.q) || undefined }, options);
    },
    {
      syncToUrl: true,
      paramKeys: LIST_PARAM_KEYS,
      defaults: LIST_DEFAULTS,
    }
  );

  const filters = useMemo(() => sanitiseFilters(params), [params]);

  const [overrides, setOverrides] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [unpublishing, setUnpublishing] = useState(null);
  const [bulkCheck, setBulkCheck] = useState(null);
  const [busy, setBusy] = useState(false);

  // What the dialogs draw while they fade out (QA-54).
  const [shownDeleting, releaseDeleting] = useLingering(deleting);
  const [shownUnpublishing, releaseUnpublishing] = useLingering(unpublishing);
  const [shownCheck, releaseCheck] = useLingering(bulkCheck);

  // An optimistic status belongs to the rows it was made on. Kept past a
  // re-read it outlived the truth: unpublish a page, bulk-publish it, and the
  // row still said "Draft" over a live page (QA-56).
  // (An empty map is kept as it is: a fresh `{}` would re-render, and a list
  // that answered something other than an array hands a new `[]` each time.)
  useEffect(() => {
    setOverrides((current) => (Object.keys(current).length === 0 ? current : {}));
  }, [items]);

  const rows = useMemo(
    () =>
      items.map((item) =>
        overrides[String(item.id)] ? { ...item, ...overrides[String(item.id)] } : item
      ),
    [items, overrides]
  );

  /** A page's own URL, slug and all — the home record's is `/`. */
  const publicHref = useCallback((row) => PATHS.page(row.slug), []);

  /**
   * After a delete: the previous page when this one has just been emptied,
   * rather than an empty table saying "No pages yet" over a list that still
   * has pages on the page before it (QA-56).
   *
   * @param {number} removed how many of the rows on screen went
   */
  const afterRemoval = (removed) => {
    const page = Number(params.page) || 1;
    if (page > 1 && removed >= rows.length) setPage(page - 1);
    else refetch();
  };

  /* ---------------- writes ---------------- */

  const writeStatus = useCallback(
    async (row, status) => {
      const id = String(row.id);
      setOverrides((current) => ({ ...current, [id]: { status } }));
      setBusyIds((current) => [...current, id]);

      try {
        await pageService.patch(row.id, { status });
        // The header and footer menus are built from the published pages and
        // are cached for the page load (D93); this is what makes them wrong.
        resetNavPagesCache();
        toast.success(
          status === 'published' ? `“${row.title}” is live.` : `“${row.title}” is a draft again.`
        );
        // Read again: under "Published only" the page just unpublished belongs
        // to another list.
        refetch();
      } catch (thrown) {
        setOverrides((current) => {
          const { [id]: _reverted, ...rest } = current;
          return rest;
        });
        toast.error(firstFieldMessage(thrown, 'The status could not be changed.'));
      } finally {
        setBusyIds((current) => current.filter((entry) => entry !== id));
      }
    },
    [refetch, toast]
  );

  /**
   * The status chip. A page the site links to asks first before it goes: its
   * links lead to a 404 until it is published again.
   */
  const toggleStatus = useCallback(
    (row) => {
      if (row.status === 'published' && isLinkedPage(row)) {
        setUnpublishing(row);
        return;
      }
      writeStatus(row, row.status === 'published' ? 'draft' : 'published');
    },
    [writeStatus]
  );

  const confirmUnpublish = async () => {
    const row = unpublishing;
    setUnpublishing(null);
    if (row) await writeStatus(row, 'draft');
  };

  /** Opens a draft behind a 24-hour token (D28), in a new tab. */
  const preview = useCallback(
    async (row) => {
      setBusy(true);
      try {
        const { data } = await pageService.previewToken(row.id);
        const path = `${PATHS.page(row.slug)}?preview=${data.token}`;
        if (!openInNewTab(path)) navigate(path);
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The preview link could not be created.'));
      } finally {
        setBusy(false);
      }
    },
    [navigate, toast]
  );

  /**
   * "Duplicate" is a create, not an API call of its own (§5.14 has no copy
   * endpoint for pages): `pageService.duplicate` reads the record, chooses the
   * copy's `<slug>-copy` and posts it back as a draft that is in neither menu.
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

  const applyBulk = async (action, ids) => {
    setBusy(true);
    try {
      const { message } = await pageService.bulk({ ids, action });
      resetNavPagesCache();
      toast.success(message || `${ids.length} pages updated.`);
      setSelectedIds([]);
      if (action === 'delete') afterRemoval(ids.length);
      else refetch();
    } catch (thrown) {
      toast.error(
        thrown?.message && (thrown?.status === 409 || thrown?.status === 422)
          ? thrown.message
          : firstFieldMessage(thrown, 'The bulk action could not be applied.')
      );
    } finally {
      setBusy(false);
    }
  };

  /**
   * The bulk actions, asking first about the pages an action cannot touch —
   * a protected page is never deleted, a built-in page never unpublished — so
   * the editor hears which ones and can go on with the rest. The API refuses
   * such a batch whole; this is what keeps it from getting that far. A delete
   * always asks, in the same one dialog.
   */
  const runBulk = async (action, ids) => {
    const refusal = REFUSALS[action];
    const chosen = new Set(ids.map(String));
    const refused = refusal
      ? rows
          .filter((row) => chosen.has(String(row.id)))
          .map((row) => ({ id: row.id, title: row.title, reason: refusal(row) }))
          .filter((entry) => entry.reason)
      : [];

    if (refused.length > 0 || action === 'delete') {
      const left = new Set(refused.map((entry) => String(entry.id)));
      setBulkCheck({ action, refused, rest: ids.filter((id) => !left.has(String(id))) });
      return;
    }
    await applyBulk(action, ids);
  };

  const confirmBulkRest = async () => {
    const check = bulkCheck;
    setBulkCheck(null);
    if (check?.rest.length > 0) await applyBulk(check.action, check.rest);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await pageService.remove(deleting.id);
      resetNavPagesCache();
      toast.success(`“${deleting.title}” deleted.`);
      setSelectedIds((current) => current.filter((id) => String(id) !== String(deleting.id)));
      setDeleting(null);
      afterRemoval(1);
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The page could not be deleted.'));
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- table ---------------- */

  const busySet = useMemo(() => new Set(busyIds), [busyIds]);

  const columns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        primary: true,
        render: (row) => (
          <span className={styles.titleCell}>
            <span className={styles.title}>
              {row.title}
              {isLinkedPage(row) ? (
                // The label is on a span of its own: the icon draws once its
                // data has loaded, and until then carries nothing to read.
                <span
                  className={styles.lock}
                  role="img"
                  aria-label="Protected"
                  title={
                    isHomePage(row)
                      ? 'The home page: its address is fixed and it cannot be deleted.'
                      : 'The site links to this page: its address is fixed and it cannot be deleted.'
                  }
                >
                  <Icon icon="mdi:lock-outline" width="15" height="15" aria-hidden="true" />
                </span>
              ) : null}
            </span>
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
        render: (row) => {
          const chip = (
            <StatusChip
              tone={PAGE_STATUS.meta[row.status]?.tone ?? 'neutral'}
              label={PAGE_STATUS.labelOf(row.status)}
            />
          );
          // A built-in page is always live; there is nothing to toggle.
          if (isSystemPage(row) || !canEdit) return chip;

          const pending = busySet.has(String(row.id));
          return (
            <button
              type="button"
              className={styles.statusButton}
              disabled={pending}
              aria-busy={pending || undefined}
              aria-label={`${PAGE_STATUS.labelOf(row.status)} — ${
                row.status === 'published' ? 'unpublish' : 'publish'
              } “${row.title}”`}
              title={row.status === 'published' ? 'Unpublish this page' : 'Publish this page'}
              // The row opens the page's form; a press on its status must not
              // (QA-56): it did both, publishing or unpublishing the page and
              // leaving the list for the form in the same click.
              onClick={(event) => {
                event.stopPropagation();
                toggleStatus(row);
              }}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {chip}
            </button>
          );
        },
      },
      {
        key: 'showInHeader',
        label: 'Header',
        width: '170px',
        hideBelow: 'lg',
        mobile: false,
        render: (row) => headerPlacementLabel(row, menus) || '—',
      },
      {
        key: 'showInFooter',
        label: 'Footer',
        width: '120px',
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
        // A built-in page's head is the page-type template's (SEO → Settings).
        render: (row) =>
          isSystemPage(row) ? (
            <span className={styles.muted} title="Set in SEO → Settings → Titles & meta">
              Site templates
            </span>
          ) : (
            <SeoScoreChip seo={row.seo} />
          ),
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
    [busySet, canEdit, menus, publicHref, toggleStatus]
  );

  const rowActions = useCallback(
    (row) => {
      const actions = [];
      const system = isSystemPage(row);

      if (canEdit) {
        actions.push({
          key: 'edit',
          label: 'Edit',
          icon: 'mdi:pencil-outline',
          to: PATHS.adminPageEdit(row.id),
        });
      }

      if (row.status === 'published' || system) {
        actions.push({
          key: 'view',
          label: 'View on the site',
          icon: 'mdi:open-in-new',
          href: publicHref(row),
        });
      } else {
        actions.push({
          key: 'preview',
          label: 'Preview',
          icon: 'mdi:eye-outline',
          disabled: busy,
          onClick: () => preview(row),
        });
      }

      // A built-in page is a route of the site; a copy of it would be nothing.
      if (canCreate && !system) {
        actions.push({
          key: 'duplicate',
          label: 'Duplicate',
          icon: 'mdi:content-copy',
          disabled: busy,
          onClick: () => duplicate(row),
        });
      }

      if (canDelete && !deleteRefusal(row)) {
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
    [busy, canCreate, canDelete, canEdit, duplicate, preview, publicHref]
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

  const filtered = Boolean(filters.q || filters.status || filters.template);

  const emptyState = useMemo(() => {
    // `?page=5` of a one-page list, or the last page just emptied: there are
    // pages, just not here — "No pages yet" said otherwise (QA-56).
    if ((Number(params.page) || 1) > 1) {
      return {
        title: TABLES.emptyPage,
        text: TABLES.emptyPageText,
        action: (
          <Button variant="outline" onClick={() => setPage(1)}>
            {TABLES.firstPage}
          </Button>
        ),
      };
    }
    if (filtered) {
      return {
        title: 'No pages match',
        text: 'Nothing on the site answers every filter you have set.',
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
  }, [canCreate, filtered, params.page, resetFilters, setPage]);

  const checkVerb = shownCheck?.action === 'delete' ? 'deleted' : 'unpublished';
  const checkRefused = shownCheck?.refused.length ?? 0;
  const checkRest = shownCheck?.rest.length ?? 0;
  const deletingRest = shownCheck?.action === 'delete' && checkRest > 0;

  return (
    <>
      <PageHeader
        title="Pages"
        count={meta?.total}
        subtitle="Every page of the site: the ones you write, and the built-in ones the site builds from its listings, localities and articles."
        actions={
          <span className={styles.headerActions}>
            {canEdit ? (
              <Button
                variant="outline"
                to={PATHS.adminPageMenus}
                icon={<Icon icon="mdi:menu" width="18" height="18" />}
              >
                Header menu
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                to={PATHS.adminPageNew}
                icon={<Icon icon="mdi:plus" width="18" height="18" />}
              >
                New page
              </Button>
            ) : null}
          </span>
        }
      />

      <div className={styles.screen}>
        <FilterBar
          fields={filterFields}
          values={filters}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <DataTable
          caption="Pages"
          columns={columns}
          rows={rows}
          meta={meta}
          loading={loading}
          refreshing={refreshing}
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
          rowLabel={rowLabel}
          rowLink={canEdit ? (row) => PATHS.adminPageEdit(row.id) : undefined}
          emptyState={emptyState}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this page?"
        message={
          shownDeleting
            ? `“${shownDeleting.title}” and its blocks will be deleted, and ${publicHref(shownDeleting)} will answer 404. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        onExited={releaseDeleting}
      />

      <ConfirmDialog
        open={Boolean(unpublishing)}
        title="Unpublish this page?"
        message={
          shownUnpublishing
            ? isHomePage(shownUnpublishing)
              ? 'The home page keeps working, without its “Why choose us” and “How it works” bands, until the record is published again.'
              : `The site links to ${publicHref(shownUnpublishing)} from its own pages; those links will lead to a “page not found” until “${shownUnpublishing.title}” is published again.`
            : undefined
        }
        confirmLabel="Unpublish"
        onClose={() => setUnpublishing(null)}
        onConfirm={confirmUnpublish}
        onExited={releaseUnpublishing}
      />

      <ConfirmDialog
        open={Boolean(bulkCheck)}
        title={
          !shownCheck
            ? ''
            : checkRefused === 0
              ? 'Delete the selected pages?'
              : `${checkRefused === 1 ? 'One page' : `${checkRefused} pages`} cannot be ${checkVerb}`
        }
        message={
          !shownCheck
            ? undefined
            : checkRefused === 0
              ? `${countOf(checkRest)} will be deleted, with ${blocksOf(checkRest)}. This cannot be undone.`
              : checkRest === 0
                ? `None of the selected pages can be ${checkVerb}.`
                : `The other ${checkRest === 1 ? 'page' : `${checkRest} pages`} can be ${checkVerb}${
                    deletingRest ? `, with ${blocksOf(checkRest)}. This cannot be undone` : ''
                  }.`
        }
        confirmLabel={
          checkRest === 0
            ? 'OK'
            : checkRefused === 0
              ? 'Delete'
              : `${shownCheck?.action === 'delete' ? 'Delete' : 'Unpublish'} the other ${checkRest}`
        }
        danger={deletingRest}
        onClose={() => setBulkCheck(null)}
        onConfirm={checkRest > 0 ? confirmBulkRest : () => setBulkCheck(null)}
        onExited={releaseCheck}
      >
        {checkRefused > 0 ? (
          <ul className={styles.refusedList}>
            {shownCheck.refused.map((entry) => (
              <li key={entry.id}>{entry.reason}</li>
            ))}
          </ul>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
