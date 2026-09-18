import { useId } from 'react';
import MuiDrawer from '@mui/material/Drawer';

import useScrollLock from '../../hooks/useScrollLock';

import IconButton from './IconButton';
import styles from './Drawer.module.css';

/**
 * A side panel. `anchor` defaults to the right; `size="wide"` is for editing
 * panels, the default width suits navigation and filters.
 *
 * As with `BottomSheet`, the paper carries `role="dialog"`, `aria-modal` and a
 * name so the panel announces itself; MUI supplies the trap, the `Escape` and
 * the backdrop, and `useScrollLock` adds iOS's share of the scroll lock.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {'left'|'right'|'top'|'bottom'} [props.anchor]
 * @param {'default'|'wide'} [props.size]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.label] the accessible name when there is no title
 * @param {boolean} [props.padded] `false` hands the body to the caller edge to
 *   edge, for a panel whose own rows carry the padding (the navigation drawer)
 */
export default function Drawer({
  open,
  onClose,
  anchor = 'right',
  size = 'default',
  title,
  footer,
  label,
  padded = true,
  closeLabel = 'Close',
  children,
  ...rest
}) {
  const titleId = useId();
  useScrollLock(open);

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        className: [styles.paper, size === 'wide' ? styles.wide : ''].filter(Boolean).join(' '),
        role: 'dialog',
        'aria-modal': 'true',
        ...(title ? { 'aria-labelledby': titleId } : { 'aria-label': label || 'Panel' }),
      }}
      sx={{ zIndex: 'var(--z-drawer)' }}
      {...rest}
    >
      {title ? (
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <IconButton label={closeLabel} size="sm" onClick={onClose}>
            &times;
          </IconButton>
        </div>
      ) : null}
      <div className={[styles.body, padded ? '' : styles.flush].filter(Boolean).join(' ')}>
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </MuiDrawer>
  );
}
