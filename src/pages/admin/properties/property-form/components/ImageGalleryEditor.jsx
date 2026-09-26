import { Suspense, lazy, useId, useState } from 'react';
import { Icon } from '@iconify/react';

import MediaUploadZone from '../../../media/MediaUploadZone';
import useCloudinaryConfig from '../../../../../hooks/useCloudinaryConfig';
import useMediaUpload from '../../../media/useMediaUpload';
import { ImageHint } from '../../../../../components/admin/ImageField';
import {
  Button,
  IconButton,
  LazyImage,
  TextField,
  TextareaField,
} from '../../../../../components/ui';
import { URL_PATTERN } from '../../../../../utils/validation';
import { useToast } from '../../../../../components/common/ToastProvider';
import { LIMITS } from '../validators/property';

import styles from './ImageGalleryEditor.module.css';

// Eight photographs of a project is the commonest thing an editor does here,
// and the library is the fastest way to do it — but it is still a dialog most
// visits never open, so it arrives when the button is pressed.
const MediaPickerDialog = lazy(() => import('../../../../../components/admin/MediaPickerDialog'));

/**
 * Where a listing's photographs were all filed before each listing had a
 * folder of its own — and where the library opens while this one's holds
 * nothing yet (prompt 51).
 */
export const GALLERY_FOLDER = 'properties';

/**
 * One URL per line (or per space), blanks and duplicates dropped, order kept.
 *
 * Not per comma: a Cloudinary address carries its transformation as
 * `…/upload/w_1600,h_900,c_fill/…`, and splitting on the commas turned one
 * photograph into three broken rows.
 */
export function parseUrlList(text, existing = []) {
  const known = new Set(existing);
  const found = [];
  String(text ?? '')
    .split(/\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((url) => {
      if (known.has(url)) return;
      known.add(url);
      found.push(url);
    });
  return found;
}

/**
 * What adding files from the library says: how many were added and how many
 * the gallery already held.
 *
 * @param {number} added
 * @param {number} skipped
 * @returns {string}
 */
export function galleryAddMessage(added, skipped) {
  const held = `${skipped} ${skipped === 1 ? 'was' : 'were'} already in the gallery`;
  if (added === 0) {
    return skipped === 1
      ? 'That photograph is already in the gallery.'
      : 'Those photographs are already in the gallery.';
  }
  return skipped > 0 ? `Added ${added} — ${held}.` : `Added ${added}.`;
}

/**
 * "Fill empty alt text" (prompt 51): `<title> — <locality> — photo <n>` for each
 * image that has an address and no description, `n` its place in the gallery.
 * A start the editor improves on — an image already described is never
 * touched.
 *
 * @param {Array<object>} images
 * @param {{title?: string, locality?: string}} [source]
 * @returns {Array<{id: string|number, alt: string}>} one patch per filled image
 */
export function fillEmptyAlts(images = [], { title, locality } = {}) {
  const lead = [title, locality].map((part) => String(part ?? '').trim()).filter(Boolean);
  return images
    .map((image, index) => {
      if (!String(image?.url ?? '').trim() || String(image?.alt ?? '').trim()) return null;
      const photo = lead.length > 0 ? `photo ${index + 1}` : `Photo ${index + 1}`;
      return { id: image.id, alt: [...lead, photo].join(' — ') };
    })
    .filter(Boolean);
}

/**
 * Which row has to become the cover once `id` is removed.
 *
 * A gallery is never left without one: the cover is what the card, the search
 * result and every share of the listing show, and "the first image" is the only
 * answer that needs no decision from the editor (§7 of prompt 19).
 *
 * @param {Array<object>} images the gallery *before* the removal
 * @param {string|number} id the row going away
 * @returns {string|number|null} the row to promote, or `null` when none is needed
 */
export function coverAfterRemoval(images = [], id) {
  const removed = images.find((image) => String(image.id) === String(id));
  if (!removed?.isCover) return null;
  const next = images.find((image) => String(image.id) !== String(id));
  return next ? next.id : null;
}

/**
 * The listing's photographs.
 *
 * The boilerplate's gallery was a column of URL boxes whose first row was the
 * cover by position — so promoting a photograph meant dragging it to the top,
 * and no photograph had a description at all. This keeps the drag (with the
 * keyboard alternative every reorder in the product has) but makes the cover an
 * explicit choice, and makes `alt` a field the editor cannot skip: it is what a
 * screen reader reads and what Google indexes the image by (§8.3, §9).
 *
 * @param {object} props
 * @param {Array<object>} props.images `{ id, url, alt, caption, isCover }`
 * @param {Record<string, string>} props.errors keyed `images.<i>.<field>`, and
 *   `images` for the gallery as a whole — no cover, nothing described
 * @param {(path: string) => string} [props.idFor] the DOM id of the control for a
 *   dotted path, so a failed save can put the cursor in it
 * @param {string} [props.altHint] the focus keyword, when the SEO tab has one
 * @param {(images: Array<{url: string, alt?: string, caption?: string}>) => void} props.onAdd
 *   one or many; a photograph chosen from the library brings its alt text with it
 * @param {(id: string|number, patch: object) => void} props.onUpdate
 * @param {(id: string|number) => void} props.onRemove
 * @param {(from: number, to: number) => void} props.onMove
 * @param {(id: string|number) => void} props.onSetCover
 * @param {string} [props.folder] where this listing's uploads are filed —
 *   `properties/<slug>` (prompt 51)
 * @param {{title?: string, locality?: string}} [props.altSource] what "Fill
 *   empty alt text" writes from (prompt 51)
 */
export default function ImageGalleryEditor({
  images = [],
  errors = {},
  idFor = () => undefined,
  disabled = false,
  folder = GALLERY_FOLDER,
  altHint,
  altSource,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onSetCover,
}) {
  const coverName = useId();
  const toast = useToast();
  const { configured } = useCloudinaryConfig();
  const [single, setSingle] = useState('');
  const [singleError, setSingleError] = useState('');
  const [bulk, setBulk] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const urls = images.map((image) => image.url).filter(Boolean);
  // "Choose the cover", "a published listing needs a described photograph":
  // about the gallery rather than a row, and until now printed nowhere — the
  // Media badge counted it and the tab showed nothing to fix.
  const galleryError = errors.images;

  /**
   * Appends files the library gave us, skipping the ones already in the
   * gallery (§7: "appends without duplicates, by URL").
   */
  const addPicked = (items) => {
    const known = new Set(urls);
    const fresh = items
      .filter((item) => item?.url && !known.has(item.url))
      .map((item) => ({ url: item.url, alt: item.alt ?? '', caption: '' }));
    const skipped = items.length - fresh.length;

    // Said where it is seen (prompt 51): the only message used to go to a
    // visually hidden region, so a pick of files the gallery already held
    // looked like a button that did nothing.
    const message = galleryAddMessage(fresh.length, skipped);
    if (fresh.length === 0) {
      toast.info(message);
      setAnnouncement(message);
      return { added: 0, skipped };
    }
    onAdd?.(fresh);
    toast.success(message);
    setAnnouncement(message);
    return { added: fresh.length, skipped };
  };

  const queue = useMediaUpload({
    folder,
    accept: 'image',
    onUploaded: addPicked,
  });
  const missingAlt = images.filter((image) => String(image.alt ?? '').trim() === '').length;

  const fillAlts = () => {
    const patches = fillEmptyAlts(images, altSource);
    if (patches.length === 0) {
      toast.info('Every image is already described.');
      return;
    }
    patches.forEach((patch) => onUpdate?.(patch.id, { alt: patch.alt }));
    const message = `${patches.length} ${
      patches.length === 1 ? 'image described' : 'images described'
    } from the title and the locality — edit any of them.`;
    toast.success(message);
    setAnnouncement(message);
  };

  const move = (from, to) => {
    if (disabled || to < 0 || to >= images.length || from === to) return;
    onMove?.(from, to);
    setAnnouncement(
      `${images[from]?.alt || `Image ${from + 1}`} moved to position ${to + 1} of ${images.length}.`
    );
  };

  /** A typed or pasted list of addresses, as gallery rows. */
  const asRows = (found) => found.map((url) => ({ url, alt: '', caption: '' }));

  /**
   * An address, or several pasted at once — but only addresses. Split on the
   * spaces, "not a url" became three broken gallery rows; and an address
   * already in the gallery did nothing at all, with the box still full and no
   * word as to why (QA-62).
   */
  const addSingle = () => {
    const pieces = single.trim().split(/\s+/).filter(Boolean);
    if (pieces.length === 0) return;
    if (!pieces.every((piece) => URL_PATTERN.test(piece))) {
      setSingleError(
        pieces.length === 1
          ? 'Enter the address of a photograph, starting with http:// or https://.'
          : 'Enter one address, starting with http:// or https://. A list goes in “Add multiple URLs”.'
      );
      return;
    }
    const found = parseUrlList(single, urls);
    if (found.length === 0) {
      setSingleError(
        pieces.length === 1
          ? 'That photograph is already in the gallery.'
          : 'Those photographs are already in the gallery.'
      );
      return;
    }
    onAdd?.(asRows(found));
    setSingle('');
    setSingleError('');
    setAnnouncement(`${found.length} ${found.length === 1 ? 'image' : 'images'} added.`);
  };

  /**
   * The pasted list: every address is added, and a line that is not one stays
   * in the box to be fixed rather than becoming a broken row.
   */
  const addBulk = () => {
    const lines = bulk.split(/\s+/).filter(Boolean);
    const rejected = lines.filter((line) => !URL_PATTERN.test(line));
    const found = parseUrlList(lines.filter((line) => URL_PATTERN.test(line)).join('\n'), urls);
    if (found.length > 0) onAdd?.(asRows(found));

    const added = `${found.length} ${found.length === 1 ? 'image' : 'images'} added.`;
    if (rejected.length > 0) {
      setBulk(rejected.join('\n'));
      setBulkError(
        `${rejected.length === 1 ? 'This line is' : `These ${rejected.length} lines are`} not the address of a photograph — fix or remove ${rejected.length === 1 ? 'it' : 'them'}.`
      );
      if (found.length > 0) setAnnouncement(added);
      return;
    }
    setBulk('');
    setBulkError('');
    setBulkOpen(false);
    setAnnouncement(found.length > 0 ? added : 'Those photographs are already in the gallery.');
  };

  return (
    <div className={styles.editor}>
      <p className={styles.counts} data-testid="gallery-counts">
        <span>{`${images.length} ${images.length === 1 ? 'image' : 'images'}`}</span>
        {missingAlt > 0 ? (
          <span className={styles.missing}>{` · ${missingAlt} missing alt`}</span>
        ) : images.length > 0 ? (
          <span className={styles.described}> · every image described</span>
        ) : null}
        {missingAlt > 0 && !disabled ? (
          <Button
            size="sm"
            variant="ghost"
            className={styles.fillAlts}
            icon={<Icon icon="mdi:text-box-edit-outline" width="16" height="16" />}
            onClick={fillAlts}
          >
            Fill empty alt text
          </Button>
        ) : null}
      </p>
      {missingAlt > 0 ? (
        <p className={styles.altNote}>
          A draft saves without descriptions; the listing needs one for every image before it goes
          live.
        </p>
      ) : null}

      {galleryError ? (
        <p className={styles.galleryError} id={idFor('images')} tabIndex={-1} role="alert">
          <Icon icon="mdi:alert-circle-outline" width="18" height="18" aria-hidden="true" />
          {galleryError}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className={styles.empty}>
          No photographs yet. The first one becomes the cover — the picture on the card, in search
          results and in every share of this listing.
        </p>
      ) : (
        <ul className={styles.grid} aria-label="Gallery images">
          {images.map((image, index) => {
            const valid = URL_PATTERN.test(image.url ?? '');
            const altError = errors[`images.${index}.alt`];

            return (
              <li
                key={image.id}
                className={[styles.card, dragging === index ? styles.dragging : '']
                  .filter(Boolean)
                  .join(' ')}
                draggable={!disabled}
                onDragStart={(event) => {
                  setDragging(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(image.id));
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging !== null) move(dragging, index);
                  setDragging(null);
                }}
                onDragEnd={() => setDragging(null)}
              >
                <div className={styles.thumb}>
                  {valid ? (
                    <LazyImage src={image.url} alt="" ratio="4 / 3" />
                  ) : (
                    <span className={styles.noThumb}>
                      <Icon
                        icon="mdi:image-off-outline"
                        width="24"
                        height="24"
                        aria-hidden="true"
                      />
                    </span>
                  )}
                  <span className={styles.handle} aria-hidden="true">
                    <Icon icon="mdi:drag" width="18" height="18" />
                  </span>
                </div>

                <div className={styles.body}>
                  <TextField
                    id={idFor(`images.${index}.url`)}
                    label={`Image ${index + 1} URL`}
                    type="url"
                    value={image.url ?? ''}
                    error={errors[`images.${index}.url`]}
                    disabled={disabled}
                    placeholder="https://…"
                    onChange={(event) => onUpdate?.(image.id, { url: event.target.value })}
                  />

                  <TextField
                    id={idFor(`images.${index}.alt`)}
                    label="Alt text"
                    value={image.alt ?? ''}
                    error={altError}
                    disabled={disabled}
                    maxLength={LIMITS.imageAlt}
                    hint={
                      altHint
                        ? `Describe what is shown. Use: ${altHint}`
                        : 'Describe what is shown — a screen reader reads this, and Google indexes the photograph by it.'
                    }
                    onChange={(event) => onUpdate?.(image.id, { alt: event.target.value })}
                  />

                  <TextField
                    id={idFor(`images.${index}.caption`)}
                    label="Caption"
                    value={image.caption ?? ''}
                    error={errors[`images.${index}.caption`]}
                    disabled={disabled}
                    maxLength={LIMITS.imageCaption}
                    hint="Optional. Printed under the photograph in the lightbox."
                    onChange={(event) => onUpdate?.(image.id, { caption: event.target.value })}
                  />

                  <div className={styles.cardActions}>
                    <label className={styles.cover}>
                      <input
                        type="radio"
                        id={idFor(`images.${index}.isCover`)}
                        name={coverName}
                        checked={image.isCover === true}
                        disabled={disabled}
                        onChange={() => onSetCover?.(image.id)}
                      />
                      Cover image
                    </label>

                    <span className={styles.moves}>
                      <IconButton
                        label={`Move image ${index + 1} earlier`}
                        size="sm"
                        disabled={disabled || index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <Icon icon="mdi:arrow-left" width="18" height="18" />
                      </IconButton>
                      <IconButton
                        label={`Move image ${index + 1} later`}
                        size="sm"
                        disabled={disabled || index === images.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <Icon icon="mdi:arrow-right" width="18" height="18" />
                      </IconButton>
                      <IconButton
                        label={`Remove image ${index + 1}`}
                        size="sm"
                        disabled={disabled}
                        onClick={() => onRemove?.(image.id)}
                      >
                        <Icon icon="mdi:delete-outline" width="18" height="18" />
                      </IconButton>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.add}>
        <TextField
          // The gallery's own address while it has no message: "add more
          // photographs" from the SEO tab lands here.
          id={galleryError ? undefined : idFor('images')}
          label="Add an image"
          type="url"
          value={single}
          error={singleError || undefined}
          disabled={disabled}
          placeholder="https://…"
          onChange={(event) => {
            setSingle(event.target.value);
            setSingleError('');
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            addSingle();
          }}
        />
        <div className={styles.addActions}>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || single.trim() === ''}
            onClick={addSingle}
            icon={<Icon icon="mdi:plus" width="16" height="16" />}
          >
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
            icon={<Icon icon="mdi:image-multiple-outline" width="16" height="16" />}
          >
            Add from library
          </Button>
          {configured ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-expanded={uploadOpen}
              onClick={() => setUploadOpen((open) => !open)}
              icon={<Icon icon="mdi:tray-arrow-up" width="16" height="16" />}
            >
              Upload photographs
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-expanded={bulkOpen}
            onClick={() => setBulkOpen((open) => !open)}
            icon={<Icon icon="mdi:format-list-bulleted" width="16" height="16" />}
          >
            Add multiple URLs
          </Button>
        </div>
      </div>

      <ImageHint hint="gallery" />

      {bulkOpen ? (
        <div className={styles.bulk}>
          <TextareaField
            label="One URL per line"
            rows={5}
            value={bulk}
            error={bulkError || undefined}
            disabled={disabled}
            hint="Paste a list from the photographer, one address per line. Anything already in the gallery is skipped."
            onChange={(event) => {
              setBulk(event.target.value);
              setBulkError('');
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || bulk.trim() === ''}
            onClick={addBulk}
            icon={<Icon icon="mdi:tray-arrow-down" width="16" height="16" />}
          >
            Add these images
          </Button>
        </div>
      ) : null}

      {configured && uploadOpen ? (
        <MediaUploadZone queue={queue} accept="image" folder={folder} disabled={disabled} />
      ) : null}

      {pickerOpen ? (
        <Suspense fallback={null}>
          <MediaPickerDialog
            open
            multiple
            accept="image"
            folder={folder}
            fallbackFolder={GALLERY_FOLDER}
            title="Add photographs to this listing"
            excludeUrls={urls}
            excludeLabel="In the gallery"
            onClose={() => setPickerOpen(false)}
            onSelect={addPicked}
          />
        </Suspense>
      ) : null}

      <p className={styles.announcer} role="status" aria-live="polite" aria-label="Gallery order">
        {announcement}
      </p>
    </div>
  );
}
