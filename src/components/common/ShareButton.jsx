import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import { track } from '../../utils/analytics';
import { useToast } from './ToastProvider';

import styles from './ShareButton.module.css';
import { PROPERTY } from '../../config/copy';

/**
 * Share this page.
 *
 * Where the browser has one, the operating system's own share sheet is the
 * best answer — it offers the apps the person actually uses. Everywhere else
 * (every desktop browser but Safari and Edge) the button opens a small menu:
 * copy the link, or hand it to one of five networks. The menu is a real
 * `menu`/`menuitem` pair with arrow-key movement, `Escape` to close and focus
 * returned to the button, so it is operable without a mouse.
 *
 * @param {object} props
 * @param {string} [props.url] defaults to the address in the bar
 * @param {string} props.title what is being shared — the message quotes it
 * @param {string} [props.text] the sentence sent with the link
 * @param {'icon'|'button'} [props.variant]
 * @param {string} [props.context] passed to the `share_click` event
 */
export default function ShareButton({
  url,
  title = '',
  text = '',
  variant = 'icon',
  context = '',
  className = '',
  ...rest
}) {
  const toast = useToast();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const href = url || (typeof window === 'undefined' ? '' : window.location.href);
  const message = text || (title ? `${title} — ${href}` : href);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // A click anywhere else, or Escape, closes the menu.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // The first item takes focus when the menu opens.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(href);
      toast.success(PROPERTY.linkCopied);
    } catch {
      toast.error('Could not copy the link. Please copy it from the address bar.');
    }
    track('share_click', { method: 'copy', context });
    close();
  }, [href, toast, context, close]);

  const onShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: title, url: href });
        track('share_click', { method: 'native', context });
      } catch {
        // The sheet was dismissed — not a failure worth telling anybody about.
      }
      return;
    }
    setOpen((previous) => !previous);
  }, [title, href, context]);

  const onMenuKeyDown = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (index + step + items.length) % items.length;
      items[next].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (event.key === 'Tab') {
      close({ restoreFocus: false });
    }
  };

  const targets = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'mdi:whatsapp',
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
    },
    {
      key: 'x',
      label: 'X',
      icon: 'mdi:alpha-x-box-outline',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(href)}&text=${encodeURIComponent(title)}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: 'mdi:facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(href)}`,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: 'mdi:linkedin',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(href)}`,
    },
    {
      key: 'email',
      label: 'E-mail',
      icon: 'mdi:email-outline',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`,
    },
  ];

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        ref={buttonRef}
        onClick={onShare}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Share${title ? ` — ${title}` : ''}`}
        className={[styles.button, variant === 'button' ? styles.labelled : '']
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <Icon icon="mdi:share-variant-outline" className={styles.icon} aria-hidden="true" />
        {variant === 'button' ? <span>Share</span> : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          ref={menuRef}
          aria-label="Share this page"
          className={styles.menu}
          onKeyDown={onMenuKeyDown}
        >
          <button type="button" role="menuitem" className={styles.item} onClick={copyLink}>
            <Icon icon="mdi:link-variant" aria-hidden="true" />
            {PROPERTY.copyLink}
          </button>
          {targets.map((target) => (
            <a
              key={target.key}
              role="menuitem"
              className={styles.item}
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track('share_click', { method: target.key, context });
                close({ restoreFocus: false });
              }}
            >
              <Icon icon={target.icon} aria-hidden="true" />
              {target.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
