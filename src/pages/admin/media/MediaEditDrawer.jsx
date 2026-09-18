import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import LazyImage from '../../../components/ui/LazyImage';
import MultiSelect from '../../../components/admin/MultiSelect';
import PATHS from '../../../routes/paths';
import mediaService from '../../../services/mediaService';
import { Alert, Button, Drawer, TextField } from '../../../components/ui';
import { MEDIA_TYPES } from '../../../config/enums';
import { cloudinaryUrl } from '../../../utils/cloudinary';
import { describeSize } from './MediaCard';
import { firstFieldMessage } from '../../../services/apiError';
import { formatDate } from '../../../utils/format';

import styles from './MediaLibraryPage.module.css';

/** Where each kind of usage lives in the admin, so the list can link to it. */
const USAGE_LINKS = {
  property: (usage) => PATHS.adminPropertyEdit(usage.id),
  article: (usage) => PATHS.adminArticleEdit(usage.id),
  page: (usage) => PATHS.adminPageEdit(usage.id),
  locality: (usage) => PATHS.adminLocalityEdit(usage.id),
  developer: (usage) => PATHS.adminDeveloperEdit(usage.id),
  teamMember: () => PATHS.adminTeam,
  partner: () => PATHS.adminPartners,
  settings: () => PATHS.adminSettings,
};

/** The word an editor reads for a usage type. */
const USAGE_NOUNS = {
  property: 'Listing',
  article: 'Article',
  page: 'Page',
  locality: 'Locality',
  developer: 'Developer',
  teamMember: 'Team member',
  partner: 'Partner',
  settings: 'Site settings',
};

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
 * the list appears here, and "Force" is the editor's answer to it. The copy is
 * explicit that the Cloudinary asset survives either way, because "delete"
 * meaning "delete the record" and not "delete the file" is exactly the sort of
 * thing nobody discovers until it matters.
 *
 * @param {object} props
 * @param {object|null} props.item the record being edited
 * @param {() => void} props.onClose
 * @param {(record: object) => void} props.onSaved
 * @param {(record: object) => void} props.onDeleted
 * @param {string[]} [props.folders]
 * @param {(url: string) => void} [props.onCopy]
 */
export default function MediaEditDrawer({
  item,
  onClose,
  onSaved,
  onDeleted,
  folders = [],
  onCopy,
}) {
  const [form, setForm] = useState({ alt: '', title: '', folder: '', tags: [] });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [force, setForce] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // The form is filled **during the render** that first sees a file, not in an
  // effect afterwards. An effect would paint one frame of empty boxes over the
  // picture the editor just clicked, and — because the drawer's contents mount
  // with the drawer — that frame is the one they would see. This is React's
  // "adjust state when a prop changes" pattern: a plain assignment, guarded by
  // the record it was last run for, and React re-renders before painting.
  const [shown, setShown] = useState(null);
  if (item && item !== shown) {
    setShown(item);
    setForm({
      alt: item.alt ?? '',
      title: item.title ?? '',
      folder: item.folder ?? '',
      tags: Array.isArray(item.tags) ? item.tags : [],
    });
    setTouched(false);
    setFailure('');
    setConfirming(false);
    setForce(false);
    setBlocked(null);
  }

  const usages = useMemo(() => (Array.isArray(item?.usedIn) ? item.usedIn : []), [item]);
  const tagOptions = useMemo(
    () => form.tags.map((tag) => ({ value: tag, label: tag })),
    [form.tags]
  );

  const altError = touched && form.alt.trim() === '' ? 'Alt text is required.' : '';

  const save = async () => {
    setTouched(true);
    if (form.alt.trim() === '') return;

    setSaving(true);
    setFailure('');
    try {
      const { data } = await mediaService.patch(item.id, {
        alt: form.alt.trim(),
        title: form.title.trim() || null,
        folder: form.folder.trim() || null,
        tags: form.tags,
      });
      onSaved?.(data);
    } catch (thrown) {
      setFailure(firstFieldMessage(thrown, 'The changes could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setFailure('');
    try {
      await mediaService.remove(item.id, { force });
      onDeleted?.(item);
    } catch (thrown) {
      if (thrown?.status === 409) {
        setBlocked(thrown?.data?.usedIn ?? thrown?.data?.usedBy ?? []);
        setFailure('');
      } else {
        setFailure(firstFieldMessage(thrown, 'The file could not be removed.'));
      }
    } finally {
      setDeleting(false);
    }
  };

  const listed = blocked ?? usages;

  return (
    <Drawer
      open={Boolean(item)}
      onClose={onClose}
      title="File details"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      {item ? (
        <div className={styles.drawer}>
          {failure ? (
            <Alert tone="error" title="Something went wrong">
              {failure}
            </Alert>
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
            onChange={(event) => setForm((current) => ({ ...current, alt: event.target.value }))}
          />

          <TextField
            label="Title"
            value={form.title}
            maxLength={200}
            hint="Optional. What this file is called in the library."
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />

          <TextField
            label="Folder"
            value={form.folder}
            maxLength={120}
            list="sna-media-drawer-folders"
            hint="Optional. Groups the file in the library."
            onChange={(event) => setForm((current) => ({ ...current, folder: event.target.value }))}
          />
          <datalist id="sna-media-drawer-folders">
            {folders.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <MultiSelect
            label="Tags"
            options={tagOptions}
            value={form.tags}
            creatable
            placeholder="Type a tag and press Enter"
            hint="Optional. Your own words for finding this file again."
            onChange={(tags) => setForm((current) => ({ ...current, tags }))}
          />

          <section className={styles.usage}>
            <h3 className={styles.usageTitle}>
              {usages.length === 0
                ? 'Not used anywhere yet'
                : `Used in ${usages.length} ${usages.length === 1 ? 'place' : 'places'}`}
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
                <p>It appears in {listed.length} place(s):</p>
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
                  Remove it from those first, or tick the box below to remove the library entry
                  anyway.
                </p>
              </Alert>
            ) : null}

            {confirming ? (
              <>
                <p className={styles.dangerText}>
                  This removes the library entry only. The file itself stays on Cloudinary — this
                  site has never held it — so anything already pointing at the address keeps
                  working.
                </p>
                <label className={styles.forceLabel}>
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(event) => setForce(event.target.checked)}
                  />
                  Force delete metadata, even if the file is in use
                </label>
                <div className={styles.dangerActions}>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                  <Button variant="danger" loading={deleting} onClick={remove}>
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
  );
}
