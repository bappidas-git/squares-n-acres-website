import { useMemo } from 'react';
import { Icon } from '@iconify/react';

import ContactMethods from '../../components/sections/shared/ContactMethods';
import FaqAccordion from '../../components/sections/shared/FaqAccordion';
import LeadForm from '../../components/common/LeadForm';
import Seo from '../../components/seo/Seo';
import masterDataService from '../../services/masterDataService';
import useApi from '../../hooks/useApi';
import useApiList from '../../hooks/useApiList';
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../components/ui';
import { FAQ_CATEGORIES } from '../../config/enums';
import { leadFormProps } from '../../utils/leadSources';
import { breadcrumbsFor } from '../../seo/breadcrumbs';

import styles from './FAQs.module.css';

/** The API hears the last keystroke, not every one (§5.6). */
const SEARCH_DEBOUNCE_MS = 300;

const LIST_DEFAULTS = { page: 1, perPage: 100, sort: 'order', category: '', q: '' };
const LIST_PARAM_KEYS = { category: 'string', q: 'string' };

/** What the tab row asks for: the categories that actually hold a question. */
const CATEGORY_PROBE = { perPage: 100, sort: 'category' };

/**
 * `/insights/faqs` — every question we are asked often enough to answer here.
 *
 * The category and the search live in the query string (`?category=legal&q=rera`),
 * so a shared link reproduces the view and the back button walks it back, and
 * the filtering is the API's (`GET /faqs?category=&q=`) rather than a browser
 * loop over everything (BUG-18).
 *
 * The contact details under "Still have questions?" come from
 * `siteSettings.general` (D83) — the boilerplate printed a US phone number
 * here (ADD-17).
 *
 * The `<title>` is a temporary Helmet tag; prompt 38 replaces it with `<Seo>`
 * and adds the `FAQPage` structured data these answers deserve.
 */
export default function FAQs() {
  const { items, loading, error, params, setFilters, refetch } = useApiList(
    (listParams, options) => masterDataService.faqs.list(listParams, options),
    {
      syncToUrl: true,
      paramKeys: LIST_PARAM_KEYS,
      defaults: LIST_DEFAULTS,
      debounceMs: SEARCH_DEBOUNCE_MS,
    }
  );

  // The tabs describe the whole collection, so they cannot be read off a
  // filtered answer: one unfiltered request on mount tells the page which of
  // the eight categories are worth offering.
  const { data: everything } = useApi(
    (signal) => masterDataService.faqs.list(CATEGORY_PROBE, { signal }),
    [],
    { initialData: [] }
  );

  const activeCategory = params.category ?? '';
  const search = params.q ?? '';

  const tabs = useMemo(() => {
    const present = new Set((Array.isArray(everything) ? everything : []).map((f) => f.category));
    return [
      { value: '', label: 'All questions' },
      ...FAQ_CATEGORIES.options.filter((option) => present.has(option.value)),
    ];
  }, [everything]);

  /** Without a category tab the list is grouped, so the page stays scannable. */
  const groups = useMemo(() => {
    if (activeCategory) return [{ category: activeCategory, items }];

    const byCategory = new Map();
    items.forEach((faq) => {
      if (!byCategory.has(faq.category)) byCategory.set(faq.category, []);
      byCategory.get(faq.category).push(faq);
    });

    return FAQ_CATEGORIES.values
      .filter((value) => byCategory.has(value))
      .map((value) => ({ category: value, items: byCategory.get(value) }));
  }, [items, activeCategory]);

  const crumbs = breadcrumbsFor('faqs');

  return (
    <>
      {/* Every question on the page, whatever the tab or the search: the
          `FAQPage` has to match what a visitor can actually read here (§9.3). */}
      <Seo
        type="faqs"
        breadcrumbs={crumbs}
        overrides={search ? { noindex: true } : undefined}
        faqs={items}
      />

      <div className={styles.page}>
        <header className={styles.header}>
          <Container size="narrow">
            <Breadcrumbs items={crumbs} className={styles.crumbs} />
            <h1 className={styles.title}>Frequently asked questions</h1>
            <p className={styles.intro}>
              What buying, renting, financing and registering a property in Bengaluru actually
              involves — answered plainly. If yours is not here, ask it at the bottom of the page.
            </p>
          </Container>
        </header>

        <Container size="narrow" className={styles.main}>
          <div className={styles.search}>
            <Icon
              icon="mdi:magnify"
              width="20"
              height="20"
              className={styles.searchIcon}
              aria-hidden="true"
            />
            <label className={styles.srOnly} htmlFor="faq-search">
              Search the questions
            </label>
            <input
              id="faq-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search for a question"
              value={search}
              onChange={(event) => setFilters({ q: event.target.value })}
            />
            {search ? (
              <button
                type="button"
                className={styles.clear}
                aria-label="Clear the search"
                onClick={() => setFilters({ q: '' })}
              >
                <Icon icon="mdi:close" width="18" height="18" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {tabs.length > 1 ? (
            <div className={styles.tabs} role="tablist" aria-label="Question categories">
              {tabs.map((tab) => (
                <button
                  key={tab.value || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === tab.value}
                  className={`${styles.tab} ${activeCategory === tab.value ? styles.tabActive : ''}`}
                  onClick={() => setFilters({ category: tab.value })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <ErrorState
              title="We could not load the questions"
              text={error.message}
              onRetry={refetch}
            />
          ) : loading && items.length === 0 ? (
            <FaqListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Icon icon="mdi:help-circle-outline" width="40" height="40" />}
              title="No questions match"
              text={
                search
                  ? `Nothing here mentions “${search}”. Try another word, or ask us below.`
                  : 'There is nothing in this category yet. Try another one, or ask us below.'
              }
              action={
                search ? (
                  <Button variant="outline" onClick={() => setFilters({ q: '' })}>
                    Clear search
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setFilters({ category: '' })}>
                    Show all questions
                  </Button>
                )
              }
            />
          ) : (
            <div className={styles.groups}>
              {groups.map((group) => (
                <section key={group.category} className={styles.group}>
                  {activeCategory ? null : (
                    <h2 className={styles.groupTitle}>
                      {FAQ_CATEGORIES.labelOf(group.category) || 'General'}
                    </h2>
                  )}
                  <FaqAccordion
                    items={group.items}
                    highlight={search}
                    headingLevel={activeCategory ? 2 : 3}
                  />
                </section>
              ))}
            </div>
          )}
        </Container>

        <section className={styles.ask}>
          <Container size="narrow">
            <div className={styles.askGrid}>
              <div>
                <h2 className={styles.askTitle}>Still have questions?</h2>
                <p className={styles.askText}>
                  Send it over and an advisor comes back with a proper answer rather than a
                  brochure.
                </p>
                <ContactMethods
                  layout="stack"
                  whatsappMessage="Hello, I have a question about a property."
                  className={styles.askContacts}
                />
              </div>

              <LeadForm {...leadFormProps('faq')} submitLabel="Ask us" />
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}

/** The list, at the height it will be, while the answer is on its way (§8.2). */
function FaqListSkeleton({ count = 6 }) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={56} />
      ))}
    </div>
  );
}
