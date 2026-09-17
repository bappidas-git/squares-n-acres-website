import { Suspense, lazy } from 'react';

import Card from '../../../components/ui/Card';
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
  const { data, loading, error, refetch } = useApi(
    (signal) => dashboardService.get({ signal }),
    []
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

        <div className={styles.chartGrid}>
          <Card as="section" className={[styles.card, styles.chartWide].join(' ')}>
            <ChartSlot>
              <LeadsByDayChart data={trends.leadsByDay ?? []} />
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
              <ViewsByDayChart data={trends.viewsByDay ?? []} />
            </ChartSlot>
          </Card>
        </div>

        <div className={styles.columns}>
          <RecentLeadsTable leads={data?.recentLeads ?? []} />
          <FollowUpsCard followUps={data?.upcomingFollowUps ?? []} scoped={isSales} />
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
