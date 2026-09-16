import { Icon } from '@iconify/react';

import { Button } from '../../ui';
import DeveloperCard from '../developer/DeveloperCard';
import DeveloperStats from '../developer/DeveloperStats';
import PATHS from '../../../routes/paths';
import SectionShell from './SectionShell';
import { formatNumber } from '../../../utils/format';
import { useDevelopers } from '../../../hooks/useMasterData';

import styles from './BuilderSection.module.css';

/**
 * Who is building it.
 *
 * The property record embeds only `{id, name, slug, logoUrl}` for its developer
 * (§6.1), so the rest — the year, the counts, the highlights — comes from the
 * developer list the app already holds (`MasterDataContext`, D93); nothing is
 * fetched twice and nothing is invented when the list has not arrived.
 *
 * The boilerplate's version returned `null` for a builder that had only a
 * description, which is most of them (§11, additional defect 14). A name is
 * enough to render this section.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function BuilderSection({ property, background = 'bg' }) {
  const developers = useDevelopers();

  const embedded = property?.project?.developer ?? null;
  const developerId = property?.project?.developerId ?? embedded?.id ?? null;

  const full = developers.find((record) => String(record.id) === String(developerId ?? '')) ?? null;
  const developer = full ?? embedded;

  if (!developer?.name) return null;

  const highlights = (Array.isArray(developer.highlights) ? developer.highlights : [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  const count = typeof developer.propertyCount === 'number' ? developer.propertyCount : null;

  return (
    <SectionShell id="builder" title="About the builder" background={background}>
      <div className={styles.layout}>
        <DeveloperCard developer={developer} />

        <div className={styles.body}>
          {highlights.length > 0 ? (
            <ul className={styles.highlights}>
              {highlights.map((item) => (
                <li key={item} className={styles.highlight}>
                  <Icon
                    icon="mdi:check-circle-outline"
                    className={styles.highlightIcon}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {developer.slug ? (
            <Button
              variant="outline"
              size="sm"
              to={PATHS.builder(developer.slug)}
              className={styles.link}
              iconRight={<Icon icon="mdi:arrow-right" aria-hidden="true" />}
            >
              {count === null
                ? `View ${developer.name}`
                : `View ${formatNumber(count)} ${count === 1 ? 'project' : 'projects'} by ${developer.name}`}
            </Button>
          ) : null}
        </div>
      </div>

      <DeveloperStats developer={developer} headingLevel={3} headingId="property-builder-facts" />
    </SectionShell>
  );
}
