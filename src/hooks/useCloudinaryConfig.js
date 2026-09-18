import { useMemo } from 'react';

import { cloudinaryConfig } from '../utils/cloudinary';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

/**
 * Whether this deployment can upload, and what it uploads with.
 *
 * `utils/cloudinary.js` answers the question from a settings object; this is
 * the same answer for a component, which does not want to know that the object
 * comes from a context two providers up. Every screen that offers an upload
 * asks this one hook, so "Cloudinary is not configured" looks the same in the
 * media library, in the picker and on every image field (§7 of prompt 39).
 *
 * The settings arrive after the first paint, so `configured` starts `false` and
 * becomes `true` when they land. That is the right way round: an upload button
 * that appears a moment late is better than one that appears and then fails.
 *
 * @returns {{configured: boolean, cloudName: string, uploadPreset: string, settings: object|null}}
 */
export default function useCloudinaryConfig() {
  const { settings } = useSiteSettings();

  return useMemo(() => {
    const { cloudName, uploadPreset } = cloudinaryConfig(settings);
    return {
      configured: Boolean(cloudName && uploadPreset),
      cloudName,
      uploadPreset,
      settings: settings ?? null,
    };
  }, [settings]);
}
