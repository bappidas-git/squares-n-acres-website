import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';

import GlobalSearch from '../common/GlobalSearch';
import MobileDrawer from './MobileDrawer';
import PATHS from '../../routes/paths';
import styles from './MobileHeader.module.css';
import useScrollDirection from '../../hooks/useScrollDirection';
import { Logo, Modal } from '../ui';
import { EVENTS, track } from '../../utils/analytics';
import { formatPhoneForTel } from '../../utils/format';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The phone and tablet header (< 900 px): the mark, a search icon, the call
 * button settings allow, and the menu button that opens `MobileDrawer`.
 *
 * The drawer holds the navigation — built from the same `buildHeaderNav()` the
 * desktop header calls, which is what stops the two from drifting apart
 * (BUG-20). D52: this bar never hides either; only the bottom navigation does.
 */
export default function MobileHeader() {
  const location = useLocation();
  const { scrolled } = useScrollDirection();
  const { settings } = useSiteSettings();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const overHero = location.pathname === PATHS.home && !scrolled;
  const phone = settings?.general?.contactPhone;
  const showCall = settings?.navigation?.showCallButton !== false && Boolean(phone);

  return (
    <header
      className={[
        styles.mobileHeader,
        overHero ? styles.transparent : '',
        scrolled ? styles.scrolled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.inner}>
        <Link to={PATHS.home} className={styles.logo} aria-label="Squares N Acres — home">
          <span className={overHero ? styles.logoPlate : undefined}>
            <Logo height={32} />
          </span>
        </Link>

        <div className={styles.actions}>
          <button
            type="button"
            className={[styles.iconButton, overHero ? styles.onDark : ''].filter(Boolean).join(' ')}
            onClick={() => setSearchOpen(true)}
            aria-label="Search properties"
          >
            <Icon icon="mdi:magnify" width={22} height={22} aria-hidden="true" />
          </button>

          {showCall ? (
            <a
              href={`tel:${formatPhoneForTel(phone)}`}
              className={[styles.iconButton, overHero ? styles.onDark : '']
                .filter(Boolean)
                .join(' ')}
              aria-label={`Call ${phone}`}
              onClick={() => track(EVENTS.callClick, { source: 'header' })}
            >
              <Icon icon="mdi:phone-outline" width={22} height={22} aria-hidden="true" />
            </a>
          ) : null}

          <button
            type="button"
            className={[styles.iconButton, overHero ? styles.onDark : ''].filter(Boolean).join(' ')}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Icon icon="mdi:menu" width={24} height={24} aria-hidden="true" />
          </button>
        </div>
      </div>

      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search properties"
        mobile="fullscreen"
      >
        <GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} />
      </Modal>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
