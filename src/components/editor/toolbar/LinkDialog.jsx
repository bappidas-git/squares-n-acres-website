import { useEffect, useState } from 'react';

import Button from '../../ui/Button';
import InternalLinkPicker from '../InternalLinkPicker';
import Modal from '../../ui/Modal';
import { SwitchField, TextField } from '../../ui/FormField';

import styles from '../RichTextEditor.module.css';

/** What an `href` may be: an absolute URL, a mail or phone link, or a site path. */
const HREF_PATTERN = /^(?:https?:\/\/\S+|mailto:\S+@\S+|tel:\+?[0-9\s-]{6,}|\/[^\s]*|#\S+)$/i;

/** `true` for an `href` the sanitiser will keep. */
export const isValidHref = (value) => HREF_PATTERN.test(String(value ?? '').trim());

/**
 * The link editor: where it points, what it says, and the two attributes that
 * decide how the rest of the web reads it.
 *
 * `nofollow` matters here rather than in a settings screen because the choice
 * is per link — a sponsored mention and a link to our own locality guide are
 * not the same thing to a search engine (§9).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {{href: string, text: string, newTab: boolean, noFollow: boolean, hasSelection: boolean}} props.value
 * @param {(link: {href: string, text: string, newTab: boolean, noFollow: boolean}) => void} props.onSubmit
 * @param {() => void} [props.onRemove] offered only when a link is being edited
 * @param {() => void} props.onClose
 */
export default function LinkDialog({ open, value, onSubmit, onRemove, onClose }) {
  const [href, setHref] = useState('');
  const [text, setText] = useState('');
  const [newTab, setNewTab] = useState(false);
  const [noFollow, setNoFollow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [textTouched, setTextTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHref(value?.href ?? '');
    setText(value?.text ?? '');
    setNewTab(Boolean(value?.newTab));
    setNoFollow(Boolean(value?.noFollow));
    setTouched(false);
    setTextTouched(false);
  }, [open, value]);

  const trimmed = href.trim();
  const needsText = !value?.hasSelection;
  const canSubmit = isValidHref(trimmed) && (!needsText || text.trim().length > 0);

  // Each box says what it is missing once it has been left — "Save link" is
  // disabled until both are right, so a press never does nothing in silence
  // (prompt 51).
  const hrefError = !touched
    ? undefined
    : trimmed.length === 0
      ? 'Enter the address the link goes to.'
      : !isValidHref(trimmed)
        ? 'Use https://…, mailto:…, tel:… or a path starting with /.'
        : undefined;
  const textError =
    needsText && textTouched && text.trim().length === 0
      ? 'Enter the words the link shows.'
      : undefined;

  const submit = () => {
    setTouched(true);
    setTextTouched(true);
    if (!canSubmit) return;
    onSubmit({ href: trimmed, text: text.trim(), newTab, noFollow });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link"
      size="md"
      mobile="fullscreen"
      footer={
        <>
          {onRemove ? (
            <Button variant="ghost" onClick={onRemove}>
              Remove link
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            Save link
          </Button>
        </>
      }
    >
      <div className={styles.dialogGrid}>
        <TextField
          label="Address"
          required
          value={href}
          placeholder="https://example.com, /localities/whitefield, mailto:…"
          error={hrefError}
          hint="A path starting with / stays on this site."
          onBlur={() => setTouched(true)}
          onChange={(event) => setHref(event.target.value)}
        />

        {needsText ? (
          <TextField
            label="Text"
            required
            value={text}
            error={textError}
            hint="What the link says. Describe the destination, not “click here”."
            onBlur={() => setTextTouched(true)}
            onChange={(event) => setText(event.target.value)}
          />
        ) : null}

        <SwitchField
          label="Open in a new tab"
          checked={newTab}
          hint='Adds rel="noopener".'
          onChange={setNewTab}
        />

        <SwitchField
          label="No follow"
          checked={noFollow}
          hint="Tells search engines not to pass ranking to the destination."
          onChange={setNoFollow}
        />

        <details className={styles.dialogDetails}>
          <summary className={styles.dialogSummary}>Link to something in the panel</summary>
          <InternalLinkPicker
            onPick={(link) => {
              setHref(link.href);
              setNewTab(false);
              if (!value?.hasSelection && text.trim().length === 0) setText(link.text);
            }}
          />
        </details>
      </div>
    </Modal>
  );
}
