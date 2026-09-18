import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import ImageField from '../../../../components/admin/ImageField';
import styles from '../SettingsPage.module.css';
import { BRAND } from '../../../../config/site';
import { CURRENT_YEAR, trimTrailingSlash } from '../settingsSchema';
import { NumberField, TextField } from '../../../../components/ui/FormField';

/**
 * General — who the site is (§6.13 `general`).
 *
 * The two brand assets are previewed at the sizes the header actually draws
 * them (40 px wordmark, 32 px monogram), because "does the logo work" is a
 * question about a 40-pixel-tall box and not about the file. "Reset to brand
 * assets" puts back the Cloudinary originals of §2.1, which is the way out of
 * an upload that turned out wrong.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function GeneralTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const general = values.general ?? {};

  const set = (path, value) => setField(`general.${path}`, value);
  const error = (path) => getError(`general.${path}`);

  const isBrandLogo = general.logoUrl === BRAND.logoUrl && general.iconUrl === BRAND.iconUrl;

  return (
    <div className={styles.tab}>
      <FormSection
        title="Identity"
        description="The name and the line that introduce the firm everywhere it is named."
      >
        <FormColumn half>
          <TextField
            label="Site name"
            value={general.siteName ?? ''}
            onChange={(event) => set('siteName', event.target.value)}
            error={error('siteName')}
            hint="The brand name in the header, in every page title and in the footer."
            required
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Tagline"
            value={general.tagline ?? ''}
            onChange={(event) => set('tagline', event.target.value)}
            error={error('tagline')}
            hint="One line under the logo in the footer — not a slogan the titles repeat."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Brand assets"
        description="The wordmark sits on light surfaces only (D3); the monogram is the favicon, the app icon and the loading mark."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              set('logoUrl', BRAND.logoUrl);
              set('iconUrl', BRAND.iconUrl);
            }}
            disabled={disabled || isBrandLogo}
            icon={<Icon icon="mdi:backup-restore" width="16" height="16" />}
          >
            Reset to brand assets
          </Button>
        }
      >
        <FormColumn half>
          <ImageField
            label="Logo"
            hint="logo"
            value={general.logoUrl ?? ''}
            onChange={(next) => set('logoUrl', next)}
            error={error('logoUrl')}
            alt={`${general.siteName || 'The site'} logo`}
            preview={false}
            folder="brand"
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <ImageField
            label="Icon"
            hint="avatar"
            value={general.iconUrl ?? ''}
            onChange={(next) => set('iconUrl', next)}
            error={error('iconUrl')}
            alt={`${general.siteName || 'The site'} monogram`}
            preview={false}
            folder="brand"
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <div className={styles.brandPreview}>
            <div className={styles.brandPreviewItem}>
              <span className={styles.brandPreviewLabel}>Header, 40 px</span>
              {general.logoUrl ? (
                <img
                  src={general.logoUrl}
                  alt={`${general.siteName || 'The site'} logo at header size`}
                  className={styles.logoImage}
                />
              ) : (
                <span className={styles.hint}>
                  No logo — the header falls back to the brand file.
                </span>
              )}
            </div>
            <div className={styles.brandPreviewItem}>
              <span className={styles.brandPreviewLabel}>Tab icon, 32 px</span>
              {general.iconUrl ? (
                <img
                  src={general.iconUrl}
                  alt={`${general.siteName || 'The site'} monogram at icon size`}
                  className={styles.iconImage}
                />
              ) : (
                <span className={styles.hint}>No icon — the browser shows its default.</span>
              )}
            </div>
          </div>
        </FormColumn>
      </FormSection>

      <FormSection
        title="Address of the site"
        description="Where the site lives and which English it is written in."
      >
        <FormColumn half>
          <TextField
            label="Site URL"
            type="url"
            inputMode="url"
            value={general.siteUrl ?? ''}
            onChange={(event) => set('siteUrl', event.target.value)}
            onBlur={() => {
              const trimmed = trimTrailingSlash(general.siteUrl ?? '');
              if (trimmed !== general.siteUrl) set('siteUrl', trimmed);
            }}
            error={error('siteUrl')}
            hint="No trailing slash — every canonical URL is built from it. SEO settings keeps its own copy for canonicals."
            required
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Default language"
            value={general.defaultLanguage ?? 'en-IN'}
            readOnly
            disabled
            hint="Indian English. The site is not translated, so this is fixed."
          />
        </FormColumn>
      </FormSection>

      <FormSection title="The firm" description="Displayed in the footer and on property pages.">
        <FormColumn half>
          <NumberField
            label="Established in"
            min={1900}
            max={CURRENT_YEAR}
            step={1}
            value={general.establishedYear ?? ''}
            onChange={(event) =>
              set('establishedYear', event.target.value === '' ? null : Number(event.target.value))
            }
            error={error('establishedYear')}
            hint={`Between 1900 and ${CURRENT_YEAR}; leave it empty until the year is confirmed.`}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="RERA number"
            value={general.reraNumber ?? ''}
            onChange={(event) => set('reraNumber', event.target.value)}
            error={error('reraNumber')}
            hint="Displayed in the footer and on property pages."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="GST number"
            value={general.gstNumber ?? ''}
            onChange={(event) => set('gstNumber', event.target.value)}
            error={error('gstNumber')}
            hint="Displayed in the footer and on property pages."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>
    </div>
  );
}
