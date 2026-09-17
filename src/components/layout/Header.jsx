import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';

import GlobalSearch from '../common/GlobalSearch';
import LeadModalTemp from '../sections/property/LeadModalTemp';
import MegaMenu from './MegaMenu';
import PATHS from '../../routes/paths';
import styles from './Header.module.css';
import useBreakpoint from '../../hooks/useBreakpoint';
import useNavPages from '../../hooks/useNavPages';
import useScrollDirection from '../../hooks/useScrollDirection';
import { Logo, Modal } from '../ui';
import { buildHeaderNav, collapseMenus } from '../../config/navigation';
import { EVENTS, track } from '../../utils/analytics';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The desktop header (≥ 900 px).
 *
 * The menus are `buildHeaderNav()` — master data and the published CMS pages —
 * so nothing here is a hardcoded list of links, and the mobile drawer is built
 * from the same call (BUG-20). The right-hand buttons are
 * `siteSettings.navigation`: an editor who switches the WhatsApp button off in
 * Admin → Settings switches it off here.
 *
 * Ten labels plus the logo and the buttons need about 1200 px of bar, so
 * between 900 px and 1199 px the tail of the menu folds into "More" rather
 * than overlapping the mark — every destination stays one hover away.
 *
 * D52: the bar is always visible and never hides; on the home page it is
 * transparent over the hero and turns solid after ten pixels of scroll. There
 * is no "Sign In" — the admin panel is never linked from the public site (D24).
 */
export default function Header() {
  const location = useLocation();
  const { scrolled } = useScrollDirection();
  const { width } = useBreakpoint();
  const { settings } = useSiteSettings();
  const { propertyTypes, localities } = useMasterData();
  const { header: pages } = useNavPages();

  const [searchOpen, setSearchOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  const { menus, actions } = buildHeaderNav({ propertyTypes, localities, pages, settings });
  const visible = width === 'md' ? collapseMenus(menus) : menus;

  // Only the home page has a hero to be transparent over.
  const overHero = location.pathname === PATHS.home && !scrolled;

  return (
    <header
      className={[
        styles.header,
        overHero ? styles.transparent : '',
        scrolled ? styles.scrolled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.inner}>
        <Link to={PATHS.home} className={styles.logo} aria-label="Squares N Acres — home">
          <span className={overHero ? styles.logoPlate : undefined}>
            <Logo height={44} />
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          {visible.map((menu) => (
            <MegaMenu key={menu.key} menu={menu} transparent={overHero} />
          ))}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={[styles.iconButton, overHero ? styles.onDark : ''].filter(Boolean).join(' ')}
            onClick={() => setSearchOpen(true)}
            aria-label="Search properties"
          >
            <Icon icon="mdi:magnify" width={22} height={22} aria-hidden="true" />
          </button>

          {actions.map((action) => {
            if (action.kind === 'lead') {
              return (
                <button
                  key={action.key}
                  type="button"
                  className={styles.cta}
                  onClick={() => setLeadOpen(true)}
                >
                  {action.label}
                </button>
              );
            }

            return (
              <a
                key={action.key}
                href={action.href}
                className={[styles.iconButton, overHero ? styles.onDark : '']
                  .filter(Boolean)
                  .join(' ')}
                title={action.title}
                aria-label={action.title}
                {...(action.kind === 'whatsapp'
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : null)}
                onClick={() =>
                  track(action.kind === 'whatsapp' ? EVENTS.whatsappClick : EVENTS.callClick, {
                    source: 'header',
                  })
                }
              >
                <Icon icon={action.icon} width={22} height={22} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </div>

      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search properties"
        size="md"
        mobile="fullscreen"
      >
        <GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} />
      </Modal>

      <LeadModalTemp
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        source="post-requirement"
        requirement
        successTitle="Requirement received"
      />
    </header>
  );
}
