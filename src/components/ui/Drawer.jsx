import { useId } from 'react';
import MuiDrawer from '@mui/material/Drawer';
import { Icon } from '@iconify/react';

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
 * @param {object} [props.PaperProps] merged into the panel's own — a class of
 *   the caller's joins the kit's, and the role and the name stay
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
  PaperProps: paperProps = {},
  ...rest
}) {
  const titleId = useId();
  useScrollLock(open);

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      // A caller's own paper props are merged, not swapped in: spread over
      // these, the application panel's `className` took the role's name away,
      // and the panel announced itself as a dialog called nothing (QA-61).
      PaperProps={{
        ...paperProps,
        className: [styles.paper, size === 'wide' ? styles.wide : '', paperProps.className]
          .filter(Boolean)
          .join(' '),
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
            <Icon icon="mdi:close" width="20" height="20" />
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
