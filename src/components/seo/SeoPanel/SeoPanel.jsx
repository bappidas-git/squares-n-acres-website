import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AdminTabs, { AdminTabPanel } from '../../admin/AdminTabs';
import AdvancedTab from './tabs/AdvancedTab';
// Social before General, out of alphabetical order: Social brings
// `ImageField`'s stylesheet and General `MultiSelect`'s, and the SEO settings
// page — which shares a chunk with this panel — reaches them in that order. Two
// orders for one chunk is a mini-css-extract "Conflicting order", which
// `build:ci` refuses.
import SocialTab from './tabs/SocialTab';
import GeneralTab from './tabs/GeneralTab';
import SchemaTab from './tabs/SchemaTab';
import useSeoAnalysis from './useSeoAnalysis';
import { SeoPanelProvider } from './SeoPanelContext';
import { resolveSeoOutput } from '../../../seo';
import { setIn } from '../../../hooks/useForm';
import { withSeoDefaults } from '../seoValues';
import { useMasterData } from '../../../contexts/MasterDataContext';
import { useSeoSettings, useSiteSeoIndex } from './useSiteSeoIndex';

import styles from './SeoPanel.module.css';

/** The dotted path of a control, so a test's hint can put the cursor in it. */
export const fieldId = (path) => `seo-field-${String(path).replace(/[^a-zA-Z0-9]+/g, '-')}`;

/** Which tab owns a dotted path — where a hint click has to go first. */
export const TAB_OF_FIELD = [
  ['schema', ['seo.schema']],
  ['social', ['seo.og', 'seo.twitter']],
  [
    'advanced',
    ['seo.robots', 'seo.canonicalUrl', 'seo.breadcrumbTitle', 'seo.sitemap', 'seo.redirect'],
  ],
  [
    'general',
    [
      'seo.focusKeyword',
      'seo.secondaryKeywords',
      'seo.title',
      'seo.description',
      'seo.slug',
      'slug',
    ],
  ],
];

const owns = (prefix, path) => path === prefix || path.startsWith(`${prefix}.`);

/** Paths whose control carries another path's id — the permalink is the record's slug (D34). */
const FIELD_ALIASES = { 'seo.slug': 'slug' };

/** How long a focus request keeps looking for a control the tab switch has not drawn yet. */
const FOCUS_ATTEMPTS = 10;
const FOCUS_RETRY_MS = 50;

/**
 * The panel's control for a path: its own id, else the nearest ancestor's
 * (`seo.og.imageUrl` → `seo.og`).
 *
 * @param {string} path
 * @returns {HTMLElement|null}
 */
export function findSeoControl(path) {
  const parts = String(FIELD_ALIASES[path] ?? path).split('.');
  while (parts.length > 0) {
    const element = document.getElementById(fieldId(parts.join('.')));
    if (element) return element;
    parts.pop();
  }
  return null;
}

/**
 * The panel's own tab for a path, or `null` when the field lives in the host
 * form — `content`, `images`, `faqs` and the rest of the record.
 *
 * @param {string} path
 * @returns {string|null}
 */
export function tabOfSeoField(path) {
  const found = TAB_OF_FIELD.find(([, prefixes]) =>
    prefixes.some((prefix) => owns(prefix, String(path)))
  );
  return found ? found[0] : null;
}

const TABS = [
  { key: 'general', label: 'General', icon: 'mdi:magnify', component: GeneralTab },
  { key: 'social', label: 'Social', icon: 'mdi:share-variant-outline', component: SocialTab },
  { key: 'advanced', label: 'Advanced', icon: 'mdi:tune-variant', component: AdvancedTab },
  { key: 'schema', label: 'Schema', icon: 'mdi:code-json', component: SchemaTab },
];

/**
 * The SEO panel (00_MASTER_CONTEXT.md §9.1, SEO-05…SEO-13, D87).
 *
 * Four tabs over one record: **General** (the focus keyword, the snippet, the
 * search preview and the score), **Social** (the two cards), **Advanced** (the
 * robots directives, the canonical, the redirect and the sitemap entry) and
 * **Schema** (the JSON-LD). Everything in it is a view of the `seo` branch of
 * §9.6 and of the analysis `src/seo` computes from the record — which means
 * the panel holds no state of its own beyond which tab is open: the host form
 * owns the values, and every edit is an `onChange` away from being in them.
 *
 * The host is asked for three things and given one:
 *
 *   <SeoPanel
 *     entityType="property"
 *     entity={values}                          // the record as the form holds it
 *     seo={values.seo}
 *     onChange={(patch) => setField('seo', { ...values.seo, ...patch })}
 *     onFocusField={(path) => form.focusField(path)}   // 'content' → the body tab
 *   />
 *
 * — and in exchange the analysis writes `score`, `scoreBand`, `testsPassed`,
 * `testsTotal`, `analysis` and `lastAnalyzedAt` back through the same
 * `onChange`, so the record the form saves carries them (§9.6). Those writes
 * carry `{ computed: true }` as a second argument: they are the panel's own
 * arithmetic, not an edit, and a host that warns about unsaved changes has to
 * be able to tell the two apart.
 *
 * @param {object} props
 * @param {string} props.entityType one of `SEO_ENTITY_TYPES`
 * @param {object} props.entity
 * @param {object} [props.seo] defaults to `entity.seo`
 * @param {(patch: object, meta?: {computed?: boolean}) => void} props.onChange a
 *   **shallow** patch of `seo`; `meta.computed` marks the analysis writing its
 *   own results back rather than a person changing something
 * @param {(path: string) => void} [props.onFocusField] a path the panel does not
 *   own — the host opens the tab that does and focuses the control
 * @param {'full'|'compact'} [props.variant] `compact` puts General inline and
 *   folds the other three into disclosures (D87)
 * @param {string} [props.siteUrl] overrides `seoSettings.siteUrl`
 * @param {object} [props.seoSettings] overrides the loaded settings
 * @param {object} [props.context] merged over the master data and the site index
 * @param {Record<string, string>} [props.errors] the host's error map
 * @param {boolean} [props.disabled]
 * @param {(slug: string) => void} [props.onSlugChange] D34 — the panel edits the
 *   entity's slug, and without this the slug field is read-only
 * @param {Function} [props.checkSlug] the host's availability check
 * @param {number|string|null} [props.excludeId]
 * @param {string} [props.slugBase] e.g. `/properties/`
 * @param {string} [props.initialField] a dotted path to open on and focus — what
 *   the SEO dashboard's "Fix" hands the panel when a failed test is clicked
 *   (prompt 37); ignored for a path the panel does not own
 * @param {{path: string, nonce: number}|null} [props.focusRequest] a field the
 *   host wants the cursor in after the panel mounted — a save that failed on
 *   `seo.title`. A new `nonce` asks again, so the same path can be asked for twice.
 */
export default function SeoPanel({
  entityType,
  entity,
  seo: seoProp,
  onChange,
  onFocusField,
  variant = 'full',
  siteUrl: siteUrlProp,
  seoSettings: seoSettingsProp,
  context: contextProp,
  errors = {},
  disabled = false,
  onSlugChange,
  checkSlug,
  excludeId,
  slugBase,
  initialField,
  focusRequest = null,
}) {
  const [activeTab, setActiveTab] = useState(
    () => (initialField ? tabOfSeoField(initialField) : null) ?? 'general'
  );
  const masterData = useMasterData();
  const { rows: siteIndex } = useSiteSeoIndex();
  const { settings: loadedSettings } = useSeoSettings();

  const seoSettings = seoSettingsProp ?? loadedSettings;
  const siteUrl = siteUrlProp ?? seoSettings?.siteUrl ?? '';

  const seo = useMemo(() => withSeoDefaults(seoProp ?? entity?.seo), [seoProp, entity?.seo]);

  // The record the analysis reads is the form's, with the `seo` branch the
  // panel is editing: a title typed a second ago has not reached `entity.seo`
  // in every host, and the analysis must measure what is on screen.
  const record = useMemo(() => ({ ...(entity ?? {}), seo }), [entity, seo]);

  const context = useMemo(
    () => ({
      seoSettings,
      siteUrl,
      siteIndex,
      localities: masterData.localities,
      cities: masterData.cities,
      propertyTypes: masterData.propertyTypes,
      developers: masterData.developers,
      amenities: masterData.amenities,
      banksAvailable: (masterData.banks ?? []).length > 0,
      ...contextProp,
    }),
    [seoSettings, siteUrl, siteIndex, masterData, contextProp]
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Flagged `computed`, because a host that guards against unsaved changes has
  // to tell the analysis landing from the editor typing: the first analysis
  // runs on mount, and counting it as an edit made a blank form claim to have
  // changes before anyone had made one (`useForm.setComputed`).
  const storeAnalysis = useCallback(
    (patch) => onChangeRef.current?.(patch, { computed: true }),
    []
  );

  // A read-only panel still reads the page — the score, the checks, the
  // preview are what a sales user opens it for — it just does not write the
  // result back. Switching the analysis off left the score card on its
  // skeleton for good.
  const { analysis, analysing, reanalyse } = useSeoAnalysis({
    entityType,
    entity: record,
    context,
    onResult: disabled ? undefined : storeAnalysis,
  });

  const resolved = useMemo(
    () => resolveSeoOutput(entityType, record, seoSettings, context),
    [entityType, record, seoSettings, context]
  );

  /** One dotted path inside `seo`, as the shallow patch the host merges. */
  const setField = useCallback(
    (path, value) => {
      const [head, ...rest] = String(path)
        .replace(/^seo\./, '')
        .split('.');
      if (rest.length === 0) {
        onChangeRef.current?.({ [head]: value });
        return;
      }
      onChangeRef.current?.({ [head]: setIn(seo[head] ?? {}, rest.join('.'), value) });
    },
    [seo]
  );

  const setSeo = useCallback((patch) => onChangeRef.current?.(patch), []);

  // Focusing a control that has just been revealed has to wait for the render
  // that reveals it. The target carries a counter: keyed on the tab alone, a
  // hint for a field on the tab already open changed nothing, ran nothing, and
  // left the cursor where it was. It starts holding `initialField`, so the
  // effect's first run — on mount — focuses the field the host opened it on.
  const [focusTarget, setFocusTarget] = useState(() =>
    initialField && tabOfSeoField(initialField) ? { path: initialField, nonce: 0 } : null
  );

  const target = useCallback((path, tab) => {
    setActiveTab(tab);
    setFocusTarget((previous) => ({ path, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  const focusField = useCallback(
    (path) => {
      const tab = tabOfSeoField(path);
      if (!tab) {
        onFocusField?.(path);
        return;
      }
      target(path, tab);
    },
    [onFocusField, target]
  );

  // The host's own request never goes back to the host: a path the panel does
  // not know lands on General rather than bouncing between the two forever.
  useEffect(() => {
    if (!focusRequest?.path) return;
    target(focusRequest.path, tabOfSeoField(focusRequest.path) ?? 'general');
  }, [focusRequest, target]);

  useEffect(() => {
    if (!focusTarget) return undefined;
    let attempts = 0;
    let timer = null;

    const attempt = () => {
      attempts += 1;
      const element = findSeoControl(focusTarget.path);
      if (!element) {
        if (attempts < FOCUS_ATTEMPTS) timer = setTimeout(attempt, FOCUS_RETRY_MS);
        return;
      }
      // The compact panel folds its other sections into disclosures, and a
      // control inside a closed one cannot take the cursor.
      const folded = element.closest('details');
      if (folded && !folded.open) folded.open = true;
      element.focus?.({ preventScroll: true });
      element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    };

    timer = setTimeout(attempt, 0);
    return () => clearTimeout(timer);
  }, [focusTarget]);

  const api = {
    entityType,
    entity: record,
    seo,
    setSeo,
    setField,
    analysis,
    analysing,
    reanalyse,
    resolved,
    seoSettings,
    siteUrl,
    context,
    errors,
    focusField,
    setSlug: onSlugChange,
    checkSlug,
    excludeId,
    slugBase,
    disabled,
    variant,
  };

  const errorsByTab = useMemo(() => countErrors(errors), [errors]);

  if (variant === 'compact') {
    return (
      <SeoPanelProvider value={api}>
        <div className={styles.panel}>
          <GeneralTab />
          {TABS.slice(1).map((tab) => {
            const Tab = tab.component;
            const count = errorsByTab[tab.key] ?? 0;
            return (
              <details key={tab.key} className={styles.group} open={count > 0}>
                <summary className={styles.groupSummary}>
                  {tab.label}
                  {count > 0 ? <span className={styles.countFail}>{count}</span> : null}
                </summary>
                <div className={styles.panelBody}>
                  <Tab />
                </div>
              </details>
            );
          })}
        </div>
      </SeoPanelProvider>
    );
  }

  return (
    <SeoPanelProvider value={api}>
      <div className={styles.panel}>
        <AdminTabs
          label="SEO sections"
          value={activeTab}
          onChange={setActiveTab}
          tabs={TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            icon: tab.icon,
            errorCount: errorsByTab[tab.key] ?? 0,
          }))}
        />
        {TABS.map((tab) => {
          const Tab = tab.component;
          return (
            <AdminTabPanel key={tab.key} tabKey={tab.key} value={activeTab}>
              <div className={styles.panelBody}>
                <Tab />
              </div>
            </AdminTabPanel>
          );
        })}
      </div>
    </SeoPanelProvider>
  );
}

/** How many of the host's messages each tab holds — the red badges of `AdminTabs`. */
function countErrors(errors) {
  const counts = {};
  for (const path of Object.keys(errors ?? {})) {
    const tab = tabOfSeoField(path);
    if (tab) counts[tab] = (counts[tab] ?? 0) + 1;
  }
  return counts;
}
