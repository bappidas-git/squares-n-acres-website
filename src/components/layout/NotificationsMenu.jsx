import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Divider, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import PATHS from '../../routes/paths';
import { IconButton } from '../ui';
import { LEAD_SOURCES } from '../../config/enums';
import { formatRelative } from '../../utils/format';
import { useLeadNotifications } from '../../contexts/LeadNotificationsContext';

import styles from './NotificationsMenu.module.css';

/**
 * The topbar bell: the five newest leads still marked `new`, from the single
 * poller in `LeadNotificationsContext` (D45).
 *
 * The dot means "something arrived since you last looked" — opening the menu
 * calls `markSeen()` and drops it, while the sidebar badge keeps counting
 * until the leads are actually worked.
 */

const sourceLabel = (source) => LEAD_SOURCES.labelOfAny(source);

export default function NotificationsMenu() {
  const navigate = useNavigate();
  const { recentLeads, newLeadCount, hasUnseen, markSeen } = useLeadNotifications();
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);

  const open = () => {
    setAnchor(triggerRef.current);
    markSeen();
  };

  const close = () => setAnchor(null);

  const go = (to) => {
    close();
    navigate(to);
  };

  const label = newLeadCount > 0 ? `Notifications (${newLeadCount} new leads)` : 'Notifications';

  return (
    <>
      <IconButton
        ref={triggerRef}
        label={label}
        onClick={open}
        className={styles.bell}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
      >
        <Icon icon="mdi:bell-outline" width={22} height={22} />
        {hasUnseen ? <span className={styles.dot} aria-hidden="true" /> : null}
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: styles.menu } }}
      >
        <li className={styles.header}>
          <span className={styles.headerTitle}>New leads</span>
          {newLeadCount > 0 ? <span className={styles.count}>{newLeadCount}</span> : null}
        </li>
        <Divider />

        {recentLeads.length === 0 ? (
          <li className={styles.empty}>
            <Icon icon="mdi:bell-off-outline" width={28} height={28} aria-hidden="true" />
            <span>No new leads right now.</span>
          </li>
        ) : (
          recentLeads.map((lead) => (
            <MenuItem
              key={lead.id}
              className={styles.item}
              onClick={() => go(PATHS.adminLead(lead.id))}
            >
              <span className={styles.itemName}>{lead.name}</span>
              <span className={styles.itemMeta}>
                {sourceLabel(lead.source)} · {formatRelative(lead.createdAt)}
              </span>
            </MenuItem>
          ))
        )}

        <Divider />
        <MenuItem className={styles.viewAll} onClick={() => go(PATHS.adminLeads)}>
          View all leads
        </MenuItem>
      </Menu>
    </>
  );
}
