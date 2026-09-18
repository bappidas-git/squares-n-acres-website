import { VideoEmbed } from '../../ui';

/**
 * A YouTube embed inside CMS prose, rendered as the click-to-load facade.
 *
 * The editor's YouTube node serialises to `<div data-youtube-video><iframe …>`
 * (`editor/extensions.js`), and `SafeHtml` pulls those out of the markup the
 * way it pulls out the three `data-sna-block` placeholders: as a real
 * component rather than as an iframe the browser starts a player for. An
 * article with three clips in it costs three pictures until somebody presses
 * play (§8.6).
 *
 * The `<figure>` is what puts the embed on `.prose > * + *`, the same vertical
 * rhythm as the paragraphs around it (`prose.css`).
 *
 * @param {object} props
 * @param {string} props.src the embed address, already through the sanitiser's
 *   host allow-list (`editor/sanitize.js`)
 * @param {string} [props.title]
 */
export default function RenderedYoutube({ src, title }) {
  if (!src) return null;
  return (
    <figure>
      <VideoEmbed src={src} title={title || 'Embedded video'} />
    </figure>
  );
}
