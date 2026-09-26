import { useMemo } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { Alert, Button, Chip, SwitchField } from '../../../../../components/ui';
import { SECTION_DEFINITIONS, getSectionHints } from '../../../../../utils/propertySections';
import { useBanks } from '../../../../../hooks/useMasterData';
import { propertyFieldId } from '../fieldFocus';
import toPayload from '../toPayload';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/**
 * Tab 14 — Section visibility.
 *
 * Eighteen switches, one per block of the public page (§6.1). A section renders
 * only when it is switched **on** and the listing has something to put in it, so
 * each row says which half is missing: "No data yet — add images in Media" while
 * a switch is on over nothing, "Hidden" while it is off. The rules are
 * `src/utils/propertySections.js`, which is the same module the page itself
 * reads — the toggle and the page cannot disagree (BUG-06).
 *
 * The switches write `true` and `false` explicitly. The boilerplate read
 * `!== false` and wrote `!value`, so the first press of a key the record did not
 * carry was a no-op on screen (NEW-09/ADD-22).
 *
 * The chips read the listing as it will be saved: a floor-plan row with no
 * drawing, or a question with no answer, is dropped by the save, and counting
 * it said "Showing" over a section the page would leave out.
 */
export default function SectionVisibilityTab() {
  const { values, errors, setField, disabled } = usePropertyFormContext();
  const banks = useBanks();

  const context = useMemo(() => ({ banksAvailable: banks.length > 0 }), [banks.length]);
  const rows = useMemo(() => getSectionHints(toPayload(values), context), [values, context]);

  const shown = rows.filter((row) => row.visible).length;
  const off = rows.filter((row) => !row.enabled).length;

  /** Every key written at once, so no toggle can be left `undefined`. */
  const setAll = (enabled) =>
    setField(
      'sectionVisibility',
      Object.fromEntries(SECTION_DEFINITIONS.map((section) => [section.key, enabled]))
    );

  return (
    <FormSection
      title="Section visibility"
      description="What the public page shows. A section appears only when it is switched on and this listing holds something to put in it."
      action={
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || off === 0}
            icon={<Icon icon="mdi:eye-outline" width="16" height="16" />}
            onClick={() => setAll(true)}
          >
            Enable all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || off === rows.length}
            icon={<Icon icon="mdi:eye-off-outline" width="16" height="16" />}
            onClick={() => setAll(false)}
          >
            Disable all
          </Button>
        </div>
      }
    >
      <FormColumn>
        <p className={styles.counter} aria-live="polite">
          <span>
            {shown} of {rows.length} sections show on the page
          </span>
          {off > 0 ? <span>{off} switched off</span> : null}
        </p>

        <ul className={styles.visibilityList}>
          {rows.map((row) => (
            <li key={row.key} className={styles.visibilityRow}>
              <SwitchField
                id={propertyFieldId(`sectionVisibility.${row.key}`)}
                className={styles.visibilitySwitch}
                label={row.label}
                checked={row.enabled}
                disabled={disabled}
                hint={row.description}
                error={errors[`sectionVisibility.${row.key}`]}
                onChange={(next) => setField(`sectionVisibility.${row.key}`, next === true)}
              />
              {/* The chip carries the section's name for a screen reader: "Hidden"
                  on its own, eighteen times over, says nothing. */}
              <Chip
                tone={
                  !row.hint
                    ? 'success'
                    : !row.enabled
                      ? 'neutral'
                      : row.automatic
                        ? 'info'
                        : 'warning'
                }
                className={styles.visibilityChip}
                aria-label={`${row.label}: ${row.hint || 'Showing'}`}
              >
                {row.hint || 'Showing'}
              </Chip>
            </li>
          ))}
        </ul>

        <Alert tone="info" icon={<Icon icon="mdi:information-outline" width="20" height="20" />}>
          Switching the enquiry section off hides the block inside the page only — the sticky bar
          and every “Enquire” button stay, so a visitor can always reach you.
        </Alert>
      </FormColumn>
    </FormSection>
  );
}
