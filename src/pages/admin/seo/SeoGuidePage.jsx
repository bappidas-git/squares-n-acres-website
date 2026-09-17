import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import Accordion from '../../../components/ui/Accordion';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import { GUIDE_SECTIONS, SEO_GUIDE_TOPICS } from './seoGuideContent';
import { SEO_ENTITY_TYPES, SEO_SCORE_BANDS } from '../../../config/enums';
import { WEIGHTS } from '../../../seo';
import { TextField } from '../../../components/ui/FormField';

import styles from './SeoGuidePage.module.css';

/** `**bold**` and nothing else: a topic is prose, not a template. */
function withEmphasis(text) {
  return String(text)
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) =>
      index % 2 === 1 ? (
        <strong key={`b${index}`}>{part}</strong>
      ) : (
        <span key={`t${index}`}>{part}</span>
      )
    );
}

/**
 * Admin → SEO → Playbook (`/admin/seo/guide`).
 *
 * The boilerplate's sixteen accordions were generic advice with another
 * company's domain and another city's examples in them, and their scoring
 * advice did not match the engine the admin runs (BUG-11, ADD-20). This is the
 * replacement: twenty-five topics about **this** site, in the same order an
 * editor meets the problems, with the weight table read from the engine so the
 * page cannot drift from what the panel scores.
 *
 * It is a reference rather than a course: the search box is there because an
 * editor arrives with a question — "how long should a description be", "when do
 * I nofollow" — and should not have to open six accordions to find it.
 */
export default function SeoGuidePage() {
  const [query, setQuery] = useState('');

  const wanted = query.trim().toLowerCase();

  const matching = useMemo(() => {
    if (!wanted) return SEO_GUIDE_TOPICS;
    return SEO_GUIDE_TOPICS.filter((topic) =>
      [topic.title, topic.summary, ...topic.points].join(' ').toLowerCase().includes(wanted)
    );
  }, [wanted]);

  const sections = GUIDE_SECTIONS.map((section) => ({
    ...section,
    topics: matching.filter((topic) => topic.section === section.id),
  })).filter((section) => section.topics.length > 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="SEO playbook"
        icon="mdi:book-open-page-variant-outline"
        subtitle="How Squares N Acres pages are written to rank — on Google and in AI answers."
        breadcrumbs={[{ label: 'SEO', to: PATHS.adminSeo }, { label: 'Playbook' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            to={PATHS.adminSeo}
            icon={<Icon icon="mdi:chart-line" width="18" height="18" />}
          >
            SEO dashboard
          </Button>
        }
      />

      <Card className={styles.intro}>
        <p>
          Every rule here is the rule the SEO panel scores against. Where a number appears — 50–60
          characters, 0.5–2.5 % keyword density, five images on a listing — it is the engine’s own
          threshold, and the weight table below is read from the engine itself.
        </p>
        <p className={styles.bands}>
          {SEO_SCORE_BANDS.entries.map((band) => (
            <span key={band.value} className={styles.band}>
              <span className={styles[`dot-${band.tone}`]} aria-hidden="true" />
              {band.label}
              {band.min === null
                ? ''
                : ` — ${band.value === 'good' ? '81 and above' : band.value === 'ok' ? '51 to 80' : '50 and below'}`}
            </span>
          ))}
        </p>
      </Card>

      <TextField
        label="Search the playbook"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="canonical, alt text, redirect…"
        className={styles.search}
      />

      {sections.length === 0 ? (
        <p className={styles.noMatch}>
          Nothing in the playbook mentions “{query.trim()}”. Try a shorter phrase.
        </p>
      ) : null}

      {sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <Accordion
            defaultOpen={wanted ? section.topics.map((topic) => topic.id) : []}
            items={section.topics.map((topic) => ({
              id: topic.id,
              title: (
                <span className={styles.topicTitle}>
                  <Icon icon={topic.icon} width="20" height="20" aria-hidden="true" />
                  <span>
                    {topic.title}
                    <small>{topic.summary}</small>
                  </span>
                </span>
              ),
              content: <TopicBody topic={topic} />,
            }))}
          />
        </section>
      ))}
    </div>
  );
}

/** One topic: its points, its example, and — for one topic — the weight table. */
function TopicBody({ topic }) {
  return (
    <div className={styles.topic}>
      <ul className={styles.points}>
        {topic.points.map((point) => (
          <li key={point.slice(0, 48)}>{withEmphasis(point)}</li>
        ))}
      </ul>

      {topic.render === 'weights' ? <WeightsTable /> : null}

      {topic.example ? (
        <div className={styles.example}>
          {topic.example.good ? (
            <p className={styles.good}>
              <Icon icon="mdi:check-circle-outline" width="18" height="18" aria-hidden="true" />
              <span>{topic.example.good}</span>
            </p>
          ) : null}
          {topic.example.bad ? (
            <p className={styles.bad}>
              <Icon icon="mdi:close-circle-outline" width="18" height="18" aria-hidden="true" />
              <span>{topic.example.bad}</span>
            </p>
          ) : null}
          {topic.example.note ? <p className={styles.note}>{topic.example.note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * What each test is worth, per kind of record — printed from `WEIGHTS`.
 *
 * Reading the engine rather than repeating it is the point: a test added in
 * `src/seo` appears here on the next build, and a number here can never be a
 * number the panel does not use (`docs/SEO_ENGINE.md` §4).
 */
export function WeightsTable() {
  const types = SEO_ENTITY_TYPES.values.filter((type) => WEIGHTS[type]);
  const testIds = useMemo(() => {
    const ids = new Set();
    for (const type of types) Object.keys(WEIGHTS[type] ?? {}).forEach((id) => ids.add(id));
    return [...ids].sort();
  }, [types]);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.tableCaption}>
          Marks out of 100 per test, by kind of record. Every column adds up to 100.
        </caption>
        <thead>
          <tr>
            <th scope="col">Test</th>
            {types.map((type) => (
              <th key={type} scope="col">
                {SEO_ENTITY_TYPES.labelOf(type)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {testIds.map((id) => (
            <tr key={id}>
              <th scope="row">
                <code>{id}</code>
              </th>
              {types.map((type) => (
                <td key={type}>{WEIGHTS[type]?.[id] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
