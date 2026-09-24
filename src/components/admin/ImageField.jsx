import { Suspense, lazy, useId } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import LazyImage from '../ui/LazyImage';
import useMediaField from './useMediaField';
import { URL_PATTERN } from '../../utils/validation';

import styles from './ImageField.module.css';

// The picker carries the whole library — the grid, the upload queue, the URL
// form — and most forms never open it. It arrives when somebody presses a
// button, not when a form renders.
const MediaPickerDialog = lazy(() => import('./MediaPickerDialog'));

/**
 * What each kind of image slot needs, from the layouts that render them.
 *
 * These are the texts `ImageUrlHelperText` + `imageFieldConfig.js` used to
 * carry; they live here because the hint belongs to the field, not to a second
 * component every caller had to remember to place underneath it.
 */
export const IMAGE_HINTS = {
  gallery: {
    ratio: '16 / 9',
    text: 'Recommended 1920 × 1080 px — 16:9 (cropped to 4:3 on phones).',
  },
  floorPlan: {
    ratio: null,
    text: 'Recommended at least 1200 × 900 px — any ratio; keep dimensions legible.',
  },
  logo: {
    ratio: '5 / 2',
    text: 'Recommended 240 × 120 px — square or landscape, PNG with transparency.',
  },
  og: {
    ratio: '1.91 / 1',
    text: 'Recommended 1200 × 630 px — 1.91:1, the social-sharing standard.',
  },
  avatar: {
    ratio: '1 / 1',
    text: 'Recommended 256 × 256 px — square; the face centred.',
  },
  hero: {
    ratio: '21 / 9',
    text: 'Recommended 2400 × 1000 px — wide; text sits over the left third.',
  },
};

/**
 * The one-line note under an image input.
 *
 * @param {object} props
 * @param {string} props.hint a key of {@link IMAGE_HINTS}
 * @param {string} [props.id] what the input's `aria-describedby` names — it
 *   named an id nothing carried, so the note was never read out (QA-61)
 */
export function ImageHint({ hint, id }) {
  const preset = IMAGE_HINTS[hint];
  if (!preset) return null;
  return (
    <span className={styles.hint} id={id}>
      <Icon icon="mdi:information-outline" width="14" height="14" aria-hidden="true" />
      {preset.text}
    </span>
  );
}

/**
 * An image slot: a URL, a preview, and the two ways of filling it that do not
 * involve typing an address.
 *
 * The URL box is the constant. Everything else is offered when it can work:
 * "Media library" always, because its Library and URL tabs need no
 * configuration, and "Upload" only once a Cloudinary cloud name and preset
 * exist (§7) — `useMediaField` decides, this component only renders what it
 * is handed, and a caller may still pass its own handlers to override either.
 *
 * Because every image field in the admin is this component, wiring it here
 * wired all of them: the developer logo, the locality photograph, the author's
 * avatar, the page block's picture, the floor plan's drawing.
 *
 * @param {object} props
 * @param {string} [props.id] the URL input's id, for a host that has to focus it
 * @param {string} props.label
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {'gallery'|'floorPlan'|'logo'|'og'|'avatar'|'hero'} [props.hint]
 * @param {boolean} [props.preview]
 * @param {string} [props.ratio] overrides the hint's ratio
 * @param {'image'|'document'|'video'|'any'} [props.accept] what the picker offers
 * @param {string} [props.folder] where an upload from this field is filed
 * @param {(picked: object) => void} [props.onPick] replaces "set the URL" — a
 *   caller that also wants the alt text or the dimensions
 * @param {() => void} [props.onUpload] overrides the built-in upload button
 * @param {() => void} [props.onOpenMedia] overrides the built-in library button
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {string} [props.alt] the preview's alt text
 */
export default function ImageField({
  id: idProp,
  label,
  value = '',
  onChange,
  hint,
  preview = true,
  ratio,
  accept = 'image',
  folder = '',
  onPick,
  onUpload,
  onOpenMedia,
  error,
  required = false,
  disabled = false,
  placeholder = 'https://…',
  alt = '',
}) {
  const generatedId = useId();
  const id = idProp || generatedId;
  const media = useMediaField({
    accept,
    folder,
    onPick: (picked) => {
      if (onPick) onPick(picked);
      else onChange?.(picked.url);
    },
  });

  // A caller's own handler wins; otherwise the picker's, unless it is disabled.
  const openMedia = onOpenMedia ?? (disabled ? undefined : media.onOpenMedia);
  const upload = onUpload ?? (disabled ? undefined : media.onUpload);
  const preset = IMAGE_HINTS[hint] ?? {};
  const hintId = IMAGE_HINTS[hint] ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  // Previewing every prefix of a URL fires a request per keystroke and fails
  // loudly in the console, so the preview waits for a complete one.
  const showPreview = preview && URL_PATTERN.test(value);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className={styles.row}>
        <input
          id={id}
          type="url"
          inputMode="url"
          className={[styles.input, error ? styles.invalid : ''].filter(Boolean).join(' ')}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />
        {value ? (
          <Button variant="ghost" size="sm" onClick={() => onChange?.('')} disabled={disabled}>
            Clear
          </Button>
        ) : null}
        {upload ? (
          <Button
            variant="outline"
            size="sm"
            onClick={upload}
            disabled={disabled}
            icon={<Icon icon="mdi:tray-arrow-up" width="16" height="16" />}
          >
            Upload
          </Button>
        ) : null}
        {openMedia ? (
          <Button
            variant="outline"
            size="sm"
            onClick={openMedia}
            disabled={disabled}
            icon={<Icon icon="mdi:image-multiple-outline" width="16" height="16" />}
          >
            Media library
          </Button>
        ) : null}
      </div>

      {hintId ? <ImageHint hint={hint} id={hintId} /> : null}
      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}

      {showPreview ? (
        <div className={styles.preview}>
          <LazyImage
            src={value}
            alt={alt}
            ratio={ratio ?? preset.ratio ?? '16 / 9'}
            fit="contain"
            sizes="(max-width: 899px) 100vw, 480px"
          />
        </div>
      ) : null}

      {media.isOpen ? (
        <Suspense fallback={null}>
          <MediaPickerDialog
            {...media.dialogProps}
            title={`Choose ${accept === 'image' ? 'an image' : 'a file'} for “${label}”`}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
