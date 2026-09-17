import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import DataTable from '../../../components/admin/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import { RowSummary } from './SeoEntityTable';

import styles from './SeoDashboardPage.module.css';

/**
 * The tests a page is not allowed to fail (§4.5 of prompt 37).
 *
 * `src/seo` runs about fifty; most of them are advice — a title without a
 * number in it is a weaker title, not a broken page. These eight are the ones
 * that cost traffic outright: a page nobody wrote a keyword for, a title or a
 * description a result cannot show, a page that excludes itself from the index,
 * a share card with no image, a page with no address of its own, and a listing
 * with too few photographs.
 *
 * `field` is where the fix is made. The stored analysis carries its own (the
 * analysers set it), and this table is the fallback for a record analysed by an
 * older build that did not.
 */
export const CRITICAL_TESTS = [
  { id: 'focus-keyword-set', label: 'No focus keyword', field: 'seo.focusKeyword' },
  { id: 'keyword-in-title', label: 'Keyword missing from the title', field: 'seo.title' },
  { id: 'title-length', label: 'Title length', field: 'seo.title' },
  { id: 'description-length', label: 'Description length', field: 'seo.description' },
  { id: 'indexable', label: 'Not indexable', field: 'seo.robots.index' },
  { id: 'og-image-set', label: 'No share image', field: 'seo.og.imageUrl' },
  { id: 'canonical-set', label: 'No canonical URL', field: 'seo.canonicalUrl' },
  { id: 'image-count', label: 'Too few images', field: 'images' },
];

const BY_ID = new Map(CRITICAL_TESTS.map((test) => [test.id, test]));

/**
 * Every failed critical test on the site, one row each.
 *
 * A record nobody has analysed contributes nothing: its analysis is empty, and
 * "no answer" is not "failed". The cards above the table say how many of those
 * there are, and "Re-analyse all" is the fix.
 *
 * @param {Array<object>} rows every row of the site
 * @returns {Array<{key: string, row: object, test: object, message: string, field: string}>}
 */
export function collectIssues(rows = []) {
  const issues = [];

  for (const row of rows) {
    const groups = row?.seo?.analysis ?? {};

    for (const results of Object.values(groups)) {
      for (const result of Array.isArray(results) ? results : []) {
        if (result?.status !== 'fail') continue;
        const test = BY_ID.get(result.id);
        if (!test) continue;

        issues.push({
          key: `${row.key ?? `${row.type}:${row.id}`}:${result.id}`,
          row,
          test,
          message: result.message || test.label,
          field: result.field || test.field,
        });
      }
    }
  }

  return issues;
}

/**
 * The issues tab: the site's failures, in one list, each with the control that
 * fixes it one click away.
 *
 * @param {object} props
 * @param {Array<object>} props.rows
 * @param {boolean} [props.loading]
 * @param {(row: object, field?: string) => void} props.onEdit
 * @param {() => void} [props.onReanalyse]
 */
export default function SeoIssuesTab({ rows = [], loading = false, onEdit, onReanalyse }) {
  const issues = collectIssues(rows);
  const analysed = rows.some((row) => Number.isFinite(row?.seo?.score));

  const columns = [
    {
      key: 'record',
      label: 'Record',
      primary: true,
      render: (issue) => <RowSummary row={issue.row} />,
    },
    {
      key: 'issue',
      label: 'Issue',
      render: (issue) => (
        <span className={styles.issueCell}>
          <span className={styles.issueLabel}>{issue.test.label}</span>
          <span className={styles.issueMessage}>{issue.message}</span>
        </span>
      ),
    },
    {
      key: 'fix',
      label: '',
      width: '7rem',
      align: 'right',
      render: (issue) => (
        <Button variant="outline" size="sm" onClick={() => onEdit?.(issue.row, issue.field)}>
          Fix
        </Button>
      ),
    },
  ];

  if (!loading && issues.length === 0) {
    return analysed ? (
      <EmptyState
        icon={<Icon icon="mdi:shield-check-outline" width="40" height="40" />}
        title="No critical issues"
        text="Every analysed record passes the eight tests that cost traffic outright. The panel still has advice on each one."
      />
    ) : (
      <EmptyState
        icon={<Icon icon="mdi:radar" width="40" height="40" />}
        title="Nothing has been analysed yet"
        text="The issues list is built from each record’s stored analysis. Run “Re-analyse all” to measure the site."
        action={
          onReanalyse ? (
            <Button variant="outline" onClick={onReanalyse}>
              Re-analyse all
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={issues}
      loading={loading}
      getRowId={(issue) => issue.key}
      caption="Failed critical SEO tests"
      emptyState={{ title: 'No critical issues' }}
      mobileCard={(issue) => (
        <div className={styles.mobileCard}>
          <RowSummary row={issue.row} />
          <p className={styles.issueMessage}>{issue.message}</p>
          <Button variant="outline" size="sm" onClick={() => onEdit?.(issue.row, issue.field)}>
            Fix
          </Button>
        </div>
      )}
    />
  );
}
