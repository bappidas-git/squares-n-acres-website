import { useId, useState } from 'react';
import { Icon } from '@iconify/react';

import { ImageHint } from '../../../../../components/admin/ImageField';
import {
  Button,
  IconButton,
  LazyImage,
  TextField,
  TextareaField,
} from '../../../../../components/ui';
import { URL_PATTERN } from '../../../../../utils/validation';

import styles from './ImageGalleryEditor.module.css';

/** One URL per line, blanks and duplicates dropped, order kept. */
export function parseUrlList(text, existing = []) {
  const known = new Set(existing);
  const found = [];
  String(text ?? '')
    .split(/[\n,]/)
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
 * @param {Record<string, string>} props.errors keyed `images.<i>.<field>`
 * @param {string} [props.altHint] the focus keyword, when the SEO tab has one
 * @param {(urls: string[]) => void} props.onAdd one or many
 * @param {(id: string|number, patch: object) => void} props.onUpdate
 * @param {(id: string|number) => void} props.onRemove
 * @param {(from: number, to: number) => void} props.onMove
 * @param {(id: string|number) => void} props.onSetCover
 */
export default function ImageGalleryEditor({
  images = [],
  errors = {},
  disabled = false,
  altHint,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onSetCover,
}) {
  const coverName = useId();
  const [single, setSingle] = useState('');
  const [bulk, setBulk] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const urls = images.map((image) => image.url).filter(Boolean);
  const missingAlt = images.filter((image) => String(image.alt ?? '').trim() === '').length;

  const move = (from, to) => {
    if (disabled || to < 0 || to >= images.length || from === to) return;
    onMove?.(from, to);
    setAnnouncement(
      `${images[from]?.alt || `Image ${from + 1}`} moved to position ${to + 1} of ${images.length}.`
    );
  };

  const addSingle = () => {
    const found = parseUrlList(single, urls);
    if (found.length === 0) return;
    onAdd?.(found);
    setSingle('');
  };

  const addBulk = () => {
    const found = parseUrlList(bulk, urls);
    if (found.length === 0) return;
    onAdd?.(found);
    setBulk('');
    setBulkOpen(false);
    setAnnouncement(`${found.length} ${found.length === 1 ? 'image' : 'images'} added.`);
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
      </p>

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
                    label={`Image ${index + 1} URL`}
                    type="url"
                    value={image.url ?? ''}
                    error={errors[`images.${index}.url`]}
                    disabled={disabled}
                    placeholder="https://…"
                    onChange={(event) => onUpdate?.(image.id, { url: event.target.value })}
                  />

                  <TextField
                    label="Alt text"
                    required
                    value={image.alt ?? ''}
                    error={altError}
                    disabled={disabled}
                    maxLength={160}
                    hint={
                      altHint
                        ? `Describe what is shown. Use: ${altHint}`
                        : 'Describe what is shown — a screen reader reads this, and Google indexes the photograph by it.'
                    }
                    onChange={(event) => onUpdate?.(image.id, { alt: event.target.value })}
                  />

                  <TextField
                    label="Caption"
                    value={image.caption ?? ''}
                    disabled={disabled}
                    maxLength={160}
                    hint="Optional. Printed under the photograph in the lightbox."
                    onChange={(event) => onUpdate?.(image.id, { caption: event.target.value })}
                  />

                  <div className={styles.cardActions}>
                    <label className={styles.cover}>
                      <input
                        type="radio"
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
          label="Add an image"
          type="url"
          value={single}
          disabled={disabled}
          placeholder="https://…"
          onChange={(event) => setSingle(event.target.value)}
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
            disabled={disabled}
            hint="Paste a list from the photographer. Anything already in the gallery is skipped."
            onChange={(event) => setBulk(event.target.value)}
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

      <p className={styles.announcer} role="status" aria-live="polite" aria-label="Gallery order">
        {announcement}
      </p>
    </div>
  );
}
