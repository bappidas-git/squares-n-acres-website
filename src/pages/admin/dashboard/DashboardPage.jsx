import { Suspense, lazy } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';

import Card from '../../../components/ui/Card';
import Chip from '../../../components/ui/Chip';
import ErrorState from '../../../components/ui/ErrorState';
import FollowUpsCard from './FollowUpsCard';
import PageHeader from '../../../components/admin/PageHeader';
import QuickLinks from './QuickLinks';
import RecentLeadsTable from './RecentLeadsTable';
import SeoHealthCard from './SeoHealthCard';
import StatCards from './StatCards';
import TopPropertiesCard from './TopPropertiesCard';
import dashboardService from '../../../services/dashboardService';
import useApi from '../../../hooks/useApi';
import { Skeleton } from '../../../components/ui';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

import styles from './DashboardPage.module.css';

/**
 * The four charts are code-split (§3.1).
 *
 * `recharts` is the heaviest thing the admin bundle would otherwise carry, and
 * it is needed on exactly one screen — so it arrives in its own chunk, after
 * the numbers the reader came for are already on the page.
 */
const LeadsByDayChart = lazy(() => import('./charts/LeadsByDayChart'));
const LeadsBySourceChart = lazy(() => import('./charts/LeadsBySourceChart'));
const LeadsByStatusChart = lazy(() => import('./charts/LeadsByStatusChart'));
const ViewsByDayChart = lazy(() => import('./charts/ViewsByDayChart'));

/** How tall a chart's placeholder stands, so nothing jumps when it arrives. */
const CHART_SKELETON_HEIGHT = 280;

/** The days the two day-by-day charts can cover (prompt 51); 30 unless asked. */
const TREND_RANGES = [7, 30, 90];
const DEFAULT_RANGE = 30;

/**
 * Admin → Dashboard (`/admin/dashboard`).
 *
 * One request answers the whole screen (§6.16): the counters, four trends, the
 * newest leads, the best-performing listings, the site's SEO health and the
 * follow-ups that are due. Nothing on the page is computed in the browser and
 * nothing is invented — the boilerplate's "+12 % this month" badges were
 * hardcoded strings (BUG-11) and its figures were three collections
 * re-aggregated client-side (NEW-24); both are gone.
 *
 * The response is role-aware, so this component is mostly not: a sales user
 * gets their own lead figures from the API (D15) and the screen says whose
 * they are, hides the content counters §7 does not give them, and drops the
 * SEO card and the quick links they could not follow.
 */
export default function DashboardPage() {
  const { can, user } = useAdminAuth();
  // The trends' range lives in the address, so a reload or a shared link keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = Number(searchParams.get('range'));
  const range = TREND_RANGES.includes(asked) ? asked : DEFAULT_RANGE;

  const { data, loading, error, refetch } = useApi(
    (signal) => dashboardService.get({ params: { range }, signal }),
    [range],
    // A new range keeps the page on screen while the charts are re-read.
    { keepPreviousData: true }
  );

  const chooseRange = (days) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (days === DEFAULT_RANGE) next.delete('range');
        else next.set('range', String(days));
        return next;
      },
      { replace: true }
    );

  const isSales = user?.role === 'sales';
  const canSeeSeo = can('seo', 'view');
  const canSeeContent = can('articles', 'view');

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className={styles.screen}>
          <div className={styles.statGrid}>
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} height={96} />
            ))}
          </div>
          <Skeleton height={CHART_SKELETON_HEIGHT} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState text={error.message} onRetry={refetch} />
      </>
    );
  }

  const stats = data?.stats ?? {};
  const trends = data?.trends ?? {};

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          isSales
            ? 'Your pipeline, and how the catalogue behind it is doing.'
            : 'How the site, the catalogue and the pipeline are doing.'
        }
      />

      <div className={styles.screen}>
        <StatCards stats={stats} scoped={isSales} showContent={canSeeContent} />

        <div className={styles.rangeRow} role="group" aria-label="Trends over">
          <span className={styles.rowMeta}>Trends over</span>
          {TREND_RANGES.map((days) => (
            <Chip
              key={days}
              tone="info"
              selected={range === days}
              pressed={range === days}
              icon={<Icon icon="mdi:calendar-range" width="14" height="14" />}
              onClick={() => chooseRange(days)}
            >
              {`${days} days`}
            </Chip>
          ))}
        </div>

        <div className={styles.chartGrid}>
          <Card as="section" className={[styles.card, styles.chartWide].join(' ')}>
            <ChartSlot>
              <LeadsByDayChart data={trends.leadsByDay ?? []} days={range} />
            </ChartSlot>
          </Card>

          <Card as="section" className={styles.card}>
            <ChartSlot>
              <LeadsBySourceChart data={trends.leadsBySource ?? []} />
            </ChartSlot>
          </Card>

          <Card as="section" className={styles.card}>
            <ChartSlot>
              <LeadsByStatusChart data={trends.leadsByStatus ?? []} />
            </ChartSlot>
          </Card>

          <Card as="section" className={[styles.card, styles.chartWide].join(' ')}>
            <ChartSlot>
              <ViewsByDayChart data={trends.viewsByDay ?? []} days={range} />
            </ChartSlot>
          </Card>
        </div>

        <div className={styles.columns}>
          <RecentLeadsTable leads={data?.recentLeads ?? []} />
          <FollowUpsCard
            followUps={data?.upcomingFollowUps ?? []}
            overdueCount={data?.overdueCount ?? 0}
            scoped={isSales}
          />
        </div>

        <div className={styles.columns}>
          <TopPropertiesCard
            properties={data?.topProperties ?? []}
            canEdit={can('properties', 'edit')}
          />
          {canSeeSeo ? <SeoHealthCard health={data?.seoHealth ?? {}} /> : null}
        </div>

        <QuickLinks can={can} />
      </div>
    </>
  );
}

/** A chart's chunk, and the shape that holds its place until it lands. */
function ChartSlot({ children }) {
  return <Suspense fallback={<Skeleton height={CHART_SKELETON_HEIGHT} />}>{children}</Suspense>;
}
