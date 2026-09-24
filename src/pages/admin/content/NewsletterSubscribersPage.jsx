import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DataTable, { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import PageHeader from '../../../components/admin/PageHeader';
import StatusChip from '../../../components/admin/StatusChip';
import newsletterService from '../../../services/newsletterService';
import sanitiseParams from '../../../components/admin/sanitiseParams';
import useApiList from '../../../hooks/useApiList';
import { LEAD_SOURCES, NEWSLETTER_STATUS } from '../../../config/enums';
import { csvFileName } from '../../../utils/csv';
import { downloadAuthenticated } from '../../../utils/download';
import { endpoints } from '../../../services/endpoints';
import { firstFieldMessage } from '../../../services/apiError';
import { formatDate, formatNumber } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './JobApplicationsPage.module.css';
import { TABLES, TOASTS } from '../../../config/adminCopy';

/** What the table asks for before anybody touches a control (§5.6, D47). */
const LIST_DEFAULTS = { page: 1, perPage: DEFAULT_PER_PAGE, sort: 'createdAt', order: 'desc' };

/** The parameters that live in the URL, and how each is serialised (§5.6). */
const PARAM_KEYS = {
  q: 'string',
  status: 'string',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

/** The orders the table offers — its sortable columns. */
const SORT_KEYS = ['email', 'status', 'createdAt'];

const STATUS_FILTER = {
  key: 'status',
  type: 'select',
  label: 'Status',
  placeholder: 'Any status',
  options: NEWSLETTER_STATUS.options,
};

/**
 * The URL's parameters as the list may act on them (QA-61, QA-59's rule for
 * the master-data lists): `?status=bogus` drew a "Status: bogus" chip over an
 * empty list and an "Export CSV (0)" button.
 *
 * @param {object} params
 * @returns {object}
 */
export const sanitiseSubscriberParams = (params) =>
  sanitiseParams(params, {
    filters: [STATUS_FILTER],
    sortKeys: SORT_KEYS,
    defaults: LIST_DEFAULTS,
  });

/**
 * The filters `GET /admin/newsletter-subscribers/export` accepts (§5.14).
 *
 * The export repeats what is on screen and nothing else: no page, no sort, no
 * parameter the endpoint does not declare — the file is every matching row by
 * definition.
 *
 * Exported for the unit test.
 */
export const exportParamsOf = (params = {}) => {
  const { q, status } = params;
  const out = {};
  if (q) out.q = q;
  if (status) out.status = status;
  return out;
};

/**
 * Admin → Newsletter (`/admin/newsletter`) — the subscriber list of §6.14.
 *
 * There is nothing to edit here: an address is created by the footer form and
 * removed by an editor, which is exactly the two endpoints the contract has
 * (§5.14). So the screen is a table, a status filter, a search box, a delete
 * and the CSV — and the CSV comes from the export endpoint with the filters
 * that are on screen, so the file and the table always say the same thing
 * (D46).
 */
export default function NewsletterSubscribersPage() {
  const toast = useToast();

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
  } = useApiList(
    (query, options) => newsletterService.adminList(sanitiseSubscriberParams(query), options),
    {
      syncToUrl: true,
      paramKeys: PARAM_KEYS,
      defaults: LIST_DEFAULTS,
    }
  );

  // What the screen shows and acts on: the URL, less what it cannot honour.
  const view = useMemo(() => sanitiseSubscriberParams(params), [params]);

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  /**
   * After a removal: the page before when this one has just been emptied. It
   * stayed on "Page 2 of 1 — no rows on this page" with no way back (QA-61,
   * QA-56's rule for pages).
   */
  const finishRemoval = () => {
    setDeleting(null);
    const page = Number(view.page) || 1;
    if (page > 1 && items.length <= 1) setPage(page - 1);
    else refetch();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await newsletterService.remove(deleting.id);
      // The action is "Remove", and so is what it did (QA-61).
      toast.success(`“${deleting.email}” removed`);
      finishRemoval();
    } catch (thrown) {
      // Removed elsewhere since the list was read: what was asked for has
      // happened, and the row goes (QA-61).
      if (thrown?.status === 404) {
        toast.info(`“${deleting.email}” had already been removed.`);
        finishRemoval();
        return;
      }
      toast.error(firstFieldMessage(thrown, 'The subscriber could not be removed.'));
      // A refusal will not become an acceptance on a second press.
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAuthenticated(
        endpoints.adminNewsletterSubscribers.exportCsv,
        exportParamsOf(view),
        csvFileName('newsletter-subscribers'),
        { type: 'text/csv;charset=utf-8' }
      );
      toast.success(TOASTS.csvReady);
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The export could not be built.'));
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'email',
        label: 'E-mail',
        sortable: true,
        primary: true,
        render: (row) => <span className={styles.name}>{row.email}</span>,
      },
      {
        key: 'name',
        label: 'Name',
        mobile: true,
        render: (row) => row.name || <span className={styles.hint}>Not given</span>,
      },
      {
        key: 'source',
        label: 'Source',
        hideBelow: 'lg',
        mobile: false,
        render: (row) => LEAD_SOURCES.labelOf(row.source) || row.source || '—',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: '150px',
        mobile: true,
        render: (row) => (
          <StatusChip
            tone={NEWSLETTER_STATUS.meta[row.status]?.tone ?? 'neutral'}
            label={NEWSLETTER_STATUS.labelOf(row.status) || row.status}
          />
        ),
      },
      {
        key: 'createdAt',
        label: 'Subscribed',
        sortable: true,
        width: '140px',
        hideBelow: 'md',
        mobile: false,
        render: (row) => formatDate(row.createdAt),
      },
    ],
    []
  );

  const rowActions = useCallback(
    (row) => [
      {
        key: 'email',
        label: `Write to ${row.email}`,
        icon: 'mdi:email-outline',
        href: `mailto:${row.email}`,
      },
      {
        key: 'delete',
        label: 'Remove',
        icon: 'mdi:delete-outline',
        danger: true,
        onClick: () => setDeleting(row),
      },
    ],
    []
  );

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'E-mail or name' },
      STATUS_FILTER,
    ],
    []
  );

  const filtered = Boolean(view.q || view.status);
  const total = meta?.total;

  const emptyState = useMemo(() => {
    if (view.page > 1) {
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
        title: 'No subscribers match',
        text: 'Nothing on the list answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }
    return {
      title: 'No subscribers yet',
      text: 'Every address entered in the footer form arrives here.',
    };
  }, [view.page, filtered, resetFilters, setPage]);

  return (
    <>
      <PageHeader
        title="Newsletter subscribers"
        count={total}
        subtitle="Everybody who has asked to hear from us, and where they signed up."
        actions={
          <Button
            variant="outline"
            icon={<Icon icon="mdi:file-delimited-outline" width="18" height="18" />}
            loading={exporting}
            onClick={exportCsv}
          >
            Export CSV{typeof total === 'number' ? ` (${formatNumber(total)})` : ''}
          </Button>
        }
      />

      <div className={styles.screen}>
        <FilterBar
          fields={filterFields}
          values={view}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <DataTable
          caption="Newsletter subscribers"
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          error={error}
          onRetry={refetch}
          sort={{ field: view.sort, order: view.order }}
          onSortChange={(next) => setSort(next.field, next.order)}
          onPageChange={setPage}
          onPerPageChange={(perPage) => setFilters({ perPage })}
          rowActions={rowActions}
          rowActionsLabel={(row) => `Actions for ${row.email}`}
          emptyState={emptyState}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this subscriber?"
        message={
          deleting
            ? `“${deleting.email}” will be removed from the list. They can subscribe again from the site. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        danger
        loading={deleteBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
