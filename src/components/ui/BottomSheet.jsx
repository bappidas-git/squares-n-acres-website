import { useId } from 'react';
import SwipeableDrawerFallback from '@mui/material/Drawer';
import { Icon } from '@iconify/react';

import useScrollLock from '../../hooks/useScrollLock';

import IconButton from './IconButton';
import styles from './BottomSheet.module.css';

/**
 * A sheet that slides up from the bottom of a phone screen. MUI's `Drawer`
 * supplies the focus trap, the `Escape` handler and the backdrop; the styling
 * and the grabber are ours.
 *
 * MUI's drawer paper is a plain panel — the modality lives on the wrapper — so
 * the paper is given `role="dialog"`, `aria-modal` and a name here, which is
 * what a screen reader announces when the sheet takes focus (§8.3). The scroll
 * lock is MUI's everywhere except iOS, where `useScrollLock` adds the part it
 * leaves out.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.label] the accessible name when there is no title
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  footer,
  label,
  closeLabel = 'Close',
  children,
  ...rest
}) {
  const titleId = useId();
  useScrollLock(open);

  return (
    <SwipeableDrawerFallback
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        className: styles.sheet,
        role: 'dialog',
        'aria-modal': 'true',
        ...(title ? { 'aria-labelledby': titleId } : { 'aria-label': label || 'Sheet' }),
      }}
      sx={{ zIndex: 'var(--z-modal)' }}
      {...rest}
    >
      <span className={styles.grabber} aria-hidden="true" />
      {title ? (
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <IconButton label={closeLabel} size="sm" onClick={onClose}>
            <Icon icon="mdi:close" width="20" height="20" />
          </IconButton>
        </div>
      ) : null}
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </SwipeableDrawerFallback>
  );
}
