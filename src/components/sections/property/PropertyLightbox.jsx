import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';

import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';

/**
 * The full-screen gallery, in a chunk of its own.
 *
 * `yet-another-react-lightbox` is ESM-only and carries its own stylesheets, so
 * it is never part of the page's first load: `PropertyGallery` reaches it
 * through `React.lazy`, which is what keeps the library — and these three CSS
 * files — out of the main bundle until somebody actually opens a photograph
 * (D7).
 *
 * The library brings the focus trap, `Escape`, the arrow keys, the swipe and
 * the restore-focus-on-close; the two plugins print the caption and the
 * "3 / 8" counter.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {number} props.index the slide to open on
 * @param {{src: string, alt?: string, title?: string, description?: string}[]} props.slides
 * @param {() => void} props.onClose
 * @param {(index: number) => void} [props.onIndexChange]
 */
export default function PropertyLightbox({ open, index = 0, slides = [], onClose, onIndexChange }) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Captions, Counter]}
      captions={{ descriptionTextAlign: 'center', showToggle: false }}
      carousel={{ finite: slides.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      animation={{ swipe: 250 }}
      on={{ view: ({ index: next }) => onIndexChange?.(next) }}
      styles={{ container: { backgroundColor: 'var(--color-overlay-strong)' } }}
    />
  );
}
