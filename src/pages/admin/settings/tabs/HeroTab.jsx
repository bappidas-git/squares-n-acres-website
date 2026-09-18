import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import ImageField from '../../../../components/admin/ImageField';
import MultiSelect from '../../../../components/admin/MultiSelect';
import SortableList from '../../../../components/admin/SortableList';
import StatsEditor from '../parts/StatsEditor';
import styles from '../SettingsPage.module.css';
import { HERO_SEARCH_TABS } from '../../../../config/enums';
import { LIMITS } from '../settingsSchema';
import { TextField, TextareaField } from '../../../../components/ui/FormField';

/**
 * Hero — the first screen of the home page (§6.13 `hero`).
 *
 * The search tabs are a list rather than a set: the first one is the tab the
 * home page opens on, so their order is a decision and not an accident of the
 * enum. Clearing every one of them is legitimate — `HeroSearch` then offers all
 * five — which is why there is no "at least one" rule.
 *
 * The card at the bottom is the layout in miniature: the plate, the veil, the
 * headline, the badges and the counters, drawn from the same values. It is not
 * a screenshot of the home page, and it does not pretend to be one — it is
 * there so an editor can see a headline that is too long before saving it.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function HeroTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const hero = values.hero ?? {};

  const set = (path, value) => setField(`hero.${path}`, value);
  const error = (path) => getError(`hero.${path}`);

  const chosen = (Array.isArray(hero.searchTabs) ? hero.searchTabs : []).filter((tab) =>
    HERO_SEARCH_TABS.has(tab)
  );
  const unchosen = HERO_SEARCH_TABS.values.filter((tab) => !chosen.includes(tab));

  const badges = Array.isArray(hero.badges) ? hero.badges : [];
  const stats = Array.isArray(hero.stats) ? hero.stats : [];
  const plate = hero.backgroundImageUrl || hero.mobileImageUrl || '';

  return (
    <div className={styles.tab}>
      <FormSection title="Headline">
        <FormColumn>
          <TextField
            label="Title"
            value={hero.title ?? ''}
            onChange={(event) => set('title', event.target.value)}
            error={error('title')}
            hint="The one <h1> of the home page — say where and what, not “Welcome”."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <TextareaField
            label="Subtitle"
            rows={2}
            value={hero.subtitle ?? ''}
            onChange={(event) => set('subtitle', event.target.value)}
            error={error('subtitle')}
            hint="One sentence under the headline."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Media"
        description="The desktop plate is wide; the phone one is portrait, and the browser picks between them before the first paint."
      >
        <FormColumn half>
          <ImageField
            label="Background image"
            hint="hero"
            value={hero.backgroundImageUrl ?? ''}
            onChange={(next) => set('backgroundImageUrl', next)}
            error={error('backgroundImageUrl')}
            alt="The home page hero"
            folder="hero"
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <ImageField
            label="Mobile image"
            ratio="3 / 4"
            value={hero.mobileImageUrl ?? ''}
            onChange={(next) => set('mobileImageUrl', next)}
            error={error('mobileImageUrl')}
            alt="The home page hero on a phone"
            folder="hero"
            disabled={disabled}
          />
          <p className={styles.hint}>
            Recommended 1080 × 1440 px — portrait, and the subject high enough to survive the
            headline over it.
          </p>
        </FormColumn>
        <FormColumn>
          <ImageField
            label="Background video"
            accept="video"
            preview={false}
            value={hero.backgroundVideoUrl ?? ''}
            onChange={(next) => set('backgroundVideoUrl', next)}
            error={error('backgroundVideoUrl')}
            folder="hero"
            disabled={disabled}
          />
          <p className={styles.hint}>
            A video plays over the image on wide screens and is skipped on phones and whenever
            reduced motion is asked for. The image is still needed as its poster.
          </p>
        </FormColumn>
      </FormSection>

      <FormSection
        title="Search tabs"
        description="Which searches the hero offers, in the order it offers them; the first is the one it opens on. Clear them all to show the five."
      >
        <FormColumn>
          {chosen.length > 0 ? (
            <SortableList
              label="Chosen search tabs"
              items={chosen}
              disabled={disabled}
              getId={(tab) => tab}
              getLabel={(tab) => HERO_SEARCH_TABS.labelOf(tab)}
              onReorder={(next) => set('searchTabs', next)}
              renderItem={(tab, index) => (
                <span className={styles.tabRow}>
                  <label className={styles.tabRowLabel}>
                    <input
                      type="checkbox"
                      checked
                      disabled={disabled}
                      onChange={() =>
                        set(
                          'searchTabs',
                          chosen.filter((entry) => entry !== tab)
                        )
                      }
                    />
                    {HERO_SEARCH_TABS.labelOf(tab)}
                  </label>
                  <span className={styles.tabRowPosition}>
                    {index === 0 ? 'Opens here' : `Position ${index + 1}`}
                  </span>
                </span>
              )}
            />
          ) : (
            <p className={styles.repeaterEmpty}>
              No tab chosen — the hero offers all five, in the order above.
            </p>
          )}

          {unchosen.length > 0 ? (
            <div className={styles.actionRow}>
              {unchosen.map((tab) => (
                <label key={tab} className={styles.tabRowLabel}>
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={disabled}
                    onChange={() => set('searchTabs', [...chosen, tab])}
                  />
                  {HERO_SEARCH_TABS.labelOf(tab)}
                </label>
              ))}
            </div>
          ) : null}

          {error('searchTabs') ? (
            <span role="alert" className={styles.warning}>
              {error('searchTabs')}
            </span>
          ) : null}
        </FormColumn>
      </FormSection>

      <FormSection
        title="Counters"
        description="Numbers the firm can stand behind. An empty list hides the strip (§14)."
      >
        <FormColumn>
          <StatsEditor
            value={stats}
            onChange={(rows) => set('stats', rows)}
            errorAt={(path) => error(`stats.${path}`)}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="Badges">
        <FormColumn>
          <MultiSelect
            label="Badges"
            options={badges.map((badge) => ({ value: badge, label: badge }))}
            value={badges}
            onChange={(next) => set('badges', next)}
            creatable
            onCreate={(label) => ({ value: label.trim(), label: label.trim() })}
            max={LIMITS.heroBadges}
            hint="Short claims above the headline — “RERA-registered”, “Site visits in 24 hours”."
            error={error('badges')}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="Preview" description="The same values, at a tenth of the size.">
        <FormColumn>
          <div className={styles.heroCard}>
            {plate ? (
              <>
                <img src={plate} alt="" className={styles.heroCardMedia} />
                <span className={styles.heroCardVeil} />
              </>
            ) : null}
            <div
              className={[styles.heroCardBody, plate ? styles.heroCardOnMedia : '']
                .filter(Boolean)
                .join(' ')}
            >
              {badges.length > 0 ? (
                <div className={styles.heroCardChips}>
                  {badges.map((badge) => (
                    <span key={badge} className={styles.heroCardChip}>
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className={styles.heroCardTitle}>
                {hero.title || 'Find your next home in Bengaluru'}
              </p>
              {hero.subtitle ? <p className={styles.heroCardSubtitle}>{hero.subtitle}</p> : null}
              {stats.length > 0 ? (
                <div className={styles.heroCardStats}>
                  {stats.map((stat, index) => (
                    <div key={`${stat?.label}-${index}`} className={styles.heroCardStat}>
                      <span className={styles.heroCardStatValue}>
                        {stat?.value}
                        {stat?.suffix ?? ''}
                      </span>
                      <span className={styles.heroCardStatLabel}>{stat?.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </FormColumn>
      </FormSection>
    </div>
  );
}
