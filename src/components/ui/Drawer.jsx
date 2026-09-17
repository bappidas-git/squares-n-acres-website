import MuiDrawer from '@mui/material/Drawer';

import IconButton from './IconButton';
import styles from './Drawer.module.css';

/**
 * A side panel. `anchor` defaults to the right; `size="wide"` is for editing
 * panels, the default width suits navigation and filters.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {'left'|'right'|'top'|'bottom'} [props.anchor]
 * @param {'default'|'wide'} [props.size]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.footer]
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
  padded = true,
  closeLabel = 'Close',
  children,
  ...rest
}) {
  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        className: [styles.paper, size === 'wide' ? styles.wide : ''].filter(Boolean).join(' '),
      }}
      sx={{ zIndex: 'var(--z-drawer)' }}
      {...rest}
    >
      {title ? (
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
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
