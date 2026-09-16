import { useState } from 'react';
import { Icon } from '@iconify/react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Link } from 'react-router-dom';

import IconButton from '../ui/IconButton';

import styles from './RowActions.module.css';

/** What an `href` action adds: a new tab, without handing it this one. */
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' };

/**
 * The per-row controls of `DataTable`.
 *
 * Wide enough (≥ 900 px) and they are icon buttons; below that they collapse
 * into a kebab menu, because five 44 px targets do not fit on a phone card.
 * Either way every control has a name — `IconButton` requires one and the menu
 * spells it out (§8.3).
 *
 * An action is a button, a router link (`to`) or an external one (`href`,
 * opened in a new tab — "View on site" is a different context, not a
 * navigation away from the record being edited).
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, icon?: string, onClick?: () => void,
 *   to?: string, href?: string, danger?: boolean, disabled?: boolean}>} props.actions
 * @param {boolean} [props.compact] render the kebab menu
 * @param {string} [props.menuLabel]
 */
export default function RowActions({ actions = [], compact = false, menuLabel = 'Row actions' }) {
  const [anchor, setAnchor] = useState(null);

  if (actions.length === 0) return null;

  if (!compact) {
    return (
      <span className={styles.inline}>
        {actions.map((action) => (
          <IconButton
            key={action.key}
            label={action.label}
            size="sm"
            to={action.disabled ? undefined : action.to}
            href={action.disabled ? undefined : action.href}
            {...(action.href ? EXTERNAL : null)}
            disabled={action.disabled || undefined}
            className={action.danger ? styles.danger : undefined}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick?.(event);
            }}
          >
            <Icon icon={action.icon || 'mdi:dots-horizontal'} width="18" height="18" />
          </IconButton>
        ))}
      </span>
    );
  }

  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        label={menuLabel}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      >
        <Icon icon="mdi:dots-vertical" width="20" height="20" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            disableRipple
            disabled={action.disabled}
            component={action.to ? Link : action.href ? 'a' : 'li'}
            to={action.to}
            href={action.href}
            {...(action.href ? EXTERNAL : null)}
            className={action.danger ? styles.dangerItem : undefined}
            onClick={(event) => {
              event.stopPropagation();
              close();
              action.onClick?.(event);
            }}
          >
            <Icon
              icon={action.icon || 'mdi:chevron-right'}
              width="18"
              height="18"
              className={styles.menuIcon}
            />
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
