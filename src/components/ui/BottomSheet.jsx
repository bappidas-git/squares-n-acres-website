import SwipeableDrawerFallback from '@mui/material/Drawer';

import IconButton from './IconButton';
import styles from './BottomSheet.module.css';

/**
 * A sheet that slides up from the bottom of a phone screen. MUI's `Drawer`
 * supplies the focus trap, the `Escape` handler and the backdrop; the styling
 * and the grabber are ours.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.footer]
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  footer,
  closeLabel = 'Close',
  children,
  ...rest
}) {
  return (
    <SwipeableDrawerFallback
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{ className: styles.sheet }}
      sx={{ zIndex: 'var(--z-modal)' }}
      {...rest}
    >
      <span className={styles.grabber} aria-hidden="true" />
      {title ? (
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton label={closeLabel} size="sm" onClick={onClose}>
            &times;
          </IconButton>
        </div>
      ) : null}
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </SwipeableDrawerFallback>
  );
}
