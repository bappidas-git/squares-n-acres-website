import { useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import { Alert, Button, TextField } from '../../../components/ui';
import { acceptAttribute, acceptHint, formatBytes } from './useMediaUpload';

import styles from './MediaLibraryPage.module.css';

/** What each row's state is called, and how it reads. */
const STATUS_LABELS = {
  queued: 'Waiting',
  uploading: 'Uploading',
  saving: 'Saving to the library',
  done: 'Added',
  error: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Drag files here.
 *
 * The zone and the progress rows are one component because they are one
 * conversation: a file that is dropped becomes a row, the row shows how far it
 * has got, and a row that failed offers the only two answers there are —
 * try again, or take it off the list. Files behind a failure keep going (§7),
 * which is why each row carries its own state rather than the zone carrying
 * one for all of them.
 *
 * The folder is chosen here rather than per file: an editor dropping eight
 * photographs of one project is filing eight photographs of one project.
 *
 * @param {object} props
 * @param {ReturnType<import('./useMediaUpload').default>} props.queue
 * @param {'image'|'video'|'document'|'any'} [props.accept]
 * @param {string} [props.folder] the folder new files are filed under
 * @param {(folder: string) => void} [props.onFolderChange] omit to hide the field
 * @param {string[]} [props.folders]
 * @param {boolean} [props.disabled]
 */
export default function MediaUploadZone({
  queue,
  accept = 'any',
  folder = '',
  onFolderChange,
  folders = [],
  disabled = false,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const { items, enqueue, retry, cancel, dismiss, clear } = queue;
  const finished = items.filter((item) => item.status === 'done' || item.status === 'error');

  const choose = (files) => {
    if (disabled || !files?.length) return;
    enqueue(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={styles.uploader}>
      {onFolderChange ? (
        <>
          <TextField
            label="Folder"
            value={folder}
            maxLength={120}
            disabled={disabled}
            list={`${inputId}-folders`}
            placeholder="e.g. properties"
            hint="Everything dropped below is filed here. Cloudinary stores it under sna/<folder>."
            onChange={(event) => onFolderChange(event.target.value)}
          />
          <datalist id={`${inputId}-folders`}>
            {folders.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </>
      ) : null}

      <div
        className={[styles.dropzone, dragging ? styles.dropzoneOver : ''].filter(Boolean).join(' ')}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer?.files);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className={styles.fileInput}
          accept={acceptAttribute(accept)}
          disabled={disabled}
          aria-label="Choose files to upload"
          onChange={(event) => choose(event.target.files)}
        />
        <Icon
          icon="mdi:cloud-upload-outline"
          width="32"
          height="32"
          aria-hidden="true"
          className={styles.dropzoneIcon}
        />
        <span className={styles.dropzoneText}>
          Drag files here, or choose them
          <span className={styles.dropzoneHint}>{acceptHint(accept)}</span>
        </span>
      </div>

      {items.length > 0 ? (
        <ul className={styles.queue} aria-label="Uploads">
          {items.map((item) => {
            const active =
              item.status === 'uploading' || item.status === 'saving' || item.status === 'queued';

            return (
              <li key={item.id} className={styles.queueRow}>
                <span className={styles.queueMain}>
                  <span className={styles.queueName} title={item.name}>
                    {item.name}
                  </span>
                  <span className={styles.queueMeta}>
                    {STATUS_LABELS[item.status] ?? item.status}
                    {item.size ? ` · ${formatBytes(item.size)}` : ''}
                    {item.status === 'uploading' ? ` · ${item.progress}%` : ''}
                  </span>

                  {active ? (
                    <span className={styles.progressTrack}>
                      <span
                        className={styles.progressBar}
                        role="progressbar"
                        aria-label={`Uploading ${item.name}`}
                        aria-valuenow={item.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{ width: `${item.status === 'saving' ? 100 : item.progress}%` }}
                      />
                    </span>
                  ) : null}

                  {item.error ? (
                    <span className={styles.queueError} role="alert">
                      {item.error}
                    </span>
                  ) : null}
                </span>

                <span className={styles.queueActions}>
                  {item.status === 'done' ? (
                    <Icon
                      icon="mdi:check-circle-outline"
                      width="20"
                      height="20"
                      aria-hidden="true"
                      className={styles.queueDone}
                    />
                  ) : null}
                  {active ? (
                    <Button variant="ghost" size="sm" onClick={() => cancel(item.id)}>
                      Cancel
                    </Button>
                  ) : null}
                  {item.status === 'error' || item.status === 'cancelled' ? (
                    <Button variant="outline" size="sm" onClick={() => retry(item.id)}>
                      Retry
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => dismiss(item.id)}>
                    Remove
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {finished.length > 0 ? (
        <div className={styles.queueFooter}>
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear finished ({finished.length})
          </Button>
        </div>
      ) : null}

      {disabled ? (
        <Alert tone="info" title="Uploads are switched off">
          Configure Cloudinary in Settings → Integrations to enable uploads.
        </Alert>
      ) : null}
    </div>
  );
}
