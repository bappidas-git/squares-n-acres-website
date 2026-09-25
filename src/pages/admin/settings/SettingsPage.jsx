import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';

import AdminTabs, { AdminTabPanel } from '../../../components/admin/AdminTabs';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import ContactTab from './tabs/ContactTab';
import ErrorState from '../../../components/ui/ErrorState';
import GeneralTab from './tabs/GeneralTab';
import HeroTab from './tabs/HeroTab';
import IntegrationsTab from './tabs/IntegrationsTab';
import LeadNotificationsTab from './tabs/LeadNotificationsTab';
import NavigationFooterTab from './tabs/NavigationFooterTab';
import NewsletterTab from './tabs/NewsletterTab';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import Skeleton from '../../../components/ui/Skeleton';
import focusFirstError from '../../../components/admin/focusFirstError';
import settingsService from '../../../services/settingsService';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { EVENTS, emit } from '../../../utils/events';
import { firstFieldMessage } from '../../../services/apiError';
import {
  changedSettings,
  displayedAt,
  normalizeSettings,
  prepareSettings,
  settingsErrors,
  settingsLabel,
  settingsSchema,
  validateSettings,
} from './settingsSchema';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SettingsPage.module.css';
import { FORMS, TOASTS } from '../../../config/adminCopy';

/** The seven panels of §6.13, in the order an editor meets them. */
export const SETTINGS_TABS = [
  { key: 'general', label: 'General', icon: 'mdi:office-building-outline' },
  { key: 'contact', label: 'Contact', icon: 'mdi:phone-outline' },
  { key: 'hero', label: 'Hero', icon: 'mdi:image-text' },
  { key: 'navigation', label: 'Navigation & footer', icon: 'mdi:page-layout-footer' },
  { key: 'newsletter', label: 'Newsletter', icon: 'mdi:email-newsletter' },
  { key: 'integrations', label: 'Integrations', icon: 'mdi:puzzle-outline' },
  { key: 'leads', label: 'Lead notifications', icon: 'mdi:bell-ring-outline' },
];

/** The panel the screen opens on when the address names none. */
const DEFAULT_TAB = 'general';

const isSettingsTab = (key) => SETTINGS_TABS.some((entry) => entry.key === key);

/**
 * Which tab owns a dotted path — so a message lands on a panel an editor can
 * find. `general` is split across two of them: the identity half is General and
 * everything a visitor would dial, write to or drive to is Contact.
 */
const TAB_OF_FIELD = [
  [
    'contact',
    [
      'general.contactEmail',
      'general.contactPhone',
      'general.alternatePhone',
      'general.whatsappNumber',
      'general.whatsappDefaultMessage',
      'general.address',
      'general.mapEmbedUrl',
      'general.latitude',
      'general.longitude',
      'general.workingHours',
    ],
  ],
  ['general', ['general']],
  ['hero', ['hero']],
  ['navigation', ['navigation', 'social', 'footer']],
  ['newsletter', ['newsletter']],
  ['integrations', ['integrations']],
  ['leads', ['leads']],
];

const owns = (prefix, path) => path === prefix || path.startsWith(`${prefix}.`);

/**
 * The tab a dotted path belongs to, or `null`.
 *
 * @param {string} path
 * @returns {string|null}
 */
export function tabOfSettingsField(path) {
  const key = String(path ?? '');
  const found = TAB_OF_FIELD.find(([, prefixes]) => prefixes.some((prefix) => owns(prefix, key)));
  return found ? found[0] : null;
}

/**
 * What leaving asks while a save is still on its way (QA-64). "Discard unsaved
 * changes?" was the question, and "Discard changes" discarded nothing: the save
 * went on and landed after the editor had left.
 */
export const SAVING_QUESTION = {
  title: 'Leave while the settings are saving?',
  message:
    'The save carries on after you leave, and a message says if it fails — the changes would then have to be made again.',
  confirmLabel: 'Leave',
  cancelLabel: 'Stay until it is saved',
};

/** What a save that found nothing to send answers, instead of a request. */
const NOTHING_TO_SEND = Symbol('nothing to send');

/**
 * Admin → Site settings (`/admin/settings`, §6.13).
 *
 * One singleton behind seven panels and one `PUT`. The form holds the whole
 * record and validates the whole record, but a save **sends what changed**
 * (QA-64): the API deep-merges what it receives (§5.14), so a panel this
 * editor did not touch is left as it is on the server — including a change a
 * colleague saved after this form was opened, which the whole record used to
 * put back. After a save the form takes the server's own copy, so it shows
 * that colleague's change too.
 *
 * The open panel is part of the address (`?tab=integrations`, QA-64): it
 * survives a reload, and other screens can link to the panel they mean.
 *
 * What makes it more than a form is the last three lines of a save: the public
 * site reads every one of these values through `SiteSettingsContext`, so the
 * header, the hero, the footer and the WhatsApp buttons are stale the moment
 * the record changes. `updateLocal` moves them immediately and `refresh`
 * confirms them against the server's own copy (D93).
 *
 * §7: the settings area is admin **and** manager for reading, administrator
 * only for writing. A manager sees the whole record, disabled, under a banner
 * that says why — and the API answers 403 to the `PUT` regardless.
 */
export default function SettingsPage() {
  const toast = useToast();
  const { can } = useAdminAuth();
  const siteSettings = useSiteSettings();

  const canEdit = can('settings', 'edit');

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = isSettingsTab(requestedTab) ? requestedTab : DEFAULT_TAB;

  // Replacing, not pushing: Back leaves the screen rather than walking back
  // through every panel that was opened on the way.
  const setTab = useCallback(
    (key) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (key === DEFAULT_TAB) next.delete('tab');
          else next.set('tab', key);
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  const { data, loading, error, refetch, setData } = useApi(
    (signal) => settingsService.admin({ signal }),
    []
  );

  // A 422 names fields; this is where the first of them is kept, so the tab
  // that holds it can be opened even though `form.errors` is painted a render
  // later than the `await` that fails.
  const serverFieldRef = useRef(null);
  // What the form started from, for the save to diff against. Read by
  // `onSubmit`, which `useForm` calls from its own closure.
  const baselineRef = useRef(null);

  const form = useForm({
    initialValues: {},
    schema: settingsSchema,
    validate: validateSettings,
    normalize: normalizeSettings,
    labels: settingsLabel,
    onSubmit: async (payload) => {
      const changes = changedSettings(payload, normalizeSettings(baselineRef.current ?? {}));
      // Nothing left once the spaces are trimmed: nothing to write.
      if (Object.keys(changes).length === 0) return NOTHING_TO_SEND;
      try {
        return await settingsService.update(changes);
      } catch (thrown) {
        serverFieldRef.current = Object.keys(thrown?.errors ?? {})[0] ?? null;
        throw thrown;
      }
    },
  });
  baselineRef.current = form.baseline;

  // `useApi` answers after the first render and `useForm` keeps the values it
  // was created with, so a record is moved into the form when it lands — the
  // first one, a retry's, and the server's copy after a save. Keyed on the
  // record itself rather than on its `updatedAt`: an API that sent none put
  // this in a loop.
  const [loaded, setLoaded] = useState(null);
  if (data && data !== loaded) {
    setLoaded(data);
    form.reset(prepareSettings(data));
  }

  useUnsavedChanges(form.dirty, { question: form.submitting ? SAVING_QUESTION : undefined });

  // A refused save opens the tab of the first problem and, once its messages
  // are drawn, puts the cursor in that field. Pressed from the header with the
  // field below the fold, Save did nothing that could be seen (QA-64).
  const panelRef = useRef(null);
  const [refusal, setRefusal] = useState(null);
  useEffect(() => {
    if (!refusal || refusal.tab !== tab) return;
    focusFirstError(panelRef.current);
    // Once: coming back to this tab later is not another refusal.
    setRefusal(null);
  }, [refusal, tab]);

  const save = useCallback(async () => {
    // Save is always pressable: disabled until something changed, a click on
    // it could not add the address typed into Lead notifications, which the
    // same click commits on its way (QA-64). A clean form says so instead.
    if (!form.dirty) {
      toast.info(FORMS.noChanges);
      return;
    }
    serverFieldRef.current = null;
    // Computed before the submit rather than read after it: `form.errors` in
    // this closure is a render behind the validation the submit runs.
    const firstProblem = Object.keys(settingsErrors(form.values))[0] ?? null;

    const saved = await form.submit();
    if (saved === false) {
      const owner = tabOfSettingsField(firstProblem ?? serverFieldRef.current ?? '') ?? tab;
      if (owner !== tab) setTab(owner);
      setRefusal({ tab: owner });
      return;
    }

    if (saved === NOTHING_TO_SEND) {
      form.reset(prepareSettings(data));
      toast.info(FORMS.noChanges);
      return;
    }

    const record = saved?.data ?? saved;
    // The form takes the server's copy — the record, not whatever an API
    // answered without one, which would have emptied every panel.
    if (record && typeof record === 'object' && record.general) setData(record);
    siteSettings.updateLocal(record);
    siteSettings.refresh();
    emit(EVENTS.settingsChanged, record);
    toast.success(TOASTS.saved('Site settings'));
  }, [data, form, setData, setTab, siteSettings, tab, toast]);

  // Ctrl/Cmd+S saves, as it does on every other editor of the panel — here it
  // opened the browser's "Save page as" (QA-64). Not from a dialog (the media
  // picker), not twice for a held key, not while a save is on its way.
  const shortcut = useRef({});
  shortcut.current = { save, busy: form.submitting };
  useEffect(() => {
    if (!canEdit) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 's' && event.key !== 'S') return;
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey || event.shiftKey) return;
      if (event.target?.closest?.('[role="dialog"]')) return;
      event.preventDefault();
      const current = shortcut.current;
      if (event.repeat || current.busy) return;
      current.save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit]);

  // One message per field the editor can see: a badge's own message and the
  // list's are the same line on the screen, and were counted as two (QA-64).
  const errorsByTab = useMemo(() => {
    const counts = {};
    const shown = new Set(Object.keys(form.errors ?? {}).map(displayedAt));
    for (const path of shown) {
      const owner = tabOfSettingsField(path);
      if (owner) counts[owner] = (counts[owner] ?? 0) + 1;
    }
    return counts;
  }, [form.errors]);

  const tabs = useMemo(
    () => SETTINGS_TABS.map((entry) => ({ ...entry, errorCount: errorsByTab[entry.key] ?? 0 })),
    [errorsByTab]
  );

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <PageHeader title="Site settings" icon="mdi:cog-outline" />
        <div role="status" aria-label="Loading the site settings">
          <Skeleton variant="rounded" height={48} sx={{ marginBottom: 'var(--space-4)' }} />
          <Skeleton variant="rounded" height={420} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.page}>
        <PageHeader title="Site settings" icon="mdi:cog-outline" />
        <ErrorState
          title="The site settings could not be loaded."
          text={firstFieldMessage(error, 'Try again in a moment.')}
          onRetry={refetch}
        />
      </div>
    );
  }

  const disabled = !canEdit || form.submitting;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Site settings"
        icon="mdi:cog-outline"
        subtitle="Everything the public site says about the firm: the brand, the contact details, the hero, the footer and the services it talks to."
        actions={
          <div className={styles.headerActions}>
            {can('users', 'view') ? (
              <Button
                variant="ghost"
                size="sm"
                to={PATHS.adminUsers}
                icon={<Icon icon="mdi:account-group-outline" width="18" height="18" />}
              >
                Users
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              to={PATHS.adminProfile}
              icon={<Icon icon="mdi:account-circle-outline" width="18" height="18" />}
            >
              My profile
            </Button>
            {canEdit ? (
              <Button onClick={save} loading={form.submitting}>
                Save settings
              </Button>
            ) : null}
          </div>
        }
      />

      {canEdit ? null : (
        <Alert
          tone="info"
          title="Read-only: only administrators can change settings"
          icon={<Icon icon="mdi:lock-outline" width="20" height="20" />}
        >
          You can read every value here. Ask an administrator to change one.
        </Alert>
      )}

      <AdminTabs label="Site settings sections" tabs={tabs} value={tab} onChange={setTab} />

      <div ref={panelRef}>
        <AdminTabPanel tabKey="general" value={tab}>
          <GeneralTab form={form} disabled={disabled} />
        </AdminTabPanel>
        <AdminTabPanel tabKey="contact" value={tab}>
          <ContactTab form={form} disabled={disabled} />
        </AdminTabPanel>
        <AdminTabPanel tabKey="hero" value={tab}>
          <HeroTab form={form} disabled={disabled} />
        </AdminTabPanel>
        <AdminTabPanel tabKey="navigation" value={tab}>
          <NavigationFooterTab form={form} disabled={disabled} />
        </AdminTabPanel>
        <AdminTabPanel tabKey="newsletter" value={tab}>
          <NewsletterTab form={form} disabled={disabled} />
        </AdminTabPanel>
        <AdminTabPanel tabKey="integrations" value={tab}>
          <IntegrationsTab form={form} disabled={disabled} />
        </AdminTabPanel>
        <AdminTabPanel tabKey="leads" value={tab}>
          <LeadNotificationsTab form={form} disabled={disabled} />
        </AdminTabPanel>
      </div>

      {canEdit && form.dirty ? (
        <div className={styles.saveBar}>
          <span className={styles.saveText}>You have unsaved changes.</span>
          <Button variant="outline" onClick={() => form.reset()} disabled={form.submitting}>
            Discard changes
          </Button>
          <Button onClick={save} loading={form.submitting}>
            Save settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
