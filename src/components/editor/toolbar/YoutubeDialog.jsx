import { useEffect, useState } from 'react';

import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import { TextField } from '../../ui/FormField';

import styles from '../RichTextEditor.module.css';

/** The YouTube URL shapes the extension can turn into an embed. */
const YOUTUBE_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/i;

/** `true` for a link the embed understands. */
export const isYoutubeUrl = (value) => YOUTUBE_PATTERN.test(String(value ?? '').trim());

/**
 * The video embed.
 *
 * Only YouTube, because that is the one host the sanitiser lets an `<iframe>`
 * point at from written content; anything else is pasted as a link.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.initialUrl]
 * @param {(url: string) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export default function YoutubeDialog({ open, initialUrl = '', onSubmit, onClose }) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setTouched(false);
  }, [open, initialUrl]);

  const invalid = touched && !isYoutubeUrl(url);

  const submit = () => {
    setTouched(true);
    if (!isYoutubeUrl(url)) return;
    onSubmit(url.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="YouTube video"
      size="sm"
      mobile="sheet"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Embed video
          </Button>
        </>
      }
    >
      <div className={styles.dialogGrid}>
        <TextField
          label="Video link"
          required
          value={url}
          placeholder="https://www.youtube.com/watch?v=…"
          error={invalid ? 'Paste a YouTube link.' : undefined}
          hint="Embedded without cookies until the visitor presses play."
          onBlur={() => setTouched(true)}
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>
    </Modal>
  );
}
