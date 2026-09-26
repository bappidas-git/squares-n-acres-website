import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import LazyImage from '../../../components/ui/LazyImage';
import FolderField from '../../../components/admin/FolderField';
import MultiSelect from '../../../components/admin/MultiSelect';
import PATHS from '../../../routes/paths';
import mediaService from '../../../services/mediaService';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { Alert, Button, ConfirmDialog, Drawer, TextField } from '../../../components/ui';
import { DIALOGS, FORMS } from '../../../config/adminCopy';
import { MEDIA_TYPES } from '../../../config/enums';
import { cloudinaryUrl } from '../../../utils/cloudinary';
import { cleanFolder } from './useMediaUpload';
import { describeSize } from './MediaCard';
import { firstFieldMessage } from '../../../services/apiError';
import { formatDate } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './MediaLibraryPage.module.css';

/** Where each kind of usage lives in the admin, so the list can link to it. */
const USAGE_LINKS = {
  property: (usage) => PATHS.adminPropertyEdit(usage.id),
  article: (usage) => PATHS.adminArticleEdit(usage.id),
  page: (usage) => PATHS.adminPageEdit(usage.id),
  locality: (usage) => PATHS.adminLocalityEdit(usage.id),
  developer: (usage) => PATHS.adminDeveloperEdit(usage.id),
  bank: () => PATHS.adminBanks,
  author: () => PATHS.adminAuthors,
  teamMember: () => PATHS.adminTeam,
  partner: () => PATHS.adminPartners,
  testimonial: () => PATHS.adminTestimonials,
  faq: () => PATHS.adminFaqs,
  job: (usage) => PATHS.adminJobEdit(usage.id),
  settings: () => PATHS.adminSettings,
  seoSettings: () => PATHS.adminSeoSettings,
};

/** The word an editor reads for a usage type. */
const USAGE_NOUNS = {
  property: 'Listing',
  article: 'Article',
  page: 'Page',
  locality: 'Locality',
  developer: 'Developer',
  bank: 'Bank',
  author: 'Author',
  teamMember: 'Team member',
  partner: 'Partner',
  testimonial: 'Testimonial',
  faq: 'FAQ',
  job: 'Job opening',
  settings: 'Site settings',
  seoSettings: 'SEO settings',
};

/** The longest tag the API keeps (`media.tags.*`, §6.12). */
export const TAG_MAX_LENGTH = 60;

/** What `Escape` on a drawer with edits asks before throwing them away. */
const DISCARD_MESSAGE = 'The changes you made to this file have not been saved.';

const EMPTY_FORM = { alt: '', title: '', folder: '', tags: [] };

/** The editable half of a record, as the form holds it. */
const formOf = (item) => ({
  alt: item?.alt ?? '',
  title: item?.title ?? '',
  folder: item?.folder ?? '',
  tags: Array.isArray(item?.tags) ? item.tags : [],
});

/**
 * A record's editable fields as a save would send them: text trimmed, the
 * folder cleaned as the library files it, an empty optional field `null`.
 */
const storedOf = (source) => ({
  alt: String(source?.alt ?? '').trim(),
  title: String(source?.title ?? '').trim() || null,
  folder: cleanFolder(source?.folder) || null,
  tags: Array.isArray(source?.tags) ? source.tags : [],
});

const sameValue = (left, right) =>
  Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((entry, index) => entry === right[index])
    : left === right;

/**
 * The fields a form changed on a record, and only those — `null` when there
 * are none, which is what makes the drawer "dirty" and what a save of nothing
 * is answered with (QA-63).
 *
 * Only the changed fields are sent (QA-63): the drawer used to send all four,
 * so of two editors — or two tabs — the later save undid whatever the earlier
 * one had changed in the fields it had not touched (a tag added in one tab was
 * gone when the other fixed the alt text). A `PATCH` writes only what it
 * sends.
 *
 * @param {object|null} item
 * @param {typeof EMPTY_FORM} form
 * @returns {object|null}
 */
export function changesOf(item, form) {
  if (!item) return null;
  const next = storedOf(form);
  const stored = storedOf(item);
  const changed = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => !sameValue(value, stored[key]))
  );
  return Object.keys(changed).length > 0 ? changed : null;
}

/** Where a file is hosted, in words: "Cloudinary", or the address's host. */
function hostOf(item) {
  if (item?.provider === 'cloudinary') return 'Cloudinary';
  try {
    return new URL(item?.url).host || 'the site it came from';
  } catch (_thrown) {
    return 'the site it came from';
  }
}

const places = (count) => `${count} ${count === 1 ? 'place' : 'places'}`;

/**
 * One file, opened.
 *
 * Everything an editor can change about a stored file is here — the alt text
 * first, because it is the only required one and the only one that is read
 * aloud — plus the two things they cannot: the address, which is what the
 * record *is*, and the list of places it appears.
 *
 * The delete is the interesting half. A file something still shows cannot be
 * removed without saying so: the API answers 409 with the list (prompt 39 §5),
 * the list appears here, and "Remove it anyway" is the editor's answer to it.
 * The copy is explicit that the file itself survives either way — on
 * Cloudinary, or wherever the address points — because "delete" meaning
 * "delete the record" and not "delete the file" is exactly the sort of thing
 * nobody discovers until it matters.
 *
 * It behaves like every other editing surface of the admin (QA-63):
 *
 *   - its contents stay while it slides away (`item` lingers, `open` closes);
 *   - every opening starts from the stored record — edits thrown away with
 *     Escape used to be back the next time the same file was opened, looking
 *     saved;
 *   - edits are not thrown away without asking — Escape, the backdrop, Close
 *     and a link out of it (the "Used in" list) all ask first;
 *   - a save or a removal answers for the file it was made on: one that lands
 *     after the drawer moved on to another file no longer closes that file's
 *     drawer, nor paints its result there;
 *   - a file removed elsewhere meanwhile says so (`onGone`), rather than "Not
 *     found".
 *
 * @param {object} props
 * @param {object|null} props.item the record being edited — kept while it closes
 * @param {boolean} [props.open] defaults to "there is an item"
 * @param {() => void} props.onClose
 * @param {() => void} [props.onExited] once the close transition has finished
 * @param {(record: object) => void} props.onSaved
 * @param {(record: object) => void} props.onDeleted
 * @param {(record: object, action: 'save'|'delete') => void} [props.onGone] the
 *   file was removed elsewhere since the list was read
 * @param {Array<string|{name: string, count?: number}>} [props.folders]
 * @param {(url: string) => void} [props.onCopy]
 */
export default function MediaEditDrawer({
  item,
  open = Boolean(item),
  onClose,
  onExited,
  onSaved,
  onDeleted,
  onGone,
  folders = [],
  onCopy,
}) {
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [force, setForce] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [tagError, setTagError] = useState('');
  const [discarding, setDiscarding] = useState(false);

  // The form is filled **during the render** that opens the drawer, not in an
  // effect afterwards: an effect would paint one frame of the last file's
  // values (or of empty boxes) over the picture the editor just clicked. It is
  // filled on every opening, the same file included (QA-63), and each opening
  // is a session — what a request started in an earlier one comes back to is
  // not this one's business.
  const [session, setSession] = useState({ open: false, item: null, id: 0 });
  if (open && item && (!session.open || item !== session.item)) {
    setSession({ open: true, item, id: session.id + 1 });
    setForm(formOf(item));
    setTouched(false);
    setFailure('');
    setConfirming(false);
    setForce(false);
    setBlocked(null);
    setSaving(false);
    setDeleting(false);
    setTagError('');
    setDiscarding(false);
  } else if (!open && session.open) {
    setSession({ ...session, open: false });
  }

  const sessionRef = useRef(session);
  sessionRef.current = session;
  /** Whether the drawer is still showing the opening a request was made in. */
  const current = (id) => sessionRef.current.open && sessionRef.current.id === id;

  const changes = useMemo(() => (open ? changesOf(item, form) : null), [open, item, form]);
  const dirty = changes !== null;

  // A link out of the drawer — "Used in" — and a reload ask the question the
  // rest of the admin asks (QA-63).
  useUnsavedChanges(open && dirty);

  const failureRef = useRef(null);
  useEffect(() => {
    // The message sits at the top of a drawer the editor may have scrolled to
    // the bottom of, to reach the tags: a save that failed there showed
    // nothing at all (QA-63).
    if (failure) failureRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [failure]);

  const usages = useMemo(() => (Array.isArray(item?.usedIn) ? item.usedIn : []), [item]);
  const tagOptions = useMemo(
    () => form.tags.map((tag) => ({ value: tag, label: tag })),
    [form.tags]
  );

  const altError = touched && form.alt.trim() === '' ? 'Alt text is required.' : '';
  const name = item?.title || item?.alt || item?.url || '';

  /** Escape, the backdrop, the × and "Close" — which ask first when there is work to lose. */
  const requestClose = () => {
    // A request in flight finishes in the drawer that made it.
    if (saving || deleting) return;
    if (dirty) {
      setDiscarding(true);
      return;
    }
    onClose?.();
  };

  /**
   * A new tag, as typed — the `onCreate` the tags field needs to create
   * anything at all (QA-63). Without it every "Add …" was silently dropped.
   */
  const createTag = (input) => {
    const tag = String(input ?? '')
      .trim()
      .replace(/\s+/g, ' ');
    if (tag === '') return undefined;
    if (tag.length > TAG_MAX_LENGTH) {
      setTagError(`A tag can be at most ${TAG_MAX_LENGTH} characters.`);
      return undefined;
    }
    if (form.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setTagError(`“${tag}” is already one of this file’s tags.`);
      return undefined;
    }
    setTagError('');
    return { value: tag, label: tag };
  };

  const save = async () => {
    if (!item || saving || deleting) return;
    setTouched(true);
    if (form.alt.trim() === '') return;

    // A save of nothing wrote the record anyway and said "File saved" (QA-63).
    if (!changes) {
      toast.info(FORMS.noChanges);
      onClose?.();
      return;
    }

    const target = item;
    const opening = session.id;
    setSaving(true);
    setFailure('');
    try {
      const { data } = await mediaService.patch(target.id, changes);
      onSaved?.(data ?? { ...target, ...changes });
    } catch (thrown) {
      if (thrown?.status === 404) {
        onGone?.(target, 'save');
        return;
      }
      const message = firstFieldMessage(thrown, 'The changes could not be saved.');
      if (current(opening)) setFailure(message);
      else toast.error(`“${target.title || target.alt}” was not saved. ${message}`);
    } finally {
      if (sessionRef.current.id === opening) setSaving(false);
    }
  };

  const remove = async () => {
    if (!item || saving || deleting) return;

    const target = item;
    const opening = session.id;
    setDeleting(true);
    setFailure('');
    try {
      await mediaService.remove(target.id, { force });
      onDeleted?.(target);
    } catch (thrown) {
      if (thrown?.status === 404) {
        onGone?.(target, 'delete');
        return;
      }
      if (!current(opening)) {
        toast.error(
          `“${target.title || target.alt}” was not removed. ${firstFieldMessage(thrown)}`
        );
        return;
      }
      if (thrown?.status === 409) {
        setBlocked(thrown?.data?.usedIn ?? thrown?.data?.usedBy ?? []);
        setFailure('');
      } else {
        setFailure(firstFieldMessage(thrown, 'The file could not be removed.'));
      }
    } finally {
      if (sessionRef.current.id === opening) setDeleting(false);
    }
  };

  const keep = () => {
    setConfirming(false);
    setForce(false);
    // The warning points at the box below; with the box gone, so is it.
    setBlocked(null);
  };

  const listed = blocked ?? usages;
  const inUse = listed.length > 0;

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title="File details"
        slotProps={{ transition: { onExited } }}
        footer={
          <>
            <Button variant="outline" onClick={requestClose} disabled={saving || deleting}>
              {FORMS.close}
            </Button>
            <Button variant="primary" loading={saving} disabled={deleting} onClick={save}>
              {FORMS.saveChanges}
            </Button>
          </>
        }
      >
        {item ? (
          <div className={styles.drawer}>
            {failure ? (
              <div ref={failureRef}>
                <Alert tone="error" title="Something went wrong">
                  {failure}
                </Alert>
              </div>
            ) : null}

            <div className={styles.drawerPreview}>
              {item.type === 'image' ? (
                <LazyImage
                  src={cloudinaryUrl(item.url, { w: 640, merge: true })}
                  alt={item.alt ?? ''}
                  ratio="4 / 3"
                  fit="contain"
                />
              ) : (
                <a
                  className={styles.drawerFile}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Icon
                    icon={
                      item.type === 'video' ? 'mdi:play-box-outline' : 'mdi:file-document-outline'
                    }
                    width="32"
                    height="32"
                    aria-hidden="true"
                  />
                  Open this {MEDIA_TYPES.labelOf(item.type)?.toLowerCase() ?? 'file'}
                </a>
              )}
            </div>

            <dl className={styles.facts}>
              <div>
                <dt>Type</dt>
                <dd>{MEDIA_TYPES.labelOf(item.type) ?? item.type}</dd>
              </div>
              <div>
                <dt>Where it is stored</dt>
                <dd>{item.provider === 'cloudinary' ? 'Cloudinary' : 'Elsewhere'}</dd>
              </div>
              {describeSize(item) ? (
                <div>
                  <dt>File</dt>
                  <dd>{describeSize(item)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Added</dt>
                <dd>{formatDate(item.createdAt)}</dd>
              </div>
            </dl>

            <div className={styles.urlRow}>
              <TextField label="Address" value={item.url} readOnly onChange={() => {}} />
              <Button
                variant="outline"
                size="sm"
                icon={<Icon icon="mdi:link-variant" width="16" height="16" />}
                onClick={() => onCopy?.(item.url)}
              >
                Copy
              </Button>
            </div>

            <TextField
              label="Alt text"
              required
              value={form.alt}
              error={altError}
              maxLength={200}
              hint="What the file shows, for a reader who cannot see it."
              onBlur={() => setTouched(true)}
              onChange={(event) => setForm((state) => ({ ...state, alt: event.target.value }))}
            />

            <TextField
              label="Title"
              value={form.title}
              maxLength={200}
              hint="Optional. What this file is called in the library."
              onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
            />

            <FolderField
              label="Folder"
              value={form.folder}
              folders={folders}
              allowNone
              hint={
                cleanFolder(form.folder)
                  ? `Filed in “${cleanFolder(form.folder)}”. Moving it changes the library’s filing only — the address stays.`
                  : 'Optional. Groups the file in the library.'
              }
              onChange={(next) => setForm((state) => ({ ...state, folder: next ?? '' }))}
            />

            <MultiSelect
              label="Tags"
              options={tagOptions}
              value={form.tags}
              creatable
              onCreate={createTag}
              error={tagError}
              placeholder="Type a tag and press Enter"
              hint="Optional. Your own words for finding this file again — the library’s search reads them."
              onChange={(tags) => {
                setTagError('');
                setForm((state) => ({ ...state, tags }));
              }}
            />

            <section className={styles.usage}>
              <h3 className={styles.usageTitle}>
                {usages.length === 0 ? 'Not used anywhere yet' : `Used in ${places(usages.length)}`}
              </h3>
              {usages.length > 0 ? (
                <ul className={styles.usageList}>
                  {usages.map((usage) => {
                    const to = USAGE_LINKS[usage.type]?.(usage);
                    const noun = USAGE_NOUNS[usage.type] ?? usage.type;
                    return (
                      <li key={`${usage.type}-${usage.id}`}>
                        <span className={styles.usageType}>{noun}</span>
                        {to ? (
                          <Link to={to}>{usage.title || `#${usage.id}`}</Link>
                        ) : (
                          <span>{usage.title || `#${usage.id}`}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.usageNote}>
                  Nothing on the site points at this address, so removing it here changes nothing a
                  visitor sees.
                </p>
              )}
            </section>

            <section className={styles.danger}>
              {blocked ? (
                <Alert tone="warning" title="This file is still in use">
                  <p>It appears in {places(listed.length)}:</p>
                  <ul className={styles.usageList}>
                    {listed.map((usage) => (
                      <li key={`${usage.type}-${usage.id}`}>
                        <span className={styles.usageType}>
                          {USAGE_NOUNS[usage.type] ?? usage.type}
                        </span>
                        <span>{usage.title || `#${usage.id}`}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Take it out of those first, or tick the box below to remove the library entry
                    anyway.
                  </p>
                </Alert>
              ) : null}

              {confirming ? (
                <>
                  <p className={styles.dangerText}>
                    {/* §8.2: a destructive confirm names the record it is about
                      to change, even when it is an in-place one rather than a
                      dialog — a drawer over a drawer is worse than this. */}
                    “{name}” is removed from the library. The file itself stays on {hostOf(item)}
                    {item.provider === 'cloudinary' ? '' : ' — this site has never held it'}, so
                    anything already pointing at the address keeps working.
                  </p>
                  {inUse ? (
                    <label className={styles.forceLabel}>
                      <input
                        type="checkbox"
                        checked={force}
                        onChange={(event) => setForce(event.target.checked)}
                      />
                      Remove it from the library even though it is in use
                    </label>
                  ) : null}
                  <div className={styles.dangerActions}>
                    <Button variant="ghost" onClick={keep} disabled={deleting}>
                      Keep it
                    </Button>
                    <Button variant="danger" loading={deleting} disabled={saving} onClick={remove}>
                      Remove from the library
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  variant="danger"
                  icon={<Icon icon="mdi:delete-outline" width="18" height="18" />}
                  onClick={() => setConfirming(true)}
                >
                  Remove from the library
                </Button>
              )}
            </section>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={discarding}
        title={DIALOGS.discardTitle}
        message={DISCARD_MESSAGE}
        confirmLabel={DIALOGS.discardConfirm}
        cancelLabel={DIALOGS.discardCancel}
        danger
        onClose={() => setDiscarding(false)}
        // "Keep editing" fades this out with "Discard" still under the
        // pointer: a click on it then must not throw the edits away.
        onConfirm={() => {
          if (!discarding) return;
          setDiscarding(false);
          onClose?.();
        }}
      />
    </>
  );
}
