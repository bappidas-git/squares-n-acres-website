import { Icon } from '@iconify/react';

import { Button } from '../ui';
import { EVENTS, track } from '../../utils/analytics';
import { formatPhoneForTel } from '../../utils/format';
import { recordClickLead } from '../../utils/clickLead';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

import styles from './ContactButtons.module.css';

/**
 * Call us.
 *
 * The counterpart of `WhatsAppButton`, with the same three shapes and the same
 * rule: every click sends `call_click`, and a click by a visitor who has
 * already identified themselves also files a `call-click` lead (§6.17), fired
 * and forgotten so the `tel:` link is never delayed.
 *
 * The number is the listing's own advisor when the editor published one, and
 * the company line otherwise; with neither configured nothing renders (§14).
 *
 * @param {object} props
 * @param {'float'|'button'|'icon'|'link'} [props.variant] `link` is a bare
 *   anchor with the icon and the label, styled entirely by `className`
 * @param {string} [props.buttonVariant] the `ui/Button` variant when `button`
 * @param {string} [props.number] the listing advisor's own number
 * @param {number|string|null} [props.propertyId] defaults to the listing the
 *   page registered with `setPageContext()`
 * @param {string} [props.label] defaults to "Call <number>"
 * @param {string} [props.context] where the click happened, for analytics
 * @param {string} [props.className]
 * @param {string} [props.iconClassName] applied to the glyph of the `link`
 *   variant, so a host bar can size it with the rest of its row
 */
export default function CallButton({
  variant = 'button',
  buttonVariant = 'outline',
  number,
  propertyId,
  label,
  context,
  className = '',
  iconClassName,
}) {
  const { getContact } = useSiteSettings();
  const { isIdentified, visitor, page } = useLeadCapture();

  const listingId = propertyId ?? page.propertyId ?? null;

  const phone = number || getContact().phone;
  const href = phone ? `tel:${formatPhoneForTel(phone)}` : '';

  if (!href) return null;

  const text = label ?? `Call ${phone}`;

  const onClick = () => {
    track(EVENTS.callClick, { propertyId: listingId, context });
    if (isIdentified) {
      recordClickLead({
        visitor,
        source: 'call-click',
        propertyId: listingId,
        message: 'Clicked the phone number',
      });
    }
  };

  if (variant === 'float') {
    return (
      <a
        href={href}
        onClick={onClick}
        className={[styles.float, styles.callFloat, className].filter(Boolean).join(' ')}
        aria-label={`Call ${phone}`}
      >
        <Icon icon="mdi:phone-outline" width="26" height="26" aria-hidden="true" />
      </a>
    );
  }

  if (variant === 'icon') {
    return (
      <a
        href={href}
        onClick={onClick}
        className={[styles.icon, className].filter(Boolean).join(' ')}
        aria-label={`Call ${phone}`}
        title={text}
      >
        <Icon icon="mdi:phone-outline" width="22" height="22" aria-hidden="true" />
      </a>
    );
  }

  if (variant === 'link') {
    return (
      <a href={href} onClick={onClick} className={className}>
        <Icon icon="mdi:phone-outline" className={iconClassName} aria-hidden="true" />
        <span>{text}</span>
      </a>
    );
  }

  return (
    <Button
      href={href}
      onClick={onClick}
      variant={buttonVariant}
      className={className}
      icon={<Icon icon="mdi:phone-outline" aria-hidden="true" />}
    >
      {text}
    </Button>
  );
}
