import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';

import CallButton from '../common/CallButton';
import GlobalSearch from '../common/GlobalSearch';
import MegaMenu from './MegaMenu';
import PATHS from '../../routes/paths';
import styles from './Header.module.css';
import useFittedMenus from '../../hooks/useFittedMenus';
import useNavPages from '../../hooks/useNavPages';
import useScrollDirection from '../../hooks/useScrollDirection';
import { Logo, Modal } from '../ui';
import WhatsAppButton from '../common/WhatsAppButton';
import { buildHeaderNav, collapseMenus } from '../../config/navigation';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';
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
 * More labels than the bar can hold fold into "More" rather than overlapping
 * the mark — every destination stays one hover away. How many that is, is
 * measured (`useFittedMenus`) rather than tied to a breakpoint: the bar is
 * capped at `--container-max`, so it is no wider at 2560 px than at 1280 px,
 * and the count is the client's to change by publishing another header page.
 *
 * D52: the bar is always visible and never hides; on the home page it is
 * transparent over the hero and turns solid after ten pixels of scroll. There
 * is no "Sign In" — the admin panel is never linked from the public site (D24).
 */
export default function Header() {
  const location = useLocation();
  const { scrolled } = useScrollDirection();
  const { settings } = useSiteSettings();
  const { propertyTypes, localities } = useMasterData();
  const { header: pages } = useNavPages();
  const { openLeadModal, leadTriggerProps } = useLeadCapture();

  const [searchOpen, setSearchOpen] = useState(false);

  const { menus, actions } = buildHeaderNav({ propertyTypes, localities, pages, settings });

  // Measured rather than assumed: `width === 'md'` folded the tail into "More"
  // below 1200px and trusted everything above it to fit, and nothing above it
  // did — `.inner` is capped at `--container-max`, so the bar is the same size
  // at 1280px as at 2560px and ten menus overflowed it at both.
  const [navRef, menuLimit] = useFittedMenus(menus.length);
  const visible = collapseMenus(menus, menuLimit);

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

        <nav className={styles.nav} aria-label="Main" ref={navRef}>
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
                  onClick={() => openLeadModal({ entry: 'post-requirement' })}
                  {...leadTriggerProps}
                >
                  {action.label}
                </button>
              );
            }

            // Both glyphs are the shared buttons: one tracked click, and a
            // `whatsapp-click` / `call-click` lead for a visitor we already
            // know (§6.17).
            const buttonClass = [styles.iconButton, overHero ? styles.onDark : '']
              .filter(Boolean)
              .join(' ');

            return action.kind === 'whatsapp' ? (
              <WhatsAppButton
                key={action.key}
                variant="icon"
                label={action.title}
                context="header"
                className={buttonClass}
              />
            ) : (
              <CallButton
                key={action.key}
                variant="icon"
                label={action.title}
                context="header"
                className={buttonClass}
              />
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
    </header>
  );
}
