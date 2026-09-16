import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { LazyImage, SwitchField, UrlField } from '../../../../../components/ui';
import { makeImage } from '../initialState';
import ImageGalleryEditor, { coverAfterRemoval } from '../components/ImageGalleryEditor';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The YouTube id inside any of the four URL shapes people paste. */
export function youTubeId(url) {
  const match = String(url ?? '').match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/** What kind of video a URL is, for the preview beside the field. */
export function videoKind(url) {
  const value = String(url ?? '');
  if (!value) return null;
  if (youTubeId(value)) return 'youtube';
  if (/vimeo\.com\//i.test(value)) return 'vimeo';
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(value)) return 'file';
  return 'other';
}

/**
 * Tab 6 — Media.
 *
 * Photographs, and the three links that are not photographs. Everything here is
 * a URL: uploads and the media library arrive in prompt 39, and `ImageField`'s
 * contract already reserves the two buttons for them, so nothing on this tab
 * has to move when they do.
 */
export default function MediaTab() {
  const { values, errors, setField, addItem, removeItem, moveItem, updateItem, disabled } =
    usePropertyFormContext();

  const images = values.images ?? [];
  const focusKeyword = String(values.seo?.focusKeyword ?? '').trim();
  const kind = videoKind(values.videoUrl);
  const youTube = youTubeId(values.videoUrl);

  /** Appends URLs as rows; the first photograph of an empty gallery is its cover. */
  const addImages = (urls) => {
    urls.forEach((url, offset) =>
      addItem('images', makeImage({ url, isCover: images.length === 0 && offset === 0 }))
    );
  };

  /** Exactly one cover, always (§6.1). */
  const setCover = (id) =>
    images.forEach((image) =>
      updateItem('images', image.id, { isCover: String(image.id) === String(id) })
    );

  /** Removing the cover promotes the first image that is left (§7 of prompt 19). */
  const removeImage = (id) => {
    const promoted = coverAfterRemoval(images, id);
    removeItem('images', id);
    if (promoted !== null) updateItem('images', promoted, { isCover: true });
  };

  return (
    <>
      <FormSection
        title="Gallery"
        description="The photographs a buyer scrolls through. The cover is the one on the card, in search results and in every share of this listing."
      >
        <FormColumn>
          <ImageGalleryEditor
            images={images}
            errors={errors}
            disabled={disabled}
            altHint={focusKeyword || null}
            onAdd={addImages}
            onUpdate={(id, patch) => updateItem('images', id, patch)}
            onRemove={removeImage}
            onMove={(from, to) => moveItem('images', from, to)}
            onSetCover={setCover}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Video and virtual tour"
        description="Both are optional, and each has its own section on the listing page."
      >
        <FormColumn half>
          <UrlField
            label="Video URL"
            value={values.videoUrl ?? ''}
            error={errors.videoUrl}
            disabled={disabled}
            hint="A YouTube or Vimeo link, or an MP4 file."
            onChange={(event) => setField('videoUrl', event.target.value)}
          />
        </FormColumn>

        {kind ? (
          <FormColumn half className={styles.conditional}>
            <div className={styles.videoPreview}>
              {youTube ? (
                <span className={styles.videoThumb}>
                  <LazyImage
                    src={`https://img.youtube.com/vi/${youTube}/hqdefault.jpg`}
                    alt=""
                    ratio="16 / 9"
                  />
                </span>
              ) : (
                <Icon
                  icon={kind === 'file' ? 'mdi:file-video-outline' : 'mdi:video-outline'}
                  width="28"
                  height="28"
                  aria-hidden="true"
                />
              )}
              <span className={styles.videoMeta}>
                {kind === 'youtube' ? 'YouTube video' : null}
                {kind === 'vimeo' ? 'Vimeo video — the player is embedded on the listing.' : null}
                {kind === 'file' ? 'Video file — played inline on the listing.' : null}
                {kind === 'other'
                  ? 'This is not a YouTube, Vimeo or MP4 address. The video section will be hidden.'
                  : null}
              </span>
            </div>
          </FormColumn>
        ) : null}

        <FormColumn half>
          <UrlField
            label="Virtual tour URL"
            value={values.virtualTourUrl ?? ''}
            error={errors.virtualTourUrl}
            disabled={disabled}
            hint="A 360° walkthrough, opened in its own section."
            onChange={(event) => setField('virtualTourUrl', event.target.value)}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Brochure"
        description="The download most enquiries start from. Everything else a buyer can download lives on the Documents tab."
      >
        <FormColumn half>
          <UrlField
            label="Brochure URL"
            value={values.brochureUrl ?? ''}
            error={errors.brochureUrl}
            disabled={disabled}
            hint="A PDF. It is linked from the listing header and the enquiry form."
            onChange={(event) => setField('brochureUrl', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <SwitchField
            label="Ask for details before the download"
            checked={values.brochureLeadGated !== false}
            disabled={disabled}
            hint="On: the visitor leaves a name and a phone number first, and the download is recorded as a lead."
            onChange={(checked) => setField('brochureLeadGated', checked)}
          />
        </FormColumn>
      </FormSection>
    </>
  );
}
