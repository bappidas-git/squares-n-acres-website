import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AdminTabs, { AdminTabPanel } from '../../../components/admin/AdminTabs';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/admin/DataTable';
import FilterBar from '../../../components/admin/FilterBar';
import NotFoundTab from './NotFoundTab';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import SeoBulkTools from './SeoBulkTools';
import SeoDuplicatesTab from './SeoDuplicatesTab';
import SeoEditDialog from './SeoEditDialog';
import SeoIssuesTab from './SeoIssuesTab';
import SeoOverviewCards from './SeoOverviewCards';
import seoService from '../../../services/seoService';
import useSeoOverview, {
  SEO_FILTER_KEYS,
  useSeoOverviewAll,
  useSeoSummary,
} from './useSeoOverview';
import { CSV_MIME, csvFileName, toCsv } from '../../../utils/csv';
import { formatDate } from '../../../utils/format';
import { SEO, TABLES, TOASTS } from '../../../config/adminCopy';
import { SEO_ENTITY_TYPES, SEO_SCORE_BANDS } from '../../../config/enums';
import { buildSeoColumns, renderSeoCard } from './SeoEntityTable';
import { downloadBlob } from '../../../utils/download';
import { firstFieldMessage } from '../../../services/apiError';
import { previewUrlOfRow, publicUrlOfRow, serviceFor, typeLabel } from './seoEntityServices';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useMasterData } from '../../../contexts/MasterDataContext';
import { useSeoSettings } from '../../../components/seo/SeoPanel/useSiteSeoIndex';
import { tabOfSeoField } from '../../../components/seo/SeoPanel/SeoPanel';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SeoDashboardPage.module.css';

/** The columns of the CSV export (§4.5 of prompt 37). */
export const SEO_CSV_COLUMNS = [
  { label: 'Type', value: (row) => typeLabel(row.type) },
  { label: 'Title', value: 'title' },
  { label: 'URL', value: (row) => publicUrlOfRow(row) ?? '' },
  { label: 'Focus keyword', value: (row) => row.seo?.focusKeyword ?? '' },
  { label: 'Score', value: (row) => (Number.isFinite(row.seo?.score) ? row.seo.score : '') },
  { label: 'Band', value: (row) => SEO_SCORE_BANDS.labelOf(row.seo?.scoreBand ?? 'none') },
  { label: 'Index', value: (row) => (row.seo?.robots?.index === false ? 'Noindex' : 'Indexed') },
  {
    label: 'Last analysed',
    value: (row) => (row.seo?.lastAnalyzedAt ? formatDate(row.seo.lastAnalyzedAt) : ''),
  },
];

const TABS = [
  { key: 'entities', label: 'All records', icon: 'mdi:format-list-bulleted' },
  { key: 'duplicates', label: 'Duplicates', icon: 'mdi:content-duplicate' },
  { key: 'issues', label: 'Issues', icon: 'mdi:alert-circle-outline' },
  // The addresses visitors reached that answered 404 (prompt 51).
  { key: 'notFound', label: '404s', icon: 'mdi:link-variant-off' },
];

const TAB_KEYS = TABS.map((entry) => entry.key);

/** The two "missing" filters the overview cards narrow the table to. */
const MISSING_OPTIONS = [
  { value: 'focusKeyword', label: 'No focus keyword' },
  { value: 'description', label: 'No meta description' },
];

/**
 * Admin → SEO (`/admin/seo`).
 *
 * The SEO Manager's front page: how good the site's SEO is, which records are
 * dragging it down, and the two runs that fix most of it at once.
 *
 * Two reads, deliberately different (`useSeoOverview.js`): the **table** is
 * server-paged and server-filtered, so a site of four thousand records costs
 * one page of rows; the **cards, duplicates and issues** are computed from the
 * whole site, which is one `perPage=all` read cached for a minute. Neither is a
 * substitute for the other — an average over twenty rows is not the site's
 * average, and paging a duplicates list would split the pairs it exists to show.
 *
 * Everything an editor can do from here is the SEO panel of prompt 36, mounted
 * in a dialog over the record the row stands for. The desk never writes a field
 * the panel does not own.
 */
export default function SeoDashboardPage() {
  const toast = useToast();
  const { can } = useAdminAuth();
  const masterData = useMasterData();
  const { settings: seoSettings } = useSeoSettings();

  const canEdit = can('seo', 'edit');
  const navigate = useNavigate();

  // The tab is in the address (`?tab=issues`), so the dashboard's "SEO issues"
  // link opens the list it names (prompt 51). Written beside the table's own
  // query, which only changes on the tab that holds the table.
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('tab');
  const tab = TAB_KEYS.includes(asked) ? asked : 'entities';
  const setTab = useCallback(
    (next) =>
      setSearchParams((current) => {
        const copy = new URLSearchParams(current);
        if (next === 'entities') copy.delete('tab');
        else copy.set('tab', next);
        return copy;
      }),
    [setSearchParams]
  );

  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);
  // "Re-analyse all" pressed outside the toolbar that runs it.
  const [reanalyseAsked, setReanalyseAsked] = useState(false);
  const reanalyseAll = useCallback(() => {
    setTab('entities');
    setReanalyseAsked(true);
  }, [setTab]);

  const {
    items,
    meta,
    loading,
    error,
    params,
    setPage,
    setPerPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  } = usePagedOverview();

  const { rows: allRows, loading: allLoading, refresh: refreshAll } = useSeoOverviewAll();
  const summary = useSeoSummary(allRows);

  // What `analyze` and the title templates read. The site index is the desk's
  // own list, so the panel's three uniqueness tests compare this record against
  // exactly the rows the editor is looking at (§13.1).
  const context = useMemo(
    () => ({
      seoSettings,
      siteUrl: seoSettings?.siteUrl ?? '',
      siteIndex: allRows,
      localities: masterData.localities,
      cities: masterData.cities,
      propertyTypes: masterData.propertyTypes,
      developers: masterData.developers,
      amenities: masterData.amenities,
      banksAvailable: (masterData.banks ?? []).length > 0,
    }),
    [seoSettings, allRows, masterData]
  );

  /** A row's `seo` is stale the moment the dialog or a bulk run saves it. */
  const afterWrite = useCallback(() => {
    refreshAll();
    refetch();
  }, [refreshAll, refetch]);

  // "Fix" on a test the SEO dialog cannot edit — the body, the images — opens
  // the record's own form instead of a dialog with nothing to focus (prompt 51).
  const openEditor = useCallback(
    (row, field) => {
      const service = serviceFor(row?.type);
      if (field && !tabOfSeoField(field) && service) {
        navigate(service.adminPath(row.id, row));
        return;
      }
      setEditing({ row, field: field ?? undefined });
    },
    [navigate]
  );

  const openPublicPage = useCallback(
    async (row) => {
      // The window is opened **before** the token request so the browser still
      // counts it as a click; a popup opened inside a promise is a blocked one.
      const tab_ = window.open('', '_blank', 'noopener');
      try {
        const url = await previewUrlOfRow(row);
        if (!url) {
          tab_?.close();
          toast.error(TOASTS.noPublicPage);
          return;
        }
        if (tab_) tab_.location.href = url;
        else window.open(url, '_blank', 'noopener');
      } catch (thrown) {
        tab_?.close();
        toast.error(firstFieldMessage(thrown, 'The preview link could not be created.'));
      }
    },
    [toast]
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await seoService.overview({ ...exportParamsOf(params), perPage: 'all' });
      const csv = toCsv(Array.isArray(data) ? data : [], SEO_CSV_COLUMNS);
      downloadBlob(new Blob([csv], { type: CSV_MIME }), csvFileName('seo-overview'));
      toast.success('The CSV is in your downloads.');
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The export could not be built.'));
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(() => buildSeoColumns(), []);

  const rowActions = useCallback(
    (row) => {
      const service = serviceFor(row.type);
      return [
        {
          key: 'edit-seo',
          label: canEdit ? 'Edit SEO' : 'View SEO',
          icon: 'mdi:magnify-scan',
          onClick: () => openEditor(row),
        },
        {
          key: 'open',
          label: 'Open the page',
          icon: 'mdi:open-in-new',
          onClick: () => openPublicPage(row),
        },
        ...(service
          ? [
              {
                key: 'form',
                label: 'Open the record',
                icon: 'mdi:pencil-outline',
                to: service.adminPath(row.id, row),
              },
            ]
          : []),
      ];
    },
    [canEdit, openEditor, openPublicPage]
  );

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Title, slug or keyword' },
      // Both carry a placeholder, as every other multiselect filter in the
      // panel does: without one the control is an empty box, and the only
      // thing saying it can be opened is the label above it.
      {
        key: 'type',
        type: 'multiselect',
        label: 'Type',
        placeholder: 'Any type',
        options: SEO_ENTITY_TYPES.options,
      },
      {
        key: 'scoreBand',
        type: 'multiselect',
        label: 'Score',
        placeholder: 'Any score',
        options: SEO_SCORE_BANDS.options,
      },
      {
        key: 'index',
        type: 'select',
        label: 'Index',
        options: [
          { value: 'indexed', label: 'Indexed' },
          { value: 'noindex', label: 'Noindex' },
        ],
      },
      {
        key: 'missing',
        type: 'multiselect',
        label: 'Missing',
        placeholder: 'Anything',
        options: MISSING_OPTIONS,
      },
    ],
    []
  );

  const activeFilters = SEO_FILTER_KEYS.filter((key) => isSet(params[key])).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="SEO dashboard"
        icon="mdi:chart-line"
        count={summary.total}
        subtitle="Every optimisable record on the site, scored by the same engine the SEO panel runs."
        actions={
          <div className={styles.headerActions}>
            <Button
              variant="ghost"
              size="sm"
              to={PATHS.adminSeoGuide}
              icon={<Icon icon="mdi:book-open-page-variant-outline" width="18" height="18" />}
            >
              Playbook
            </Button>
            <Button
              variant="ghost"
              size="sm"
              to={PATHS.adminRedirects}
              icon={<Icon icon="mdi:swap-horizontal" width="18" height="18" />}
            >
              Redirects
            </Button>
            <Button
              variant="outline"
              size="sm"
              to={PATHS.adminSeoSettings}
              icon={<Icon icon="mdi:cog-outline" width="18" height="18" />}
            >
              SEO settings
            </Button>
          </div>
        }
      />

      <SeoOverviewCards
        summary={summary}
        loading={allLoading && allRows.length === 0}
        onFilter={(patch) => {
          setTab('entities');
          setFilters(patch);
        }}
        onOpenTab={setTab}
      />

      <AdminTabs label="SEO views" tabs={TABS} value={tab} onChange={setTab} />

      <AdminTabPanel tabKey="entities" value={tab}>
        <div className={styles.toolbar}>
          <FilterBar
            fields={filterFields}
            values={params}
            onChange={setFilters}
            onReset={resetFilters}
            activeCount={activeFilters}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={exportCsv}
              loading={exporting}
              icon={<Icon icon="mdi:download-outline" width="18" height="18" />}
            >
              Export CSV
            </Button>
          </FilterBar>

          {canEdit ? (
            <SeoBulkTools
              rows={allRows}
              seoSettings={seoSettings}
              context={context}
              onFinished={afterWrite}
              autoStart={reanalyseAsked && !allLoading}
              onAutoStarted={() => setReanalyseAsked(false)}
            />
          ) : null}
        </div>

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
          onPerPageChange={setPerPage}
          rowActions={rowActions}
          rowActionsLabel={(row) => `Actions for ${row.title || typeLabel(row.type)}`}
          getRowId={(row) => row.key ?? `${row.type}:${row.id}`}
          mobileCard={renderSeoCard}
          caption="Every optimisable record, with its SEO score"
          emptyState={
            activeFilters > 0
              ? {
                  title: 'No records match these filters',
                  text: 'Clear the filters to see the whole site.',
                  action: (
                    <Button variant="outline" onClick={resetFilters}>
                      {TABLES.clearFilters}
                    </Button>
                  ),
                }
              : {
                  // Nothing is filtered and nothing came back: the index has
                  // not been built yet rather than the site being empty (§8.2).
                  title: SEO.dashboard.empty,
                  text: SEO.dashboard.emptyText,
                  // The real run, not a reload of the list (prompt 51).
                  action: canEdit ? (
                    <Button variant="outline" onClick={reanalyseAll} loading={allLoading}>
                      {SEO.dashboard.reanalyse}
                    </Button>
                  ) : undefined,
                }
          }
        />
      </AdminTabPanel>

      <AdminTabPanel tabKey="duplicates" value={tab}>
        <SeoDuplicatesTab rows={allRows} onEdit={openEditor} />
      </AdminTabPanel>

      <AdminTabPanel tabKey="issues" value={tab}>
        <SeoIssuesTab
          rows={allRows}
          loading={allLoading && allRows.length === 0}
          onEdit={openEditor}
          onReanalyse={canEdit ? reanalyseAll : undefined}
        />
      </AdminTabPanel>

      <AdminTabPanel tabKey="notFound" value={tab}>
        <NotFoundTab canEdit={canEdit} />
      </AdminTabPanel>

      <SeoEditDialog
        open={editing !== null}
        row={editing?.row ?? null}
        initialField={editing?.field}
        siteIndex={allRows}
        readOnly={!canEdit}
        onClose={() => setEditing(null)}
        onSaved={afterWrite}
      />
    </div>
  );
}

/** The paged read, with `perPage` wired the way `DataTable` reports it. */
function usePagedOverview() {
  const list = useSeoOverview();
  const setPerPage = useCallback((perPage) => list.setParams({ perPage }), [list]);
  return { ...list, setPerPage };
}

/** The filters an export repeats — never the page or the page size (D44). */
export function exportParamsOf(params = {}) {
  const wanted = {};
  for (const key of [...SEO_FILTER_KEYS, 'sort', 'order']) {
    if (isSet(params[key])) wanted[key] = params[key];
  }
  return wanted;
}

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);
