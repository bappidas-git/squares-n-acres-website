import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import MapEmbed from '../../../../components/common/MapEmbed';
import WorkingHoursEditor from '../parts/WorkingHoursEditor';
import styles from '../SettingsPage.module.css';
import { MAP_EMBED_PREFIX, formatIndianPhone } from '../settingsSchema';
import { NumberField, TextField, TextareaField } from '../../../../components/ui/FormField';
import { whatsappLink } from '../../../../utils/format';

/** A PIN code as typed or pasted, reduced to its digits — six at most. */
export const pinDigits = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);

/**
 * Contact — everything a visitor dials, writes to or drives to (§6.13
 * `general`, the half that is not identity).
 *
 * The three phone boxes normalise to `+91 98765 43210` when they leave, because
 * that string is printed as it is stored — by the footer, the contact page and
 * the agent card — while `tel:` and `wa.me` targets are derived from it.
 *
 * The WhatsApp line is previewed as the link it becomes: an empty number is
 * not an error, it is the switch that removes the button from the header, the
 * footer and the floating bar.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function ContactTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const general = values.general ?? {};
  const address = general.address ?? {};

  const set = (path, value) => setField(`general.${path}`, value);
  const error = (path) => getError(`general.${path}`);

  /** Rewrites a phone box to the readable form once the editor leaves it. */
  const normalisePhone = (path) => {
    // An empty box is `null` in the record and `''` on the screen: leaving one
    // untouched rewrote the first as the second, and the form said it had
    // unsaved changes (QA-64).
    const current = general[path] ?? '';
    const next = formatIndianPhone(current);
    if (next !== current) set(path, next);
  };

  const waLink = whatsappLink(general.whatsappNumber, general.whatsappDefaultMessage);

  return (
    <div className={styles.tab}>
      <FormSection
        title="How to reach the firm"
        description="These are the only contact details the site knows; nothing is hardcoded anywhere."
      >
        <FormColumn half>
          <TextField
            label="Contact e-mail"
            type="email"
            inputMode="email"
            value={general.contactEmail ?? ''}
            onChange={(event) => set('contactEmail', event.target.value)}
            error={error('contactEmail')}
            hint="Printed in the footer and on the contact page."
            required
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Phone"
            type="tel"
            inputMode="tel"
            value={general.contactPhone ?? ''}
            onChange={(event) => set('contactPhone', event.target.value)}
            onBlur={() => normalisePhone('contactPhone')}
            error={error('contactPhone')}
            hint="With or without +91; spaces are fine."
            required
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Alternate phone"
            type="tel"
            inputMode="tel"
            value={general.alternatePhone ?? ''}
            onChange={(event) => set('alternatePhone', event.target.value)}
            onBlur={() => normalisePhone('alternatePhone')}
            error={error('alternatePhone')}
            hint="Optional — a second number for the contact page."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="WhatsApp"
        description="Empty removes the WhatsApp button from the header, the footer and the floating bar."
      >
        <FormColumn half>
          <TextField
            label="WhatsApp number"
            type="tel"
            inputMode="tel"
            value={general.whatsappNumber ?? ''}
            onChange={(event) => set('whatsappNumber', event.target.value)}
            onBlur={() => normalisePhone('whatsappNumber')}
            error={error('whatsappNumber')}
            hint="An Indian mobile number, with or without +91 — the chat opens on it."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextareaField
            label="Default message"
            rows={2}
            value={general.whatsappDefaultMessage ?? ''}
            onChange={(event) => set('whatsappDefaultMessage', event.target.value)}
            error={error('whatsappDefaultMessage')}
            hint="What the chat is pre-filled with when nothing more specific applies."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          {waLink ? (
            <span className={styles.linkPreview}>
              <Icon icon="mdi:whatsapp" width="18" height="18" aria-hidden="true" />
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                {waLink}
              </a>
            </span>
          ) : (
            <p className={styles.hint}>
              No number, no link — every WhatsApp button stays hidden until one is saved.
            </p>
          )}
        </FormColumn>
      </FormSection>

      <FormSection
        title="Office address"
        description="Printed in the footer and on the contact page."
      >
        <FormColumn>
          <TextField
            label="Address line 1"
            value={address.line1 ?? ''}
            onChange={(event) => set('address.line1', event.target.value)}
            error={error('address.line1')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <TextField
            label="Address line 2"
            value={address.line2 ?? ''}
            onChange={(event) => set('address.line2', event.target.value)}
            error={error('address.line2')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Locality"
            value={address.locality ?? ''}
            onChange={(event) => set('address.locality', event.target.value)}
            error={error('address.locality')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="City"
            value={address.city ?? ''}
            onChange={(event) => set('address.city', event.target.value)}
            error={error('address.city')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="State"
            value={address.state ?? ''}
            onChange={(event) => set('address.state', event.target.value)}
            error={error('address.state')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="PIN code"
            inputMode="numeric"
            autoComplete="postal-code"
            value={address.pincode ?? ''}
            // Digits only, six at most. A cap of six characters cut a pasted
            // " 560001" to " 56000", which was then refused (QA-64).
            onChange={(event) => set('address.pincode', pinDigits(event.target.value))}
            error={error('address.pincode')}
            hint="Six digits."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Country"
            value={address.country ?? ''}
            onChange={(event) => set('address.country', event.target.value)}
            error={error('address.country')}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="On the map"
        description="The coordinates draw the map; the embed address is what a CMS map block falls back to when it has none of its own."
      >
        <FormColumn>
          <TextField
            label="Map embed URL"
            type="url"
            inputMode="url"
            value={general.mapEmbedUrl ?? ''}
            onChange={(event) => set('mapEmbedUrl', event.target.value)}
            error={error('mapEmbedUrl')}
            hint={`Google Maps → Share → Embed a map; the address starts with ${MAP_EMBED_PREFIX}.`}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Latitude"
            step={0.000001}
            // A phone's numeric keypad has no decimal point (QA-64).
            inputMode="decimal"
            value={general.latitude ?? ''}
            onChange={(event) =>
              set('latitude', event.target.value === '' ? null : Number(event.target.value))
            }
            error={error('latitude')}
            hint="Bengaluru city centre is 12.9716."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Longitude"
            step={0.000001}
            inputMode="decimal"
            value={general.longitude ?? ''}
            onChange={(event) =>
              set('longitude', event.target.value === '' ? null : Number(event.target.value))
            }
            error={error('longitude')}
            hint="…and 77.5946."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <MapEmbed
            latitude={general.latitude}
            longitude={general.longitude}
            title="The office on the map"
            className={styles.mapPreview}
            placeholder="Add a latitude and a longitude to see where the office sits."
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Opening hours"
        description="Rendered on the contact page and, in schema.org form, in the knowledge graph."
      >
        <FormColumn>
          <WorkingHoursEditor
            value={general.workingHours ?? []}
            onChange={(rows) => set('workingHours', rows)}
            errorAt={(path) => error(`workingHours.${path}`)}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>
    </div>
  );
}
