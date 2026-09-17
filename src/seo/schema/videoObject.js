/**
 * A walkthrough video (§9.3).
 *
 * Google requires a name, a thumbnail and an upload date before it will show a
 * video result at all, so the generator fills what it can from the record and
 * the validator refuses what is left empty.
 */

import { absolute, compact, isoDate } from './graph';

/** The still image a video host serves for a URL, where we can derive one. */
function thumbnailFor(url) {
  const youtube = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i.exec(url ?? '');
  return youtube ? `https://img.youtube.com/vi/${youtube[1]}/hqdefault.jpg` : undefined;
}

/**
 * @param {{videoUrl?: string, name?: string, description?: string, thumbnailUrl?: string,
 *   uploadDate?: string, canonical?: string}} input — or a normalised record, whose
 *   `extras.videoUrl` is used
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
export function videoObjectNode(input = {}, context = {}) {
  const url = input.videoUrl ?? input.extras?.videoUrl;
  if (!url) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const canonical = input.canonical ?? '';
  const entity = input.entity ?? {};

  return compact({
    '@type': 'VideoObject',
    '@id': canonical ? `${canonical}#video` : undefined,
    name: input.name ?? input.title ?? input.effectiveTitle,
    description: input.description ?? input.summary,
    contentUrl: absolute(siteUrl, url),
    embedUrl: absolute(siteUrl, url),
    thumbnailUrl: absolute(siteUrl, input.thumbnailUrl ?? input.coverImageUrl) ?? thumbnailFor(url),
    uploadDate: isoDate(input.uploadDate ?? entity.publishedAt ?? entity.createdAt),
  });
}

export default videoObjectNode;
