import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import careerService from '../../../services/careerService';
import useApi from '../../../hooks/useApi';
import { Chip, Container, EmptyState, Section, SectionHeader } from '../../ui';
import { EMPLOYMENT_TYPES } from '../../../config/enums';

import styles from './blocks.module.css';

/**
 * The open roles (§6.10 `jobs`, D27).
 *
 * `GET /jobs` answers the active postings already (§5.14), so the block neither
 * filters nor sorts. Each card opens `/careers/<slug>`, which is where the
 * role is described in full and where it is applied for (prompt 31): one
 * opening is a URL people forward, not a dialog.
 *
 * With no openings the band says so rather than disappearing: "no openings
 * right now" is information a visitor came for, unlike an empty features grid.
 */
export default function JobsBlock({ data = {}, background = 'bg' }) {
  const { data: fetched, loading } = useApi(
    (signal) => careerService.jobs({ perPage: 24 }, { signal }),
    [],
    { initialData: [] }
  );

  const jobs = Array.isArray(fetched) ? fetched : [];

  return (
    <Section background={background} spacing="lg" id="openings">
      <Container>
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}

        {loading ? null : jobs.length === 0 ? (
          <EmptyState
            icon={<Icon icon="mdi:briefcase-outline" width="28" height="28" />}
            title="No openings right now"
            text="Nothing is advertised at the moment. Send us your profile anyway — we keep them."
            compact
          />
        ) : (
          <ul className={styles.jobs}>
            {jobs.map((job) => (
              <li key={job.id}>
                <Link to={PATHS.job(job.slug)} className={styles.job}>
                  <span className={styles.jobBody}>
                    <span className={styles.jobTitle}>{job.title}</span>
                    <span className={styles.jobChips}>
                      {job.department ? <Chip size="sm">{job.department}</Chip> : null}
                      {job.location ? <Chip size="sm">{job.location}</Chip> : null}
                      {job.employmentType ? (
                        <Chip size="sm" tone="info">
                          {EMPLOYMENT_TYPES.labelOf(job.employmentType)}
                        </Chip>
                      ) : null}
                    </span>
                  </span>
                  <span className={styles.jobApply}>
                    View &amp; apply
                    <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  );
}
