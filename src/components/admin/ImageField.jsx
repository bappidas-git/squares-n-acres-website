import { useId } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import LazyImage from '../ui/LazyImage';
import { URL_PATTERN } from '../../utils/validation';

import styles from './ImageField.module.css';

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

/** The one-line note under an image input. */
export function ImageHint({ hint }) {
  const preset = IMAGE_HINTS[hint];
  if (!preset) return null;
  return (
    <span className={styles.hint}>
      <Icon icon="mdi:information-outline" width="14" height="14" aria-hidden="true" />
      {preset.text}
    </span>
  );
}

/**
 * An image slot: a URL, a preview, and — once prompt 39 wires them — a way to
 * upload or to pick from the media library.
 *
 * The two buttons are rendered **only** when their handler is given, because a
 * button that does nothing is worse than no button at all.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {'gallery'|'floorPlan'|'logo'|'og'|'avatar'|'hero'} [props.hint]
 * @param {boolean} [props.preview]
 * @param {string} [props.ratio] overrides the hint's ratio
 * @param {() => void} [props.onUpload] renders "Upload" (prompt 39)
 * @param {() => void} [props.onOpenMedia] renders "Media library" (prompt 39)
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {string} [props.alt] the preview's alt text
 */
export default function ImageField({
  label,
  value = '',
  onChange,
  hint,
  preview = true,
  ratio,
  onUpload,
  onOpenMedia,
  error,
  required = false,
  disabled = false,
  placeholder = 'https://…',
  alt = '',
}) {
  const id = useId();
  const preset = IMAGE_HINTS[hint] ?? {};
  const hintId = hint ? `${id}-hint` : undefined;
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
        {onUpload ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            disabled={disabled}
            icon={<Icon icon="mdi:tray-arrow-up" width="16" height="16" />}
          >
            Upload
          </Button>
        ) : null}
        {onOpenMedia ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMedia}
            disabled={disabled}
            icon={<Icon icon="mdi:image-multiple-outline" width="16" height="16" />}
          >
            Media library
          </Button>
        ) : null}
      </div>

      {hint ? <ImageHint hint={hint} /> : null}
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
          />
        </div>
      ) : null}
    </div>
  );
}
