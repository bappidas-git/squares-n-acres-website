import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import PATHS from '../../../../routes/paths';
import styles from '../SettingsPage.module.css';
import { INTEGRATION_PATTERNS } from '../settingsSchema';
import { Link } from 'react-router-dom';
import { TextField } from '../../../../components/ui/FormField';

/** What each id is, and what stops working without it. */
const FIELDS = [
  {
    key: 'googleAnalyticsId',
    label: 'GA4 measurement ID',
    hint: 'Loads GA4 on the public site; page views and the web-vitals report go to this property.',
  },
  {
    key: 'googleTagManagerId',
    label: 'Tag Manager container ID',
    hint: 'Loads GTM instead of — or beside — GA4, for tags managed outside this admin.',
  },
  {
    key: 'facebookPixelId',
    label: 'Meta pixel ID',
    hint: 'Loads the Meta pixel. Leave empty and no Meta script is served at all.',
  },
  {
    key: 'googleMapsApiKey',
    label: 'Google Maps browser key',
    hint: 'Only the property form’s draggable pin needs it (D42); every public map is key-free.',
  },
  {
    key: 'cloudinaryCloudName',
    label: 'Cloudinary cloud name',
    hint: 'With the preset below, this turns on uploading across the admin.',
    to: PATHS.adminMedia,
    toLabel: 'Media library',
  },
  {
    key: 'cloudinaryUploadPreset',
    label: 'Cloudinary unsigned upload preset',
    hint: 'An unsigned preset — the browser uploads directly, so nothing here can sign a request.',
    to: PATHS.adminMedia,
    toLabel: 'Media library',
  },
  {
    key: 'recaptchaSiteKey',
    label: 'reCAPTCHA site key',
    hint: 'The public half of the pair. The secret half belongs to the server and is never stored here.',
  },
];

/**
 * Integrations — the seven ids the site hands to other people's scripts
 * (§6.13 `integrations`).
 *
 * None of them is a secret: every one is served inside the HTML of a public
 * page, which is the reason the model has no secret half and the reason a typo
 * is expensive. A mistyped measurement id does not fail — it collects nothing,
 * quietly, until somebody looks at a report weeks later. So each box is checked
 * against the shape its service actually issues before a save is allowed.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function IntegrationsTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const integrations = values.integrations ?? {};

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        None of these is a secret — all seven are published in the HTML of every page. Anything that
        must stay private (an API secret, the reCAPTCHA secret key) belongs on the server.
      </p>

      <FormSection title="Measurement and tags">
        {FIELDS.slice(0, 3).map((field) => (
          <FormColumn half key={field.key}>
            <IntegrationField
              field={field}
              values={integrations}
              setField={setField}
              getError={getError}
              disabled={disabled}
            />
          </FormColumn>
        ))}
      </FormSection>

      <FormSection title="Maps, media and spam">
        {FIELDS.slice(3).map((field) => (
          <FormColumn half key={field.key}>
            <IntegrationField
              field={field}
              values={integrations}
              setField={setField}
              getError={getError}
              disabled={disabled}
            />
          </FormColumn>
        ))}
      </FormSection>
    </div>
  );
}

/** One id: its own format check, its example and where it is used. */
function IntegrationField({ field, values, setField, getError, disabled }) {
  const rule = INTEGRATION_PATTERNS[field.key];

  return (
    <>
      <TextField
        label={field.label}
        value={values[field.key] ?? ''}
        onChange={(event) =>
          setField(
            `integrations.${field.key}`,
            rule?.uppercase ? event.target.value.toUpperCase() : event.target.value
          )
        }
        error={getError(`integrations.${field.key}`)}
        placeholder={rule?.example}
        hint={field.hint}
        disabled={disabled}
      />
      {field.to ? (
        <span className={styles.hint}>
          Used by <Link to={field.to}>{field.toLabel}</Link>.
        </span>
      ) : null}
    </>
  );
}
