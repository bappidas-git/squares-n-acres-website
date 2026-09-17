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
import { formatRelative, formatTime } from '../../../../utils/format';
import { completenessTone } from './completeness';

import styles from './StatusRail.module.css';

/**
 * The right-hand rail of the property form: everything about the listing that
 * is not a field of it.
 *
 * Status, priority, how finished the page is, where it lives on the site, when
 * it was last written, and the four writes (save, save & view, duplicate,
 * delete). It is sticky on a desktop and an accordion on a phone, because an
 * editor works through sixteen tabs and should never have to scroll back to
 * publish.
 *
 * @param {object} props
 * @param {ReturnType<import('./usePropertyForm').default>} props.form
 * @param {boolean} [props.collapsible] renders as an accordion (the phone layout)
 */
export default function StatusRail({ form, collapsible = false }) {
  const {
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
    setField,
    setActive,
    focusField,
    setActiveTab,
    save,
    duplicate,
    remove,
  } = form;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const working = saving || busy;
  const tone = completenessTone(completeness.percent);
  const published = values.isActive === true;
  // An unpublished listing has no public page, so the link is the admin
  // preview of it instead — and it exists only once the record has been saved.
  const openUrl = isNew ? null : viewUrl;

  const body = (
    <>
      {readOnly ? (
        <Alert tone="info" icon={<Icon icon="mdi:eye-outline" width="20" height="20" />}>
          Read-only access. Your role can open a listing but not change it.
        </Alert>
      ) : null}

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
          hint="Featured listings fill the row on the home page."
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
              <li key={item.key} className={item.done ? styles.done : styles.todo}>
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
          onOpen={(field) => {
            // The first failing test is the one worth opening on; when nothing
            // is failing the tab itself is the destination.
            if (field) focusField(field);
            else setActiveTab('seo');
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
            <Button
              variant="outline"
              size="sm"
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
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
            {published ? null : (
              <p className={styles.note}>
                Only you see this — the page answers 404 to everybody else until it is published.
              </p>
            )}
          </>
        ) : (
          <p className={styles.note}>The page exists once the listing is saved.</p>
        )}
      </section>

      <section className={styles.block} aria-labelledby="rail-saved">
        <h2 className={styles.heading} id="rail-saved">
          Saved
        </h2>
        <p className={styles.note} aria-live="polite">
          {lastSavedAt ? `Last saved ${formatRelative(lastSavedAt)}` : 'Not saved yet'}
          {dirty ? ' — with unsaved changes' : ''}
        </p>
        {draftSavedAt ? (
          <p className={styles.note} aria-live="polite">
            Draft saved {formatTime(draftSavedAt)} in this browser
          </p>
        ) : null}
      </section>

      {readOnly ? null : (
        <section className={styles.block} aria-labelledby="rail-actions">
          <h2 className={styles.srOnly} id="rail-actions">
            Actions
          </h2>

          <SaveMenu save={save} working={working} isNew={isNew} published={published} />

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
                onClick={duplicate}
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
function SaveMenu({ save, working, isNew, published }) {
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
    save(mode);
  };

  return (
    <div className={styles.saveGroup} ref={wrapper}>
      <Button
        fullWidth
        loading={working}
        icon={<Icon icon="mdi:content-save-outline" width="18" height="18" />}
        onClick={() => run('save')}
      >
        {isNew ? 'Create property' : 'Save'}
      </Button>

      <Button
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More ways to save"
        disabled={working}
        className={styles.saveToggle}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="18" height="18" />
      </Button>

      {open ? (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => run('view')}
          >
            <Icon
              icon={published ? 'mdi:open-in-new' : 'mdi:eye-outline'}
              width="16"
              height="16"
              aria-hidden="true"
            />
            {published ? 'Save & view on site' : 'Save & preview'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => run('inactive')}
          >
            <Icon icon="mdi:eye-off-outline" width="16" height="16" aria-hidden="true" />
            Save as inactive
          </button>
        </div>
      ) : null}
    </div>
  );
}
