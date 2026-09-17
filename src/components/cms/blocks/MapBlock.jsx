import MapEmbed, { hasCoordinates } from '../../common/MapEmbed';
import { Container, Section } from '../../ui';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

import styles from './blocks.module.css';

/**
 * A map (§6.10 `map`).
 *
 * The block's own `embedUrl` wins; then its coordinates; then the office
 * coordinates from Site settings (D83), so the contact page moves when the
 * client moves without anybody editing a page. With nothing to draw the band
 * is absent rather than a grey rectangle over the Gulf of Guinea.
 */
export default function MapBlock({ data = {}, page = {}, background = 'bg' }) {
  const { settings } = useSiteSettings();
  const general = settings?.general ?? {};

  const embedUrl = data.embedUrl || general.mapEmbedUrl || '';
  const latitude = data.latitude ?? general.latitude ?? null;
  const longitude = data.longitude ?? general.longitude ?? null;
  const title = `Map of ${general.siteName || page.title || 'our office'}`;

  if (!embedUrl && !hasCoordinates(latitude, longitude)) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        {embedUrl ? (
          <iframe
            title={title}
            className={styles.map}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <MapEmbed
            latitude={latitude}
            longitude={longitude}
            title={title}
            className={styles.map}
          />
        )}
      </Container>
    </Section>
  );
}
