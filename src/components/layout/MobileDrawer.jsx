import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';

import CallButton from '../common/CallButton';
import MenuLink from './MenuLink';
import PATHS from '../../routes/paths';
import WhatsAppButton from '../common/WhatsAppButton';
import styles from './MobileDrawer.module.css';
import useNavPages from '../../hooks/useNavPages';
import { Drawer, Logo } from '../ui';
import { NAV } from '../../config/copy';
import { buildHeaderNav } from '../../config/navigation';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useShortlist } from '../../contexts/ShortlistContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The phone's navigation: the same menus as the desktop header, as accordions.
 *
 * It is built from the same `buildHeaderNav()` the header calls, which is the
 * point — `Header` and `MobileHeader` each used to declare their own copy of
 * the menu, so the two drifted apart and a link fixed in one stayed wrong in
 * the other (BUG-20).
 *
 * The call, WhatsApp and "Post Requirement" row at the top is
 * `siteSettings.navigation`; the CTA opens the post-requirement modal with the
 * requirement fields of D82. There is no "Sign In": the admin panel is reached
 * at `/admin/login` and is never linked from the public site (D24).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 */
export default function MobileDrawer({ open, onClose }) {
  const location = useLocation();
  const { settings } = useSiteSettings();
  const { propertyTypes, localities } = useMasterData();
  const { header: pages, menus: menuRecords } = useNavPages();
  const { count } = useShortlist();
  const { openLeadModal, leadTriggerProps } = useLeadCapture();

  const [expanded, setExpanded] = useState(null);

  const { menus, actions } = buildHeaderNav({
    menus: menuRecords,
    propertyTypes,
    localities,
    pages,
    settings,
  });

  // A tap that navigates has done its job; the drawer gets out of the way.
  // `onClose` is read through a ref so an inline arrow in the host does not
  // make this fire on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    closeRef.current?.();
    setExpanded(null);
  }, [location.pathname, location.search]);

  const cta = actions.find((action) => action.key === 'cta');
  const links = actions.filter((action) => action.key !== 'cta');

  return (
    <>
      <Drawer open={open} onClose={onClose} anchor="right" padded={false} label="Menu">
        <div className={styles.head}>
          <Link to={PATHS.home} onClick={onClose} className={styles.logo}>
            <Logo height={32} />
          </Link>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
            <Icon icon="mdi:close" width={24} height={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actions}>
          {links.map((action) =>
            action.kind === 'whatsapp' ? (
              <WhatsAppButton
                key={action.key}
                variant="link"
                label={action.label}
                context="drawer"
                className={styles.action}
              />
            ) : (
              <CallButton
                key={action.key}
                variant="link"
                label={NAV.call}
                context="drawer"
                className={styles.action}
              />
            )
          )}
          {cta?.kind === 'lead' ? (
            <button
              type="button"
              className={[styles.action, styles.actionPrimary].join(' ')}
              onClick={() => {
                onClose?.();
                openLeadModal({ entry: 'post-requirement' });
              }}
              {...leadTriggerProps}
            >
              <Icon icon={cta.icon} aria-hidden="true" />
              {cta.label}
            </button>
          ) : null}
          {cta?.kind === 'link' && cta.internal ? (
            <Link
              to={cta.href}
              onClick={onClose}
              className={[styles.action, styles.actionPrimary].join(' ')}
            >
              <Icon icon={cta.icon} aria-hidden="true" />
              {cta.label}
            </Link>
          ) : null}
          {cta?.kind === 'link' && !cta.internal ? (
            <a
              href={cta.href}
              onClick={onClose}
              className={[styles.action, styles.actionPrimary].join(' ')}
              {...(cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
            >
              <Icon icon={cta.icon} aria-hidden="true" />
              {cta.label}
            </a>
          ) : null}
        </div>

        <nav className={styles.nav} aria-label="Main">
          {menus.map((menu) => {
            const columns = Array.isArray(menu.columns) ? menu.columns : [];

            if (columns.length === 0) {
              return (
                <MenuLink key={menu.key} link={menu} className={styles.item} onClick={onClose}>
                  {menu.label}
                </MenuLink>
              );
            }

            const isOpen = expanded === menu.key;
            const panelId = `drawer-panel-${menu.key}`;
            // The group opens with its own "All …" line, so the menu's own
            // page listed again at the top of the header's panel (QA-57)
            // would be the same link twice.
            const groups = columns
              .map((column) => ({
                ...column,
                links: column.links.filter((link) => !link.overview),
              }))
              .filter((column) => column.links.length > 0);

            return (
              <div key={menu.key} className={styles.group}>
                <button
                  type="button"
                  className={styles.item}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setExpanded(isOpen ? null : menu.key)}
                >
                  {menu.label}
                  <Icon
                    icon="mdi:chevron-down"
                    className={[styles.chevron, isOpen ? styles.chevronOn : '']
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                  />
                </button>

                {isOpen ? (
                  <div id={panelId} className={styles.panel}>
                    <MenuLink link={menu} className={styles.panelAll} onClick={onClose}>
                      All {menu.label.toLowerCase()}
                    </MenuLink>
                    {groups.map((column) => (
                      <div key={column.key} className={styles.panelGroup}>
                        {groups.length > 1 ? (
                          <span className={styles.panelTitle}>{column.title}</span>
                        ) : null}
                        {column.links.map((link) => (
                          <MenuLink
                            key={link.key}
                            link={link}
                            className={styles.panelLink}
                            onClick={onClose}
                          >
                            {link.label}
                          </MenuLink>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className={styles.footerLinks}>
          <Link to={PATHS.localities} className={styles.footerLink} onClick={onClose}>
            <Icon icon="mdi:map-marker-outline" aria-hidden="true" />
            {NAV.localities}
          </Link>
          <Link to={PATHS.builders} className={styles.footerLink} onClick={onClose}>
            <Icon icon="mdi:domain" aria-hidden="true" />
            {NAV.builders}
          </Link>
          <Link to={PATHS.shortlist} className={styles.footerLink} onClick={onClose}>
            <Icon icon="mdi:heart-outline" aria-hidden="true" />
            {NAV.shortlist}
            {count > 0 ? <span className={styles.badge}>{count > 99 ? '99+' : count}</span> : null}
          </Link>
        </div>
      </Drawer>
    </>
  );
}
