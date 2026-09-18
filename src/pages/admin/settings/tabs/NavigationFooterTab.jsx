import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import FooterColumnsEditor from '../parts/FooterColumnsEditor';
import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import IconButton from '../../../../components/ui/IconButton';
import ImageField from '../../../../components/admin/ImageField';
import styles from '../SettingsPage.module.css';
import { LIMITS } from '../settingsSchema';
import { SwitchField, TextField, TextareaField } from '../../../../components/ui/FormField';

/** The six profiles §6.13 knows, with the icon the footer draws for each. */
export const SOCIAL_PROFILES = [
  { key: 'facebook', label: 'Facebook', icon: 'mdi:facebook' },
  { key: 'instagram', label: 'Instagram', icon: 'mdi:instagram' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'mdi:linkedin' },
  { key: 'youtube', label: 'YouTube', icon: 'mdi:youtube' },
  { key: 'x', label: 'X', icon: 'mdi:twitter' },
  { key: 'pinterest', label: 'Pinterest', icon: 'mdi:pinterest' },
];

/**
 * Navigation & footer — the header's call to action, the profiles that
 * corroborate the brand, and everything below the fold (§6.13 `navigation`,
 * `social`, `footer`).
 *
 * Two rules are worth knowing while editing here:
 *
 *   - an empty social address hides that icon rather than linking nowhere, so
 *     the six boxes are six switches as much as they are six fields;
 *   - the collage needs three pictures to look like one (D79). Fewer than three
 *     and the footer leaves it out, which is why the warning is a warning and
 *     not an error — a half-filled gallery is a state an editor passes through.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function NavigationFooterTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const navigation = values.navigation ?? {};
  const social = values.social ?? {};
  const footer = values.footer ?? {};

  const gallery = Array.isArray(footer.galleryImageUrls) ? footer.galleryImageUrls : [];
  const galleryFull = gallery.length >= LIMITS.footerGallery;
  const galleryThin = footer.showGallery && gallery.length < LIMITS.footerGalleryMinimum;

  const setGallery = (next) => setField('footer.galleryImageUrls', next);

  return (
    <div className={styles.tab}>
      <FormSection
        title="Header"
        description="The one button the header carries, and the two icons beside it."
      >
        <FormColumn half>
          <TextField
            label="Call-to-action label"
            value={navigation.headerCtaLabel ?? ''}
            onChange={(event) => setField('navigation.headerCtaLabel', event.target.value)}
            error={getError('navigation.headerCtaLabel')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Call-to-action target"
            value={navigation.headerCtaHref ?? ''}
            onChange={(event) => setField('navigation.headerCtaHref', event.target.value)}
            error={getError('navigation.headerCtaHref')}
            hint="#post-requirement opens the requirement form; a path such as /contact navigates."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <SwitchField
            label="Show the call button"
            checked={navigation.showCallButton !== false}
            onChange={(next) => setField('navigation.showCallButton', next)}
            hint="Needs a phone number on the Contact tab."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <SwitchField
            label="Show the WhatsApp button"
            checked={navigation.showWhatsappButton !== false}
            onChange={(next) => setField('navigation.showWhatsappButton', next)}
            hint="Needs a WhatsApp number on the Contact tab."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Social profiles"
        description="Full https:// addresses. An empty box hides that icon; the SEO knowledge graph publishes the same list as sameAs."
      >
        {SOCIAL_PROFILES.map((profile) => (
          <FormColumn half key={profile.key}>
            <TextField
              label={
                <span className={styles.tabRowLabel}>
                  <Icon icon={profile.icon} width="18" height="18" aria-hidden="true" />
                  {profile.label}
                </span>
              }
              type="url"
              inputMode="url"
              value={social[profile.key] ?? ''}
              onChange={(event) => setField(`social.${profile.key}`, event.target.value)}
              error={getError(`social.${profile.key}`)}
              disabled={disabled}
            />
          </FormColumn>
        ))}
      </FormSection>

      <FormSection title="Footer">
        <FormColumn>
          <TextareaField
            label="About text"
            rows={3}
            value={footer.aboutText ?? ''}
            onChange={(event) => setField('footer.aboutText', event.target.value)}
            error={getError('footer.aboutText')}
            hint="Two or three sentences beside the logo — what the firm does, and where."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <FooterColumnsEditor
            value={footer.columns ?? []}
            onChange={(columns) => setField('footer.columns', columns)}
            errorAt={(path) => getError(`footer.columns.${path}`)}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <TextareaField
            label="Disclaimer"
            rows={2}
            value={footer.disclaimer ?? ''}
            onChange={(event) => setField('footer.disclaimer', event.target.value)}
            error={getError('footer.disclaimer')}
            hint="The small print above the copyright line."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Copyright line"
            value={footer.copyrightText ?? ''}
            onChange={(event) => setField('footer.copyrightText', event.target.value)}
            error={getError('footer.copyrightText')}
            hint="%year% becomes the current year, so the line never goes stale."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <SwitchField
            label="Show the newsletter block"
            checked={footer.showNewsletter !== false}
            onChange={(next) => setField('footer.showNewsletter', next)}
            hint="The Newsletter tab has its own switch; either one off hides the block."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Footer gallery"
        description="The picture strip under the footer columns — off by default (D79)."
      >
        <FormColumn>
          <SwitchField
            label="Show the gallery"
            checked={Boolean(footer.showGallery)}
            onChange={(next) => setField('footer.showGallery', next)}
            disabled={disabled}
          />
        </FormColumn>

        {galleryThin ? (
          <FormColumn>
            <p className={styles.warning}>
              A collage needs at least {LIMITS.footerGalleryMinimum} pictures — with{' '}
              {gallery.length} the footer leaves it out.
            </p>
          </FormColumn>
        ) : null}

        <FormColumn>
          {gallery.length > 0 ? (
            <div className={styles.galleryGrid}>
              {gallery.map((url, index) => (
                <div className={styles.galleryCell} key={`gallery-${index}`}>
                  <ImageField
                    label={`Picture ${index + 1}`}
                    hint="gallery"
                    value={url ?? ''}
                    onChange={(next) =>
                      setGallery(gallery.map((entry, at) => (at === index ? next : entry)))
                    }
                    error={getError(`footer.galleryImageUrls.${index}`)}
                    alt=""
                    folder="brand"
                    disabled={disabled}
                  />
                  <div className={styles.actionRow}>
                    <IconButton
                      label={`Remove picture ${index + 1}`}
                      onClick={() => setGallery(gallery.filter((_entry, at) => at !== index))}
                      disabled={disabled}
                    >
                      <Icon icon="mdi:trash-can-outline" width="18" height="18" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.repeaterEmpty}>No pictures yet.</p>
          )}
        </FormColumn>

        <FormColumn>
          <div className={styles.actionRow}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGallery([...gallery, ''])}
              disabled={disabled || galleryFull}
              icon={<Icon icon="mdi:image-plus" width="16" height="16" />}
            >
              Add a picture
            </Button>
            <span className={styles.repeaterCount}>
              {gallery.length} of {LIMITS.footerGallery}
            </span>
          </div>
        </FormColumn>
      </FormSection>
    </div>
  );
}
