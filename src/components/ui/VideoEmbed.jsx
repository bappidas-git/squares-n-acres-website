import { useState } from 'react';
import { Icon } from '@iconify/react';

import styles from './VideoEmbed.module.css';

/**
 * A video embed that costs nothing until somebody asks to watch it.
 *
 * A YouTube `<iframe>` is roughly a megabyte of JavaScript across a dozen
 * requests, and it starts the moment the page renders — on a property page
 * with a walkthrough, or an article whose author dropped a clip into the body,
 * it is the single largest thing on the page and nobody has pressed play
 * (§8.6). So the iframe is not there: a thumbnail and a play button are, and
 * the real player replaces them on the first click, already playing.
 *
 * The thumbnail is YouTube's own (`i.ytimg.com`), which is one image request
 * against the embed's dozen, and it is the frame a visitor expects to see. It
 * has a fixed ratio, so swapping the player in moves nothing (CLS).
 *
 * Anything that is not YouTube — a Vimeo player, a map — renders as the iframe
 * it always was: those are the addresses `editor/sanitize.js` allows, and the
 * facade only knows how to stand in for one of them.
 *
 * The button is a real `<button>` with the video's name in its label, so a
 * keyboard reaches it and a screen reader says what it plays (§8.3).
 *
 * @param {object} props
 * @param {string} props.src an embed URL (`/embed/<id>`, `watch?v=`, `youtu.be/…`)
 * @param {string} props.title what the video is — the iframe's accessible name
 * @param {string} [props.className] on the ratio box
 */
export default function VideoEmbed({ src, title = 'Video', className = '' }) {
  const [playing, setPlaying] = useState(false);

  const id = youtubeId(src);
  const classes = [styles.frame, className].filter(Boolean).join(' ');

  if (!id) {
    return (
      <div className={classes}>
        <iframe
          className={styles.media}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (playing) {
    return (
      <div className={classes}>
        <iframe
          className={styles.media}
          src={`${embedUrl(id)}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={classes}>
      <button type="button" className={styles.facade} onClick={() => setPlaying(true)}>
        <img
          className={styles.thumb}
          src={thumbnailUrl(id)}
          alt=""
          width="480"
          height="360"
          loading="lazy"
          decoding="async"
        />
        <span className={styles.scrim} aria-hidden="true" />
        <span className={styles.play} aria-hidden="true">
          <Icon icon="mdi:play" width="34" height="34" />
        </span>
        <span className={styles.srOnly}>Play the video: {title}</span>
      </button>
    </div>
  );
}

/**
 * The eleven-character video id in a YouTube address, or `null`.
 *
 * Every spelling the product can produce is accepted: the `/embed/<id>` form
 * `PropertyGallery` builds, the `watch?v=` form an editor pastes, the
 * `youtu.be/<id>` share link and the `-nocookie` host.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function youtubeId(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw, 'https://www.youtube.com');
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  const segments = parsed.pathname.split('/').filter(Boolean);

  const candidate =
    host === 'youtu.be'
      ? segments[0]
      : host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com'
        ? (parsed.searchParams.get('v') ?? segments[segments.length - 1])
        : null;

  return /^[\w-]{6,}$/.test(candidate ?? '') ? candidate : null;
}

/** The privacy-preserving player address for a video id. */
export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}`;

/**
 * YouTube's own still for a video.
 *
 * `hqdefault` rather than `maxresdefault`: every video has one, where the
 * larger size exists only for videos uploaded above 720p and answers 404 for
 * the rest — a facade with a broken picture on it is worse than no facade.
 */
export const thumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
