import { useEffect } from 'react';

/**
 * Whether this browser needs the iOS treatment.
 *
 * `overflow: hidden` on `<body>` stops the page scrolling everywhere except
 * iOS Safari, where the background keeps rubber-banding under a fixed overlay
 * and a sheet drags the page with it. `-webkit-touch-callout` is supported by
 * exactly the engine with that behaviour, which makes it a better test than a
 * user-agent string — iPadOS has reported itself as a Mac since 13.
 */
const needsIosLock = () =>
  typeof window !== 'undefined' &&
  typeof window.CSS !== 'undefined' &&
  typeof window.CSS.supports === 'function' &&
  window.CSS.supports('-webkit-touch-callout', 'none');

/** How many overlays are open, so two of them cannot fight over the body. */
let locks = 0;
let restoreTo = 0;

/**
 * Holds the page still while an overlay is open — including on iOS.
 *
 * MUI's `Modal` already locks the scroll of every other browser (it sets
 * `overflow: hidden` on the body and compensates for the scrollbar), so this
 * adds only the part MUI leaves out: on iOS the body has to become
 * `position: fixed` at its current offset, and be put back afterwards, or the
 * page behind a bottom sheet scrolls with the finger and lands somewhere else
 * when the sheet closes.
 *
 * It counts: nested overlays — a confirm dialog over an editing drawer — lock
 * once and unlock once, at the right scroll position.
 *
 *   useScrollLock(open);
 *
 * @param {boolean} locked
 */
export default function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    if (!needsIosLock()) return undefined;

    const { body } = document;

    if (locks === 0) {
      restoreTo = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${restoreTo}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks > 0) return;

      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo(0, restoreTo);
    };
  }, [locked]);
}
