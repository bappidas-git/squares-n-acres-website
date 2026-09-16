import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import PATHS from '../routes/paths';
import leadService from '../services/leadService';
import storage from '../utils/storage';
import { Button } from '../components/ui';
import { LEAD_SOURCES } from '../config/enums';
import { formatLeadSource } from '../config/adminConstants';
import { useToast } from '../components/common/ToastProvider';

/**
 * The admin panel's one lead poller (D45/D55).
 *
 * It is mounted inside `AdminLayout`, so it exists only while an admin screen
 * is open, and it asks for exactly one thing every thirty seconds: the five
 * newest leads whose status is still `new`. `meta.total` is the sidebar badge,
 * `data` is the bell menu, and `lastUpdatedAt` is what `AdminLeads` watches to
 * refresh its table — no screen polls on its own.
 *
 * Polling stops while the tab is hidden and fetches immediately when it comes
 * back, so a backgrounded panel costs nothing.
 */

const LeadNotificationsContext = createContext(null);

export const POLL_INTERVAL_MS = 30000;
export const SEEN_STORAGE_KEY = 'sna_leads_seen_at';

/** How many rows the bell menu shows (§4 task 5). */
const RECENT_LIMIT = 5;

/** Long enough to read the name and reach the "View" link. */
const TOAST_DURATION_MS = 8000;

export const useLeadNotifications = () => {
  const context = useContext(LeadNotificationsContext);
  if (!context) {
    throw new Error('useLeadNotifications must be used within a LeadNotificationsProvider');
  }
  return context;
};

/** The canonical label first; an older stored value still reads sensibly. */
const sourceLabel = (source) => LEAD_SOURCES.labelOf(source) || formatLeadSource(source);

export const LeadNotificationsProvider = ({ children }) => {
  const toast = useToast();

  const [newLeadCount, setNewLeadCount] = useState(0);
  const [recentLeads, setRecentLeads] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [seenAt, setSeenAt] = useState(() => storage.getItem(SEEN_STORAGE_KEY, null));

  /** `null` until the first answer — the first load never announces anything. */
  const lastTotalRef = useRef(null);

  const announce = useCallback(
    (lead) => {
      toast.info(
        <>
          {`New lead: ${lead.name} (${sourceLabel(lead.source)}) `}
          <Button variant="link" size="sm" to={PATHS.adminLead(lead.id)}>
            View
          </Button>
        </>,
        TOAST_DURATION_MS
      );
    },
    [toast]
  );

  const refresh = useCallback(async () => {
    try {
      const { data, meta } = await leadService.adminList({
        status: 'new',
        perPage: RECENT_LIMIT,
        sort: 'createdAt',
        order: 'desc',
      });

      const rows = Array.isArray(data) ? data : [];
      const total = meta?.total ?? 0;
      const previousTotal = lastTotalRef.current;
      lastTotalRef.current = total;

      setRecentLeads(rows);
      setNewLeadCount(total);
      setLastUpdatedAt(new Date().toISOString());

      if (previousTotal !== null && total > previousTotal && rows[0]) announce(rows[0]);
    } catch {
      // A background poll that fails is not worth a toast every thirty seconds
      // — the screens that need the data surface their own error state, and
      // the next tick tries again.
    }
  }, [announce]);

  useEffect(() => {
    let timer = null;

    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const start = () => {
      if (timer === null) timer = setInterval(refresh, POLL_INTERVAL_MS);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      refresh();
      start();
    };

    if (!document.hidden) {
      refresh();
      start();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  /** Drops the bell's dot; the badge keeps counting until the leads are worked. */
  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    storage.setItem(SEEN_STORAGE_KEY, now);
    setSeenAt(now);
  }, []);

  const hasUnseen = useMemo(() => {
    const newest = recentLeads[0];
    if (!newest?.createdAt) return false;
    if (!seenAt) return true;
    return Date.parse(newest.createdAt) > Date.parse(seenAt);
  }, [recentLeads, seenAt]);

  const value = useMemo(
    () => ({ newLeadCount, recentLeads, lastUpdatedAt, hasUnseen, refresh, markSeen }),
    [newLeadCount, recentLeads, lastUpdatedAt, hasUnseen, refresh, markSeen]
  );

  return (
    <LeadNotificationsContext.Provider value={value}>{children}</LeadNotificationsContext.Provider>
  );
};

export default LeadNotificationsContext;
