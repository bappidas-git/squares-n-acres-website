/**
 * An author as a person (§9.3) — the node behind E-E-A-T: who wrote this, what
 * they do, and where else they are.
 */

import { absolute, compact } from './graph';
import { stripHtml } from '../text';

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of an author
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
export function personNode(input = {}, context = {}) {
  const author = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const links = author.socialLinks ?? {};
  const sameAs = [links.linkedin, links.twitter, links.website].filter(Boolean);

  return compact({
    '@type': 'Person',
    '@id': `${canonical}#person`,
    name: author.name,
    url: canonical,
    image: absolute(siteUrl, author.avatarUrl),
    jobTitle: author.designation,
    description: stripHtml(author.bio ?? '').slice(0, 300),
    sameAs: sameAs.length ? sameAs : undefined,
  });
}

export default personNode;
