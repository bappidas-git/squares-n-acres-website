import { useEffect, useState } from 'react';

import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import { FIGURE_ALIGNMENTS, FIGURE_WIDTHS } from '../nodes/FigureImage';
import { SelectField, TextField } from '../../ui/FormField';

import styles from '../RichTextEditor.module.css';

/**
 * The image editor.
 *
 * Alternative text is required and the dialog says so rather than quietly
 * inserting an undescribed picture: every image on this site carries `alt` from
 * data (§4.3), and an article body is the one place that rule is easy to break.
 *
 * The picture comes from the media library (`onRequestImage`, which every
 * form supplies through `RichTextField`), from an address, or from a file
 * dropped on the editor and uploaded. `value.note` is a line the editor has for
 * the person — why a dropped file did not arrive.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} props.value the attributes of the image being edited
 * @param {string} [props.focusKeyword] hinted as a phrase the alt text might use
 * @param {(() => Promise<{url: string, alt?: string, caption?: string}|null>)} [props.onRequestImage]
 * @param {(attrs: object) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export default function ImageDialog({
  open,
  value,
  focusKeyword = '',
  onRequestImage,
  onSubmit,
  onClose,
}) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [align, setAlign] = useState('center');
  const [size, setSize] = useState('full');
  const [touched, setTouched] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSrc(value?.src ?? '');
    setAlt(value?.alt ?? '');
    setCaption(value?.caption ?? '');
    setAlign(value?.align ?? 'center');
    setSize(value?.size ?? 'full');
    setTouched(false);
  }, [open, value]);

  const missingSrc = touched && src.trim().length === 0;
  const missingAlt = touched && alt.trim().length === 0;

  const submit = () => {
    setTouched(true);
    if (src.trim().length === 0 || alt.trim().length === 0) return;
    onSubmit({ src: src.trim(), alt: alt.trim(), caption: caption.trim(), align, size });
  };

  const chooseFromLibrary = () => {
    if (!onRequestImage) return;
    setPicking(true);
    Promise.resolve(onRequestImage())
      .then((picked) => {
        if (!picked) return;
        setSrc(picked.url ?? '');
        if (picked.alt) setAlt(picked.alt);
        if (picked.caption) setCaption(picked.caption);
      })
      .finally(() => setPicking(false));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Image"
      size="md"
      mobile="fullscreen"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Insert image
          </Button>
        </>
      }
    >
      <div className={styles.dialogGrid}>
        {value?.note ? <Alert tone="info">{value.note}</Alert> : null}
        <TextField
          label="Image address"
          required
          value={src}
          placeholder="https://…"
          error={missingSrc ? 'An image needs an address.' : undefined}
          onBlur={() => setTouched(true)}
          onChange={(event) => setSrc(event.target.value)}
        />

        {onRequestImage ? (
          <Button variant="outline" size="sm" loading={picking} onClick={chooseFromLibrary}>
            Choose from the library
          </Button>
        ) : null}

        <TextField
          label="Alternative text"
          required
          value={alt}
          error={missingAlt ? 'Alt text is required.' : undefined}
          hint={
            focusKeyword
              ? `What the picture shows, for a reader who cannot see it — “${focusKeyword}” if it fits honestly.`
              : 'What the picture shows, for a reader who cannot see it.'
          }
          onBlur={() => setTouched(true)}
          onChange={(event) => setAlt(event.target.value)}
        />

        <TextField
          label="Caption"
          value={caption}
          hint="Optional. Printed under the picture."
          onChange={(event) => setCaption(event.target.value)}
        />

        <SelectField
          label="Alignment"
          options={FIGURE_ALIGNMENTS}
          value={align}
          onChange={(event) => setAlign(event.target.value)}
        />

        <SelectField
          label="Width"
          options={FIGURE_WIDTHS}
          value={size}
          onChange={(event) => setSize(event.target.value)}
        />

        {src.trim() ? (
          <figure className={styles.dialogPreview}>
            <img src={src.trim()} alt={alt.trim()} loading="lazy" />
          </figure>
        ) : null}
      </div>
    </Modal>
  );
}
