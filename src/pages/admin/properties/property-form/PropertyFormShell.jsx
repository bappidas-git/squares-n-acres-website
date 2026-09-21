import { Icon } from '@iconify/react';

import AdminTabs, { AdminTabPanel } from '../../../../components/admin/AdminTabs';
import { Button } from '../../../../components/ui';
import useBreakpoint from '../../../../hooks/useBreakpoint';
import DraftBanner from './DraftBanner';
import StatusRail from './StatusRail';
import TABS from './tabs';
import { PropertyFormProvider } from './PropertyFormContext';

import styles from '../PropertyFormPage.module.css';
import { FORMS } from '../../../../config/adminCopy';

/**
 * The property form's body: the draft banner, the sixteen tabs, and the rail.
 *
 * From 1200 px the rail sits beside the form and stays with it as the tab
 * scrolls; below that it folds into an accordion above the tabs and the two
 * writes an editor actually reaches for follow the page in a sticky bar (§6 of
 * prompt 18).
 *
 * The tabs themselves know nothing of any of this: they read the form through
 * `PropertyFormContext`.
 *
 * @param {object} props
 * @param {ReturnType<import('./usePropertyForm').default>} props.form
 */
export default function PropertyFormShell({ form }) {
  const { width } = useBreakpoint();
  const beside = width === 'lg';

  const {
    values,
    errors,
    errorsByTab,
    activeTab,
    setActiveTab,
    validateTab,
    state,
    dispatch,
    setField,
    setFields,
    setComputed,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    readOnly,
    isNew,
    propertyId,
    saving,
    busy,
    save,
    focusField,
    draftOffer,
    restoreDraft,
    discardDraft,
  } = form;

  const strip = TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
    errorCount: errorsByTab[tab.key] ?? 0,
  }));

  /** Leaving a tab is when its own rules are read, so the badge appears then. */
  const changeTab = (key) => {
    if (key === activeTab) return;
    validateTab(activeTab);
    setActiveTab(key);
  };

  const api = {
    state,
    dispatch,
    values,
    errors,
    setField,
    setFields,
    // The SEO panel's analysis writes its own score back through the same
    // channel an editor types through; `setComputed` is the one that does not
    // make an untouched form warn about unsaved changes.
    setComputed,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    // A field that lives on another tab is reached by a link rather than by a
    // second copy of the control: Documents points at the brochure on Media,
    // Project & builder at the RERA switch on Basics.
    goToTab: changeTab,
    // The SEO panel's fix hints go further: they name a field, and the form
    // opens the tab that owns it and puts the cursor in it.
    focusField,
    disabled: readOnly,
    isNew,
    propertyId,
  };

  const rail = <StatusRail form={form} collapsible={!beside} />;

  return (
    <PropertyFormProvider value={api}>
      <div className={beside ? styles.layout : styles.stacked}>
        {beside ? null : rail}

        <div className={styles.main}>
          <DraftBanner draft={draftOffer} onRestore={restoreDraft} onDiscard={discardDraft} />

          <AdminTabs
            tabs={strip}
            value={activeTab}
            onChange={changeTab}
            label="Property sections"
          />

          <form
            className={styles.panels}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!readOnly) save('save');
            }}
          >
            {TABS.map((tab) => {
              const Tab = tab.component;
              return (
                <AdminTabPanel key={tab.key} tabKey={tab.key} value={activeTab}>
                  <Tab />
                </AdminTabPanel>
              );
            })}
          </form>
        </div>

        {beside ? <div className={styles.railColumn}>{rail}</div> : null}
      </div>

      {beside || readOnly ? null : (
        <div className={styles.bottomBar}>
          <Button
            variant="outline"
            disabled={saving || busy}
            onClick={() => save('inactive')}
            icon={<Icon icon="mdi:eye-off-outline" width="18" height="18" />}
          >
            Save as inactive
          </Button>
          <Button
            loading={saving || busy}
            onClick={() => save('save')}
            icon={<Icon icon="mdi:content-save-outline" width="18" height="18" />}
          >
            {isNew ? FORMS.create : FORMS.save}
          </Button>
        </div>
      )}
    </PropertyFormProvider>
  );
}
