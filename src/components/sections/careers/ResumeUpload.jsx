import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import { Button, UrlField } from '../../ui';
import { isCloudinaryConfigured, uploadToCloudinary } from '../../../utils/cloudinary';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

import styles from './careers.module.css';

/** §7: nothing larger than five megabytes leaves the browser. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** The three formats a résumé arrives in. */
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/** The Cloudinary folder applications are filed under. */
const RESUME_FOLDER = 'resumes';

/** The word a visitor reads for a size. */
export const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * What is wrong with a file, before a byte of it is sent (§7).
 *
 * Exported for the unit test.
 *
 * @param {File|null} file
 * @returns {string} `''` when the file may be uploaded
 */
export function fileError(file) {
  if (!file) return 'Choose a file to upload.';

  const name = String(file.name ?? '').toLowerCase();
  if (!RESUME_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'A résumé must be a PDF, DOC or DOCX file.';
  }
  if (typeof file.size === 'number' && file.size > MAX_RESUME_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is 5 MB — send a link instead if it will not shrink.`;
  }

  return '';
}

/**
 * The résumé half of an application (decision D12).
 *
 * There is no multipart endpoint on the API, so a file goes straight to
 * Cloudinary with an unsigned preset and only the URL is stored. When no cloud
 * name and preset are configured — which is the state of every checkout until
 * a client provides theirs — the control is a URL box instead, because a
 * careers page that cannot take a résumé is not a careers page.
 *
 * The same box comes back on demand after a failed upload: somebody whose
 * file will not go through can still apply with a Drive link rather than
 * being told to try later.
 *
 * @param {object} props
 * @param {string} props.value the résumé URL held by the form
 * @param {(url: string) => void} props.onChange
 * @param {string} [props.error] the form's own message for this field
 * @param {boolean} [props.disabled]
 */
export default function ResumeUpload({ value = '', onChange, error = '', disabled = false }) {
  const { settings } = useSiteSettings();
  const inputId = useId();
  const inputRef = useRef(null);
  const controllerRef = useRef(null);

  const configured = isCloudinaryConfigured(settings);

  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [linkMode, setLinkMode] = useState(!configured);
  const [dragging, setDragging] = useState(false);

  // A cloud name that arrives with the settings (they load after the first
  // paint) switches the control over, unless the applicant has already asked
  // for the link box.
  useEffect(() => {
    if (configured) return;
    setLinkMode(true);
  }, [configured]);

  // An upload in flight when the page leaves is an upload nobody is waiting for.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const upload = useCallback(
    async (chosen) => {
      const problem = fileError(chosen);
      if (problem) {
        setUploadError(problem);
        setFile(null);
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      setFile(chosen);
      setUploadError('');
      setProgress(0);
      setUploading(true);
      onChange?.('');

      try {
        const result = await uploadToCloudinary(chosen, {
          resourceType: 'auto',
          folder: RESUME_FOLDER,
          settings,
          signal: controller.signal,
          onProgress: setProgress,
        });
        onChange?.(result.url);
      } catch (thrown) {
        if (thrown?.name === 'AbortError') {
          setFile(null);
          setProgress(0);
          return;
        }
        setUploadError(thrown?.message || 'The upload failed. Try again, or send a link instead.');
      } finally {
        controllerRef.current = null;
        setUploading(false);
      }
    },
    [onChange, settings]
  );

  const choose = (chosen) => {
    if (!chosen) return;
    upload(chosen);
  };

  const cancel = () => controllerRef.current?.abort();

  const clear = () => {
    setFile(null);
    setProgress(0);
    setUploadError('');
    onChange?.('');
    if (inputRef.current) inputRef.current.value = '';
  };

  if (linkMode) {
    return (
      <div className={styles.resume}>
        <UrlField
          label="Résumé link (Google Drive, Dropbox or any URL)"
          required
          value={value}
          disabled={disabled}
          error={error}
          placeholder="https://"
          hint="Paste a link anyone with the address can open. Include https://"
          onChange={(event) => onChange?.(event.target.value)}
        />

        {configured ? (
          <Button
            variant="link"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setLinkMode(false);
              setUploadError('');
              onChange?.('');
            }}
          >
            Upload a file instead
          </Button>
        ) : null}
      </div>
    );
  }

  const message = uploadError || error;

  return (
    <div className={styles.resume}>
      <span className={styles.resumeLabel} id={`${inputId}-label`}>
        Résumé <span aria-hidden="true">*</span>
      </span>

      <div
        className={[styles.dropzone, dragging ? styles.dropzoneOver : ''].filter(Boolean).join(' ')}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled || uploading) return;
          choose(event.dataTransfer?.files?.[0] ?? null);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className={styles.fileInput}
          accept={RESUME_EXTENSIONS.join(',')}
          disabled={disabled || uploading}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={`${inputId}-hint${message ? ` ${inputId}-error` : ''}`}
          aria-invalid={message ? true : undefined}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />

        <Icon
          icon="mdi:file-upload-outline"
          width="28"
          height="28"
          aria-hidden="true"
          className={styles.dropzoneIcon}
        />
        <span className={styles.dropzoneText}>
          Drag your résumé here, or choose a file
          <span className={styles.dropzoneHint} id={`${inputId}-hint`}>
            PDF, DOC or DOCX, up to 5 MB.
          </span>
        </span>
      </div>

      {uploading ? (
        <div className={styles.uploadRow}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-label={`Uploading ${file?.name ?? 'your résumé'}`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.uploadName}>
            {file?.name} · {progress}%
          </span>
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      ) : null}

      {!uploading && value ? (
        <div className={styles.uploadRow}>
          <Icon
            icon="mdi:check-circle-outline"
            width="20"
            height="20"
            aria-hidden="true"
            className={styles.uploadDone}
          />
          <span className={styles.uploadName}>
            {file?.name ?? 'Résumé uploaded'}
            {file?.size ? ` · ${formatBytes(file.size)}` : ''}
          </span>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={clear}>
            Remove
          </Button>
        </div>
      ) : null}

      {message ? (
        <p className={styles.resumeError} id={`${inputId}-error`} role="alert">
          {message}
        </p>
      ) : null}

      {uploadError && !uploading ? (
        <div className={styles.resumeFallback}>
          <Button variant="outline" size="sm" onClick={() => file && upload(file)}>
            Try again
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setLinkMode(true);
              setUploadError('');
              setFile(null);
            }}
          >
            Send a link instead
          </Button>
        </div>
      ) : null}
    </div>
  );
}
