import { Icon } from '@iconify/react';
import { Link, useParams } from 'react-router-dom';

// `NotFound` leads the component imports for the reason `CmsPage` gives: an
// unknown slug is the commonest thing this route renders, and
// `mini-css-extract-plugin` refuses to emit a stylesheet two chunks disagree
// about the order of.
import NotFound from './NotFound';
import SafeHtml from '../../components/editor/SafeHtml';
import PATHS from '../../routes/paths';
import Seo from '../../components/seo/Seo';
import careerService from '../../services/careerService';
import useApi from '../../hooks/useApi';
import { Container, ErrorState, Skeleton } from '../../components/ui';
import { JobApplyForm, JobHeader } from '../../components/sections/careers';
import { breadcrumbsFor } from '../../seo/breadcrumbs';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

import styles from './JobDetail.module.css';

/** The id `JobHeader`'s Apply button scrolls to. */
const APPLY_ID = 'apply';

/**
 * Whether an opening still takes applications (§6.11, §7 of prompt 31).
 *
 * The API decides this too — `GET /jobs/slug/:slug` answers `isOpen` and
 * `POST /jobs/:id/apply` refuses a closed role with a 404 — but the page has
 * to draw a notice rather than a form, so it asks the same question of the
 * record it was given. `closesAt` is a date, so the day it names is the last
 * day the role is open.
 *
 * Exported for the unit test.
 *
 * @param {object|null} job
 * @param {number} [now]
 * @returns {boolean}
 */
export function isJobClosed(job, now = Date.now()) {
  if (!job) return false;
  if (typeof job.isOpen === 'boolean') return !job.isOpen;
  if (!job.isActive) return true;
  if (!job.closesAt) return false;

  const closes = Date.parse(`${String(job.closesAt).slice(0, 10)}T23:59:59.999Z`);
  return Number.isFinite(closes) && closes < now;
}

/** A list of responsibilities or requirements, or nothing at all. */
function BulletList({ title, items, icon }) {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  if (rows.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby={`job-${title.toLowerCase()}`}>
      <h2 className={styles.blockTitle} id={`job-${title.toLowerCase()}`}>
        {title}
      </h2>
      <ul className={styles.bullets}>
        {rows.map((row) => (
          <li key={row} className={styles.bullet}>
            <Icon icon={icon} width="20" height="20" aria-hidden="true" className={styles.tick} />
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * `/careers/:jobSlug` — one opening, and the form that applies for it.
 *
 * The role's own page is what a job board, a WhatsApp forward and a search
 * result link to, which is why the application lives here rather than behind a
 * dialog on the careers page: the URL is the thing people share.
 *
 * A slug nobody has published answers 404 and the site's own 404 is what
 * renders. A role that has closed is still readable — somebody following a
 * three-week-old link should see what the job was and that it has gone, not a
 * dead end — with the form replaced by a notice and a way back to the others.
 *
 * The head is `<Seo type="job">`, whose graph carries the `JobPosting` Google
 * for Jobs reads — and a closed role is `noindex`, because a listing nobody can
 * apply to is not a result worth showing (§9.3).
 */
export default function JobDetail() {
  const { jobSlug } = useParams();
  const { siteName } = useSiteSettings();

  const {
    data: job,
    loading,
    error,
    refetch,
  } = useApi((signal) => careerService.jobBySlug(jobSlug, { signal }), [jobSlug]);

  if (error?.status === 404) {
    return (
      <NotFound
        title="This role is no longer listed"
        subtitle="The opening you followed has been taken down. The current ones are on the careers page."
      />
    );
  }

  if (loading) return <JobDetailSkeleton />;

  if (error || !job) {
    return (
      <Container className={styles.stateWrap}>
        <ErrorState title="We could not load this role" text={error?.message} onRetry={refetch} />
      </Container>
    );
  }

  const closed = isJobClosed(job);
  const breadcrumbs = breadcrumbsFor('job', job);
  const summary = [job.department, job.location].filter(Boolean).join(' · ');

  return (
    <>
      <Seo
        type="job"
        entity={job}
        title={`${job.title} — Careers`}
        description={
          summary
            ? `${job.title} — ${summary}. Apply to join ${siteName}.`
            : `${job.title} — apply to join ${siteName}.`
        }
        breadcrumbs={breadcrumbs}
        overrides={closed ? { noindex: true } : undefined}
      />

      <article className={styles.page}>
        <Container className={styles.layout}>
          <div className={styles.main}>
            <JobHeader job={job} breadcrumbs={breadcrumbs} closed={closed} applyId={APPLY_ID} />

            {closed ? (
              <p className={styles.closedBanner} role="status">
                <Icon icon="mdi:information-outline" width="20" height="20" aria-hidden="true" />
                <span>
                  This opening is closed.{' '}
                  <Link to={PATHS.careers} className={styles.closedLink}>
                    See the roles we are hiring for
                  </Link>
                  .
                </span>
              </p>
            ) : null}

            {job.description ? (
              <section className={styles.block} aria-labelledby="job-about">
                <h2 className={styles.blockTitle} id="job-about">
                  About the role
                </h2>
                <SafeHtml html={job.description} />
              </section>
            ) : null}

            <BulletList
              title="Responsibilities"
              items={job.responsibilities}
              icon="mdi:check-circle-outline"
            />
            <BulletList
              title="Requirements"
              items={job.requirements}
              icon="mdi:chevron-right-circle-outline"
            />
          </div>

          <aside className={styles.side} aria-label="Apply">
            <div className={styles.sticky}>
              <JobApplyForm job={job} closed={closed} id={APPLY_ID} />
            </div>
          </aside>
        </Container>
      </article>
    </>
  );
}

/** The layout, before the answer arrives (§8.2). */
function JobDetailSkeleton() {
  return (
    <Container className={styles.layout}>
      <div className={styles.main}>
        <Skeleton width="40%" height="16px" />
        <Skeleton width="70%" height="40px" />
        <Skeleton width="55%" height="20px" />
        <Skeleton height="180px" />
        <Skeleton height="140px" />
      </div>
      <aside className={styles.side} aria-hidden="true">
        <Skeleton height="420px" />
      </aside>
    </Container>
  );
}
