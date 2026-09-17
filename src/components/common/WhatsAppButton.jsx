import { Icon } from '@iconify/react';

import { Button } from '../ui';
import { EVENTS, track } from '../../utils/analytics';
import { recordClickLead } from '../../utils/clickLead';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { whatsappLink } from '../../utils/format';

import styles from './ContactButtons.module.css';

/**
 * The message a WhatsApp click carries.
 *
 * The configured default on every page; on a listing the property's own title
 * and address are appended, because "Hi, I am interested" with no listing named
 * is a conversation the sales desk has to start by asking which one.
 *
 * @param {string} base `settings.general.whatsappDefaultMessage`
 * @param {string} [propertyTitle]
 * @returns {string}
 */
export function whatsappMessage(base, propertyTitle) {
  const opening = base || 'Hi, I would like to know more.';
  if (!propertyTitle) return opening;
  const here = typeof window === 'undefined' ? '' : ` ${window.location.href}`;
  return `${opening} — ${propertyTitle}${here}`;
}

/**
 * Talk to us on WhatsApp.
 *
 * Three shapes, one behaviour: `float` is the 56 px circle fixed above the
 * bottom navigation, `button` is a design-system button inside a card or a
 * success panel, and `icon` is the bare glyph the header and the agent card
 * use. All three open the same `wa.me` link, send the same `whatsapp_click`
 * event, and — for a visitor who has already told us who they are — file the
 * same `whatsapp-click` lead (§6.17).
 *
 * The lead is fire-and-forget: it is started in the click handler and never
 * awaited, so a slow or failed `POST /leads` cannot delay or swallow the link
 * the visitor actually clicked.
 *
 * Nothing renders when no WhatsApp number is configured — a dead `wa.me` link
 * is worse than no button (§14: never a hardcoded number).
 *
 * @param {object} props
 * @param {'float'|'button'|'icon'|'link'} [props.variant] `link` is a bare
 *   anchor with the icon and the label, styled entirely by `className`
 * @param {string} [props.buttonVariant] the `ui/Button` variant when `button`
 * @param {string} [props.number] the listing advisor's own number, when published
 * @param {string} [props.message] overrides the composed message entirely
 * @param {number|string|null} [props.propertyId] defaults to the listing the
 *   page registered with `setPageContext()`
 * @param {string} [props.propertyTitle] same default
 * @param {string} [props.label]
 * @param {string} [props.context] where the click happened, for analytics
 * @param {string} [props.className]
 * @param {string} [props.iconClassName] applied to the glyph of the `link`
 *   variant, so a host bar can size it with the rest of its row
 */
export default function WhatsAppButton({
  variant = 'button',
  buttonVariant = 'secondary',
  number,
  message,
  propertyId,
  propertyTitle,
  label = 'WhatsApp',
  context,
  className = '',
  iconClassName,
}) {
  const { settings, getWhatsappLink } = useSiteSettings();
  const { isIdentified, visitor, page } = useLeadCapture();

  // A button that was given no listing takes the one the page is about, which
  // is how the floating circle names the property a visitor is reading.
  const listingId = propertyId ?? page.propertyId ?? null;
  const listingTitle = propertyTitle ?? page.title ?? '';

  const text = message ?? whatsappMessage(settings?.general?.whatsappDefaultMessage, listingTitle);
  const href = whatsappLink(number, text) || getWhatsappLink(text);

  if (!href) return null;

  const onClick = () => {
    track(EVENTS.whatsappClick, { propertyId: listingId, context });
    if (isIdentified) {
      recordClickLead({
        visitor,
        source: 'whatsapp-click',
        propertyId: listingId,
        message: listingTitle ? `Clicked WhatsApp on ${listingTitle}` : 'Clicked WhatsApp',
      });
    }
  };

  const shared = {
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
    onClick,
  };

  if (variant === 'float') {
    return (
      <a
        {...shared}
        className={[styles.float, styles.whatsappFloat, className].filter(Boolean).join(' ')}
        aria-label={`${label} — chat with us on WhatsApp`}
      >
        <Icon icon="mdi:whatsapp" width="28" height="28" aria-hidden="true" />
      </a>
    );
  }

  if (variant === 'icon') {
    return (
      <a
        {...shared}
        className={[styles.icon, className].filter(Boolean).join(' ')}
        aria-label={label}
        title={label}
      >
        <Icon icon="mdi:whatsapp" width="22" height="22" aria-hidden="true" />
      </a>
    );
  }

  if (variant === 'link') {
    return (
      <a {...shared} className={className}>
        <Icon icon="mdi:whatsapp" className={iconClassName} aria-hidden="true" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <Button
      {...shared}
      variant={buttonVariant}
      className={className}
      icon={<Icon icon="mdi:whatsapp" aria-hidden="true" />}
    >
      {label}
    </Button>
  );
}
