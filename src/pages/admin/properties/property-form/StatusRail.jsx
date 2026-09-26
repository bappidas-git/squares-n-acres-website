import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import SeoSummaryCard from '../../../../components/seo/SeoPanel/SeoSummaryCard';
import {
  Alert,
  Button,
  ConfirmDialog,
  NumberField,
  SelectField,
  SwitchField,
} from '../../../../components/ui';
import { AVAILABILITY } from '../../../../config/enums';
import { formatDateTime, formatRelative, formatTime } from '../../../../utils/format';
import { firstFieldMessage } from '../../../../services/apiError';
import { completenessTone } from './completeness';

import styles from './StatusRail.module.css';
import { FORMS, SEO } from '../../../../config/adminCopy';
import { resolveFieldPath } from './fieldFocus';
import { tabByKey, tabOfPath } from './tabs';
import { useToast } from '../../../../components/common/ToastProvider';

/**
 * The right-hand rail of the property form: everything about the listing that
 * is not a field of it.
 *
 * The four writes (save, save & view, duplicate, delete) and when the listing
 * was last written come first; then status, priority, how finished the page is
 * and where it lives on the site. It is sticky on a desktop — scrolling inside
 * itself when it is taller than the window — and an accordion on a phone,
 * because an editor works through sixteen tabs and should never have to scroll
 * back to publish. (The Save button used to sit at the bottom of a sticky rail
 * taller than a laptop screen, out of reach until the end of the page.)
 *
 * @param {object} props
 * @param {ReturnType<import('./usePropertyForm').default>} props.form
 * @param {boolean} [props.collapsible] renders as an accordion (the phone layout)
 */
/** Why the page link is off while the address or the status is unsaved. */
const SAVE_FIRST = 'Save first — the link reflects the saved listing.';

export default function StatusRail({ form, collapsible = false }) {
  const {
    state,
    values,
    errors,
    dirty,
    saving,
    busy,
    isNew,
    readOnly,
    lastSavedAt,
    draftSavedAt,
    completeness,
    warnings,
    viewUrl,
    viewStale,
    setField,
    setActive,
    focusField,
    setActiveTab,
    save,
    duplicate,
    remove,
    shareLink,
  } = form;
  const toast = useToast();

  // "Copy share link (24 h)" (prompt 51): the link last made, shown as well as
  // copied, for a browser that does not let a page write to the clipboard.
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(null);
  const copyShareLink = async () => {
    setSharing(true);
    let link = null;
    try {
      link = await shareLink?.();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The share link could not be made.'));
      setSharing(false);
      return;
    }
    setSharing(false);
    if (!link) return;
    setShared(link);
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success(`Share link copied — it works until ${formatDateTime(link.expiresAt)}.`);
    } catch (_thrown) {
      toast.info('This browser did not let the page copy it — copy the link below.');
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [confirmInactive, setConfirmInactive] = useState(false);
  const working = saving || busy;
  // Live on the site as last saved — what "Save as inactive" would take down.
  const live = state?.initial?.isActive === true;

  /** The copy is made from the saved record, so unsaved edits are saved first — or kept. */
  const startDuplicate = () => {
    if (dirty) {
      setConfirmDuplicate(true);
      return;
    }
    duplicate();
  };

  /** Taking a live page down is one mis-tap away in the menu, so it asks first. */
  const saveInactive = () => {
    if (live) {
      setConfirmInactive(true);
      return;
    }
    save('inactive');
  };
  const tone = completenessTone(completeness.percent);
  // The link follows the saved listing, so "published" is its saved state too.
  const published = (state?.initial?.isActive ?? values.isActive) === true;
  // An unpublished listing has no public page, so the link is the admin
  // preview of it instead — and it exists only once the record has been saved.
  const openUrl = isNew ? null : viewUrl;

  // When the listing was last written, under the button that writes it.
  const savedNotes = (
    <div className={styles.savedNotes}>
      <p className={styles.note} aria-live="polite">
        {lastSavedAt
          ? `Last saved ${formatRelative(lastSavedAt)}${
              // Who, since prompt 51 — the API names the account that saved.
              state?.initial?.updatedByName ? ` by ${state.initial.updatedByName}` : ''
            }`
          : 'Not saved yet'}
        {dirty ? ' — with unsaved changes' : ''}
      </p>
      {draftSavedAt ? (
        <p className={styles.note} aria-live="polite">
          Draft saved {formatTime(draftSavedAt)} in this browser
        </p>
      ) : null}
    </div>
  );

  const body = (
    <>
      {readOnly ? (
        <Alert tone="info" icon={<Icon icon="mdi:eye-outline" width="20" height="20" />}>
          Read-only access. Your role can open a listing but not change it.
        </Alert>
      ) : null}

      {readOnly ? null : (
        <section className={styles.block} aria-labelledby="rail-actions">
          <h2 className={styles.srOnly} id="rail-actions">
            Actions
          </h2>

          <SaveMenu
            save={save}
            onSaveInactive={saveInactive}
            working={working}
            isNew={isNew}
            published={published}
          />

          {savedNotes}

          <p className={styles.shortcut}>
            <kbd className={styles.kbd}>Ctrl</kbd>
            <span aria-hidden="true">/</span>
            <kbd className={styles.kbd}>⌘</kbd>
            <span>+</span>
            <kbd className={styles.kbd}>S</kbd>
            <span>saves without leaving the tab.</span>
          </p>

          {isNew ? null : (
            <div className={styles.secondary}>
              <Button
                variant="ghost"
                size="sm"
                disabled={working}
                icon={<Icon icon="mdi:content-copy" width="16" height="16" />}
                onClick={startDuplicate}
              >
                Duplicate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={working}
                icon={<Icon icon="mdi:trash-can-outline" width="16" height="16" />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </section>
      )}

      <section className={styles.block} aria-labelledby="rail-status">
        <h2 className={styles.heading} id="rail-status">
          Status
        </h2>

        <SwitchField
          label="Published on site"
          checked={values.isActive === true}
          disabled={readOnly || working}
          hint="An unpublished listing is invisible to visitors and its page answers 404."
          onChange={(next) => setActive(next)}
        />
        <SwitchField
          label="Featured"
          checked={values.isFeatured === true}
          disabled={readOnly || working}
          hint={
            values.isFeatured === true && !published
              ? 'Featured, but not published: the home page’s Featured row shows it once it is.'
              : 'Shown in the home page’s Featured row, highest priority first.'
          }
          onChange={(next) => setField('isFeatured', next)}
        />
        <SwitchField
          label="Verified"
          checked={values.isVerified === true}
          disabled={readOnly || working}
          hint="Shows the verified mark on the card and the detail page."
          onChange={(next) => setField('isVerified', next)}
        />

        <SelectField
          label="Availability"
          options={AVAILABILITY.options}
          value={values.availability ?? ''}
          error={errors.availability}
          disabled={readOnly || working}
          onChange={(event) => setField('availability', event.target.value)}
        />
        <NumberField
          label="Priority"
          min={0}
          value={values.priorityOrder ?? 0}
          error={errors.priorityOrder}
          disabled={readOnly || working}
          hint="Higher comes first in featured rows and relevance sorting."
          onChange={(event) =>
            setField('priorityOrder', event.target.value === '' ? 0 : Number(event.target.value))
          }
        />
      </section>

      <section className={styles.block} aria-labelledby="rail-completeness">
        <h2 className={styles.heading} id="rail-completeness">
          Completeness
        </h2>

        <div className={styles.meterRow}>
          <div
            className={[styles.meter, styles[tone]].join(' ')}
            role="progressbar"
            aria-valuenow={completeness.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="How complete this listing is"
          >
            <span className={styles.meterFill} style={{ width: `${completeness.percent}%` }} />
          </div>
          <strong className={styles.percent}>{completeness.percent}%</strong>
        </div>

        <details className={styles.checklist}>
          <summary className={styles.summary}>
            {completeness.items.filter((item) => item.done).length} of {completeness.items.length}{' '}
            done
          </summary>
          <ul className={styles.items}>
            {completeness.items.map((item) => (
              <li key={item.key} className={item.done ? styles.done : styles.pending}>
                <Icon
                  icon={item.done ? 'mdi:check-circle' : 'mdi:circle-outline'}
                  width="16"
                  height="16"
                  aria-hidden="true"
                />
                {item.label}
                <span className={styles.srOnly}>{item.done ? ' — done' : ' — still missing'}</span>
              </li>
            ))}
          </ul>
        </details>

        {warnings.length > 0 ? (
          <ul className={styles.warnings}>
            {warnings.map((warning) => (
              <li key={warning.id}>
                <Icon icon="mdi:alert-outline" width="16" height="16" aria-hidden="true" />
                {warning.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.block} aria-labelledby="rail-seo">
        <SeoSummaryCard
          seo={values.seo}
          onOpen={(failure) => {
            // The first failing test is the one worth opening on; when nothing
            // is failing the tab itself is the destination.
            if (!failure?.field) {
              setActiveTab('seo');
              if (failure?.message) toast.info(SEO.panel.opened('SEO', failure.message));
              return;
            }
            focusField(failure.field);
            const target = resolveFieldPath(failure.field, values);
            const where = target.startsWith('seo.') ? 'SEO' : tabByKey(tabOfPath(target)).label;
            toast.info(SEO.panel.opened(where, failure.message));
          }}
        />
      </section>

      <section className={styles.block} aria-labelledby="rail-url">
        <h2 className={styles.heading} id="rail-url">
          Address
        </h2>
        <p className={styles.url}>
          <span className={styles.urlBase}>/properties/</span>
          {values.slug || <span className={styles.urlEmpty}>not set yet</span>}
        </p>
        {openUrl ? (
          <>
            <span title={viewStale ? SAVE_FIRST : undefined} className={styles.linkWrap}>
              <Button
                variant="outline"
                size="sm"
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                disabled={viewStale}
                aria-describedby={viewStale ? 'rail-url-stale' : undefined}
                icon={
                  <Icon
                    icon={published ? 'mdi:open-in-new' : 'mdi:eye-outline'}
                    width="16"
                    height="16"
                  />
                }
              >
                {published ? 'View on site' : 'Preview'}
              </Button>
            </span>
            {viewStale ? (
              <p className={styles.note} id="rail-url-stale">
                {SAVE_FIRST}
              </p>
            ) : published ? null : (
              <>
                <p className={styles.note}>
                  Only you see this — the page answers 404 to everybody else until it is published.
                </p>
                {readOnly ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={sharing}
                    disabled={working}
                    icon={<Icon icon="mdi:link-variant" width="16" height="16" />}
                    onClick={copyShareLink}
                  >
                    Copy share link (24 h)
                  </Button>
                )}
                {shared ? (
                  <p className={styles.note}>
                    Anybody with{' '}
                    <a href={shared.url} target="_blank" rel="noopener noreferrer">
                      this link
                    </a>{' '}
                    sees the listing until {formatDateTime(shared.expiresAt)}, signed in or not.
                  </p>
                ) : null}
              </>
            )}
          </>
        ) : (
          <p className={styles.note}>The page exists once the listing is saved.</p>
        )}
      </section>

      {readOnly ? (
        <section className={styles.block} aria-labelledby="rail-saved">
          <h2 className={styles.heading} id="rail-saved">
            Saved
          </h2>
          {savedNotes}
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmDuplicate}
        loading={working}
        title="Save your changes first?"
        message="The copy is made from the saved listing, and opening it leaves this one — so the changes you have not saved would be in neither. Save them, then duplicate."
        confirmLabel="Save, then duplicate"
        onClose={() => setConfirmDuplicate(false)}
        onConfirm={async () => {
          const saved = await save('save');
          setConfirmDuplicate(false);
          if (saved) await duplicate();
        }}
      />

      <ConfirmDialog
        open={confirmInactive}
        danger
        loading={working}
        title="Take this listing off the site?"
        message="It is published now. Saving it as inactive unpublishes it: the page answers 404 and it leaves every search and listing row until it is published again."
        confirmLabel="Save as inactive"
        onClose={() => setConfirmInactive(false)}
        onConfirm={async () => {
          await save('inactive');
          setConfirmInactive(false);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        danger
        loading={busy}
        title="Delete this property?"
        message={`“${values.title || 'This listing'}” and everything on it will be removed. Other listings that point at it lose the link. This cannot be undone.`}
        confirmLabel="Delete property"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await remove();
          setConfirmDelete(false);
        }}
      />
    </>
  );

  if (!collapsible) {
    return (
      <aside className={styles.rail} aria-label="Status and actions">
        {body}
      </aside>
    );
  }

  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <Icon icon="mdi:tune-variant" width="18" height="18" aria-hidden="true" />
        Status &amp; actions
        <span className={styles.accordionMeta}>{completeness.percent}% complete</span>
      </summary>
      <div className={styles.accordionBody}>{body}</div>
    </details>
  );
}

/**
 * Save, plus the two saves that are not quite Save.
 *
 * One primary button rather than three: "Save & continue" is the same write as
 * "Save" under a longer name, so the rail keeps a single Save and hides the two
 * genuinely different ones — publish-then-look, and store-without-publishing —
 * behind a menu (decision logged in `docs/DECISIONS.md`).
 */
function SaveMenu({ save, onSaveInactive, working, isNew, published }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && wrapper.current?.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const run = (mode) => {
    setOpen(false);
    if (mode === 'inactive' && onSaveInactive) onSaveInactive();
    else save(mode);
  };

  return (
    <div className={styles.saveGroup} ref={wrapper}>
      <Button
        fullWidth
        loading={working}
        icon={<Icon icon="mdi:content-save-outline" width="18" height="18" />}
        onClick={() => run('save')}
      >
        {isNew ? 'Create property' : FORMS.save}
      </Button>

      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? 'rail-save-more' : undefined}
        aria-label="More ways to save"
        disabled={working}
        className={styles.saveToggle}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="18" height="18" />
      </Button>

      {open ? (
        // A disclosure of two ordinary buttons (prompt 51): `role="menu"`
        // promised arrow keys the list never answered.
        <div
          className={styles.menu}
          role="group"
          aria-label="More ways to save"
          id="rail-save-more"
        >
          <button type="button" className={styles.menuItem} onClick={() => run('view')}>
            <Icon
              icon={published ? 'mdi:open-in-new' : 'mdi:eye-outline'}
              width="16"
              height="16"
              aria-hidden="true"
            />
            {published ? 'Save & view on site' : 'Save & preview'}
          </button>
          <button type="button" className={styles.menuItem} onClick={() => run('inactive')}>
            <Icon icon="mdi:eye-off-outline" width="16" height="16" aria-hidden="true" />
            Save as inactive
          </button>
        </div>
      ) : null}
    </div>
  );
}
