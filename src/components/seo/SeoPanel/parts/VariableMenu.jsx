import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import { listVariables } from '../../../../seo';

import styles from '../SeoPanel.module.css';

/**
 * Inserts a `%variable%` where the cursor is.
 *
 * The template variables of §9.5 are the reason a title can be written once and
 * applied to a thousand listings, and the reason an editor writes one by hand
 * is almost always that the site-wide template is nearly right. So the menu
 * inserts at the caret rather than appending, and puts the caret after what it
 * inserted — which is what makes "%bhk% in %locality%" typeable rather than
 * assembled.
 *
 * @param {object} props
 * @param {string} props.inputId the `id` of the field it writes into
 * @param {string} props.value the field's current text
 * @param {(next: string, caret: number) => void} props.onInsert
 * @param {boolean} [props.disabled]
 * @param {string} [props.label]
 */
export default function VariableMenu({ inputId, value, onInsert, disabled = false, label }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && wrapper.current?.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const insert = (token) => {
    // The field by id rather than by ref: the design system's inputs are plain
    // function components, and a `ref` on one of those is a React warning.
    const input = inputId ? document.getElementById(inputId) : null;
    const text = String(value ?? '');
    // A menu opened with the mouse has already taken the focus off the field,
    // so "where the cursor was" is the selection the field still remembers —
    // and the end of the text when it never had one.
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? start;

    const next = `${text.slice(0, start)}${token}${text.slice(end)}`;
    const caret = start + token.length;

    setOpen(false);
    onInsert(next, caret);

    // The caret is restored after the render that changed the value, or it is
    // put back where React's controlled input left it — at the end.
    window.requestAnimationFrame(() => {
      const element = inputId ? document.getElementById(inputId) : null;
      if (!element) return;
      element.focus();
      element.setSelectionRange?.(caret, caret);
    });
  };

  return (
    <span className={styles.menuWrap} ref={wrapper}>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        icon={<Icon icon="mdi:code-braces" width="16" height="16" />}
        onClick={() => setOpen((current) => !current)}
      >
        {label ?? 'Insert variable'}
      </Button>

      {open ? (
        // A disclosure of ordinary buttons, reached with Tab — not a
        // `role="menu"`, which promises arrow keys this list never had
        // (prompt 51).
        <div className={styles.menu} role="group" aria-label="Template variables" id={menuId}>
          {listVariables().map((variable) => (
            <button
              key={variable.token}
              type="button"
              className={styles.menuItem}
              onClick={() => insert(variable.token)}
            >
              <span className={styles.menuToken}>{variable.token}</span>
              <span className={styles.menuHint}>
                {variable.label} — {variable.hint}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
