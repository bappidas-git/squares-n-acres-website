import { Fragment, memo, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Link, useNavigate } from 'react-router-dom';

import BulkActionsBar from './BulkActionsBar';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Pagination from '../ui/Pagination';
import RowActions from './RowActions';
import useBreakpoint from '../../hooks/useBreakpoint';
import { TABLES } from '../../config/adminCopy';
import { TableSkeleton } from '../common/SkeletonLoaders';

import styles from './DataTable.module.css';

/** §5.6 / D23 / D47: the admin table shows 20 rows, and offers these four. */
export const PER_PAGE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PER_PAGE = 20;

const HIDE_CLASS = {
  sm: styles.hideBelowSm,
  md: styles.hideBelowMd,
  lg: styles.hideBelowLg,
};

const defaultRowId = (row) => row?.id;

/**
 * The admin table (§8.4): server-side, selectable, sortable and paginated.
 *
 * It owns no data. Sorting, paging and filtering are parameters it reports
 * upwards — `useApiList` turns them into a request and the API into an answer —
 * so a table of 4 000 properties costs exactly one page of rows (BUG-19).
 *
 * Below 900 px the rows become cards: a title from the `primary` column, the
 * first three columns as labelled values, and the row actions in a kebab.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, sortable?: boolean, width?: string,
 *   align?: 'left'|'right'|'center', render?: (row: object) => React.ReactNode,
 *   hideBelow?: 'sm'|'md'|'lg', primary?: boolean, mobile?: boolean}>} props.columns
 * @param {Array<object>} props.rows
 * @param {{page: number, perPage: number, total: number, totalPages: number}} [props.meta]
 * @param {boolean} [props.loading]
 * @param {object} [props.error]
 * @param {() => void} [props.onRetry]
 * @param {{field: string, order: 'asc'|'desc'}} [props.sort]
 * @param {(sort: {field: string, order: 'asc'|'desc'}) => void} [props.onSortChange]
 * @param {(page: number) => void} [props.onPageChange]
 * @param {(perPage: number) => void} [props.onPerPageChange]
 * @param {boolean} [props.selectable]
 * @param {Array<string|number>} [props.selectedIds]
 * @param {(ids: Array<string|number>) => void} [props.onSelectionChange]
 * @param {Array<object>} [props.bulkActions]
 * @param {(key: string, ids: Array<string|number>) => void} [props.onBulkAction]
 * @param {(row: object) => Array<object>} [props.rowActions]
 * @param {boolean} [props.rowActionsMenu] collapse the row actions into a kebab
 *   on every width — what a row with more than four of them needs
 * @param {(row: object) => string} [props.rowActionsLabel] the kebab's accessible
 *   name, so twenty of them are not twenty buttons called "Row actions"
 * @param {(row: object) => string|number} [props.getRowId]
 * @param {{title: string, text?: string, action?: React.ReactNode}} [props.emptyState]
 * @param {string} [props.bulkNounOne] what one selected row is ("property"), so
 *   the bulk confirm can name it rather than say "3 records"
 * @param {string} [props.bulkNounMany]
 * @param {(row: object) => string} [props.rowLink]
 * @param {(row: object) => void} [props.onRowClick] opens the row in place — a
 *   drawer rather than a route, for a record that has no page of its own
 * @param {boolean} [props.stickyHeader]
 * @param {(row: object) => React.ReactNode} [props.mobileCard]
 * @param {(row: object) => {key: string, label: React.ReactNode}|null} [props.groupBy]
 *   a heading row above the first row of each run — amenities read by category
 * @param {(row: object) => boolean} [props.rowHighlight] tints the row and its
 *   phone card — what a lead nobody has answered yet looks like in a list of
 *   forty (prompt 29)
 */
export default function DataTable({
  columns = [],
  rows = [],
  meta = null,
  loading = false,
  error = null,
  onRetry,
  sort = null,
  onSortChange,
  onPageChange,
  onPerPageChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions = [],
  onBulkAction,
  bulkBusy = false,
  rowActions,
  rowActionsMenu = false,
  rowActionsLabel,
  getRowId = defaultRowId,
  emptyState = null,
  bulkNounOne = 'record',
  bulkNounMany = 'records',
  rowLink,
  onRowClick,
  stickyHeader = false,
  mobileCard,
  groupBy,
  rowHighlight,
  caption,
}) {
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();

  const page = meta?.page ?? 1;
  const perPage = meta?.perPage ?? DEFAULT_PER_PAGE;
  const total = meta?.total ?? rows.length;
  const totalPages = meta?.totalPages ?? 1;

  const pageIds = useMemo(() => rows.map((row) => getRowId(row)), [rows, getRowId]);
  const selected = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  // Select-all covers the page that is on screen. There is no "select all N
  // results" link: a bulk action must never reach rows nobody has seen.
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(String(id)));
  const someSelected = pageIds.some((id) => selected.has(String(id))) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      const remove = new Set(pageIds.map(String));
      onSelectionChange?.(selectedIds.filter((id) => !remove.has(String(id))));
      return;
    }
    const merged = [...selectedIds];
    pageIds.forEach((id) => {
      if (!selected.has(String(id))) merged.push(id);
    });
    onSelectionChange?.(merged);
  };

  // Stable, so a row that was given nothing new has nothing new to render:
  // `DataRow` and `MobileCard` are both `memo`, and a callback rebuilt on
  // every render of the table would be a prop change for all twenty of them.
  const toggleRow = useCallback(
    (id) => {
      if (selected.has(String(id))) {
        onSelectionChange?.(selectedIds.filter((entry) => String(entry) !== String(id)));
        return;
      }
      onSelectionChange?.([...selectedIds, id]);
    },
    [selected, selectedIds, onSelectionChange]
  );

  const handleSort = (column) => {
    if (!column.sortable || !onSortChange) return;
    const isActive = sort?.field === column.key;
    onSortChange({
      field: column.key,
      order: isActive && sort?.order === 'asc' ? 'desc' : 'asc',
    });
  };

  const ariaSort = (column) => {
    if (!column.sortable) return undefined;
    if (sort?.field !== column.key) return 'none';
    return sort?.order === 'desc' ? 'descending' : 'ascending';
  };

  const openRow = useCallback(
    (row) => {
      const to = rowLink?.(row);
      if (to) {
        navigate(to);
        return;
      }
      onRowClick?.(row);
    },
    [rowLink, navigate, onRowClick]
  );

  const columnCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const isEmpty = !loading && !error && rows.length === 0;

  /**
   * The heading this row opens, or `null` when it belongs to the run above it.
   *
   * The rows arrive sorted by whatever the group is keyed on, so "a new group"
   * is simply "a different key from the row before" — no regrouping, and no
   * assumption that the page holds a whole group.
   */
  const groupHeadOf = (row, index) => {
    if (!groupBy) return null;
    const group = groupBy(row);
    if (!group) return null;
    const previous = index > 0 ? groupBy(rows[index - 1]) : null;
    return previous && previous.key === group.key ? null : group;
  };

  const bulkBar = selectable ? (
    <BulkActionsBar
      selectedIds={selectedIds}
      actions={bulkActions}
      busy={bulkBusy}
      onAction={onBulkAction}
      onClear={() => onSelectionChange?.([])}
      nounOne={bulkNounOne}
      nounMany={bulkNounMany}
    />
  ) : null;

  // `?page=5` of a two-page list is a real address — a shared link outliving
  // the rows it pointed at — so the footer says where the reader is rather
  // than counting a slice that is not there (§7 of prompt 22).
  const summary =
    rows.length > 0
      ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}`
      : `Page ${page} of ${totalPages} — no rows on this page`;

  const footer =
    total > 0 ? (
      <div className={styles.footer}>
        <p className={styles.summary} aria-live="polite">
          {summary}
        </p>
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
        <label className={styles.perPage}>
          Rows per page
          <select
            className={styles.perPageSelect}
            value={perPage}
            onChange={(event) => onPerPageChange?.(Number(event.target.value))}
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    ) : null;

  /* ---------------- states shared by both layouts ---------------- */

  const stateBlock = error ? (
    <ErrorState
      icon={<Icon icon="mdi:alert-circle-outline" width="40" height="40" />}
      text={error.message}
      onRetry={onRetry}
    />
  ) : isEmpty ? (
    <EmptyState
      icon={<Icon icon="mdi:table-search" width="40" height="40" />}
      title={emptyState?.title ?? TABLES.empty}
      text={emptyState?.text}
      action={emptyState?.action}
    />
  ) : null;

  /* ---------------- mobile: cards ---------------- */

  if (isMobile) {
    return (
      <div className={styles.wrapper}>
        {bulkBar}
        {loading ? (
          <TableSkeleton rows={4} columns={2} />
        ) : stateBlock ? (
          <div className={styles.scroller}>{stateBlock}</div>
        ) : (
          <div className={styles.cards}>
            {rows.map((row, index) => {
              const id = getRowId(row);
              const group = groupHeadOf(row, index);
              return (
                <Fragment key={id}>
                  {/* The card list is the screen's own content and the screen's
                      `<h1>` is the heading above it, so a card titled h3 left a
                      level empty. Ungrouped, a card title is the h2; grouped,
                      the group label takes the h2 and the cards nest under it. */}
                  {group ? <h2 className={styles.groupHeading}>{group.label}</h2> : null}
                  <MobileCard
                    row={row}
                    id={id}
                    titleAs={groupBy ? 'h3' : 'h2'}
                    columns={columns}
                    selectable={selectable}
                    selected={selected.has(String(id))}
                    highlighted={Boolean(rowHighlight?.(row))}
                    onToggle={toggleRow}
                    rowActions={rowActions}
                    rowActionsLabel={rowActionsLabel}
                    to={rowLink?.(row)}
                    onRowClick={onRowClick}
                    render={mobileCard}
                  />
                </Fragment>
              );
            })}
          </div>
        )}
        {footer}
      </div>
    );
  }

  /* ---------------- desktop: table ---------------- */

  return (
    <div className={styles.wrapper}>
      {bulkBar}
      <div className={styles.scroller}>
        <Table className={styles.table} stickyHeader={stickyHeader} size="small">
          {caption ? <caption className={styles.srOnly}>{caption}</caption> : null}
          <TableHead>
            <TableRow>
              {selectable ? (
                <th className={[styles.headCell, styles.checkboxCell].join(' ')} scope="col">
                  <Checkbox
                    size="small"
                    disableRipple
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    slotProps={{ input: { 'aria-label': 'Select all rows on this page' } }}
                  />
                </th>
              ) : null}

              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort(column)}
                  style={{ width: column.width, textAlign: column.align || 'left' }}
                  className={[styles.headCell, HIDE_CLASS[column.hideBelow]]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => handleSort(column)}
                    >
                      {column.label}
                      <span
                        className={[
                          styles.sortIcon,
                          sort?.field === column.key ? styles.sortIconActive : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-hidden="true"
                      >
                        <Icon
                          icon={
                            sort?.field === column.key && sort?.order === 'desc'
                              ? 'mdi:arrow-down'
                              : 'mdi:arrow-up'
                          }
                          width="14"
                          height="14"
                        />
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}

              {rowActions ? (
                <th className={[styles.headCell, styles.actionsCell].join(' ')} scope="col">
                  <span className={styles.srOnly}>Actions</span>
                </th>
              ) : null}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <td className={styles.stateCell} colSpan={columnCount}>
                  <TableSkeleton rows={6} columns={Math.max(columnCount, 2)} />
                </td>
              </TableRow>
            ) : stateBlock ? (
              <TableRow>
                <td className={styles.stateCell} colSpan={columnCount}>
                  {stateBlock}
                </td>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const id = getRowId(row);
                const isSelected = selected.has(String(id));
                const to = rowLink?.(row);
                const clickable = Boolean(to) || Boolean(onRowClick);
                const group = groupHeadOf(row, index);

                return (
                  <Fragment key={id}>
                    {group ? (
                      <TableRow className={styles.groupRow}>
                        <th className={styles.groupCell} colSpan={columnCount} scope="colgroup">
                          {group.label}
                        </th>
                      </TableRow>
                    ) : null}
                    <DataRow
                      row={row}
                      id={id}
                      columns={columns}
                      selectable={selectable}
                      selected={isSelected}
                      highlighted={Boolean(rowHighlight?.(row))}
                      clickable={clickable}
                      onToggle={toggleRow}
                      onOpen={openRow}
                      rowActions={rowActions}
                      rowActionsMenu={rowActionsMenu}
                      rowActionsLabel={rowActionsLabel}
                    />
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {footer}
    </div>
  );
}

/**
 * One row of the desktop table.
 *
 * Its own component, and `memo`, because a table of a hundred properties runs
 * every cell renderer of every row whenever anything above it changes — a
 * checkbox ticked, a poller answering, a word typed in the search box (§8.6).
 * Given the same row and the same handlers it now draws nothing at all, which
 * is what a `memo` boundary is for.
 *
 * The per-row decisions a caller owns — the link, the highlight, the actions —
 * stay the caller's functions rather than becoming state here, so a row is
 * never showing a stale action.
 */
const DataRow = memo(function DataRow({
  row,
  id,
  columns,
  selectable,
  selected,
  highlighted,
  clickable,
  onToggle,
  onOpen,
  rowActions,
  rowActionsMenu,
  rowActionsLabel,
}) {
  return (
    <TableRow
      className={[
        styles.row,
        selected ? styles.rowSelected : '',
        highlighted ? styles.rowHighlight : '',
        clickable ? styles.rowClickable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpen(row) : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              if (event.target !== event.currentTarget) return;
              event.preventDefault();
              onOpen(row);
            }
          : undefined
      }
    >
      {selectable ? (
        <td className={[styles.cell, styles.checkboxCell].join(' ')}>
          <Checkbox
            size="small"
            disableRipple
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggle(id)}
            slotProps={{ input: { 'aria-label': `Select row ${id}` } }}
          />
        </td>
      ) : null}

      {columns.map((column) => (
        <td
          key={column.key}
          style={{ textAlign: column.align || 'left' }}
          className={[styles.cell, HIDE_CLASS[column.hideBelow]].filter(Boolean).join(' ')}
        >
          {column.render ? column.render(row) : (row[column.key] ?? '—')}
        </td>
      ))}

      {rowActions ? (
        <td className={[styles.cell, styles.actionsCell].join(' ')}>
          <RowActions
            actions={rowActions(row)}
            compact={rowActionsMenu}
            menuLabel={rowActionsLabel?.(row)}
          />
        </td>
      ) : null}
    </TableRow>
  );
});

/**
 * One row as a card. `mobileCard` replaces the body entirely; otherwise the
 * card is built from the `primary` column plus three others: the ones a column
 * asks for with `mobile: true` first — a status belongs on the card even when
 * it is the last column of the table — then the rest, in order, skipping any
 * marked `mobile: false`.
 *
 * `memo` for the same reason as `DataRow`: the phone shows the same rows and
 * re-renders them for the same reasons.
 */
const MobileCard = memo(function MobileCard({
  row,
  id,
  columns,
  selectable,
  selected,
  highlighted = false,
  onToggle,
  rowActions,
  rowActionsLabel,
  to,
  onRowClick,
  render,
  titleAs: CardHeading = 'h3',
}) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const others = columns.filter((column) => column !== primary && column.mobile !== false);
  const rest = [
    ...others.filter((column) => column.mobile === true),
    ...others.filter((column) => column.mobile !== true),
  ].slice(0, 3);

  const title = primary ? (primary.render ? primary.render(row) : row[primary.key]) : String(id);

  return (
    <article
      className={[
        styles.card,
        selected ? styles.cardSelected : '',
        highlighted ? styles.cardHighlight : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {selectable ? (
        <Checkbox
          size="small"
          disableRipple
          checked={selected}
          onChange={() => onToggle(id)}
          slotProps={{ input: { 'aria-label': `Select row ${id}` } }}
        />
      ) : null}

      <div className={styles.cardBody}>
        {render ? (
          render(row)
        ) : (
          <>
            <CardHeading className={styles.cardTitle}>
              {to ? (
                <Link className={styles.cardTitleLink} to={to}>
                  {title}
                </Link>
              ) : onRowClick ? (
                <button
                  type="button"
                  className={styles.cardTitleButton}
                  onClick={() => onRowClick(row)}
                >
                  {title}
                </button>
              ) : (
                title
              )}
            </CardHeading>
            <dl className={styles.cardMeta}>
              {rest.map((column) => (
                <div key={column.key} className={styles.cardMetaItem}>
                  <dt className={styles.cardMetaLabel}>{column.label}</dt>
                  <dd>{column.render ? column.render(row) : (row[column.key] ?? '—')}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>

      <RowActions actions={rowActions?.(row) ?? []} menuLabel={rowActionsLabel?.(row)} compact />
    </article>
  );
});
