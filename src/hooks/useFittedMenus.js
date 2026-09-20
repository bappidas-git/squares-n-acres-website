import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * How many menus fit on the header bar — measured, not guessed.
 *
 * The bar was folding its tail into "More" on one hardcoded breakpoint (`md`),
 * on the reasoning that ten labels plus the logo and the buttons need about
 * 1200px. They need more than that. `.inner` is capped at `--container-max`,
 * so the bar is the same width at 1280px and at 2560px, and ten menus asked
 * for 802px of a 765px nav at every one of them. `.nav` is `flex: 1 1 auto`
 * with `min-width: 0` and centred content, so the overflow did not scroll or
 * clip — it spilled 21px out of *both* ends, putting "Buy" under the logo and
 * "Contact" under the search button on every desktop screen.
 *
 * A wider hardcoded limit would only move the number. The menus are built from
 * master data and the published CMS pages, so how many there are is the
 * client's to change: publish two more pages with `showInHeader` and any fixed
 * limit is wrong again. So this measures the bar it actually has.
 *
 * It drops one menu per commit while the content overflows, in a layout
 * effect — before paint, so the bar is never drawn spilling — and starts again
 * from the full list whenever the bar is resized, so a menu dropped at 1200px
 * comes back on a wider screen.
 *
 * @param {number} total how many menus there are to place
 * @param {number} [minimum] never fold below this many, however narrow the bar
 * @returns {[React.RefObject<HTMLElement>, number]} the ref to put on the bar,
 *   and the limit to pass to `collapseMenus`
 */
export default function useFittedMenus(total, minimum = 1) {
  const ref = useRef(null);
  const [limit, setLimit] = useState(total);

  // Bumped whenever something happened that the last measurement did not see.
  // It exists because `setLimit(total)` when the limit is already `total` is a
  // no-op to React: it bails out, nothing re-renders, and the measuring effect
  // never runs — which is exactly the case that matters, a bar that currently
  // shows everything and has just stopped fitting.
  const [pass, setPass] = useState(0);

  const remeasure = useCallback(() => setPass((current) => current + 1), []);

  const reset = useCallback(() => {
    setLimit(total);
    setPass((current) => current + 1);
  }, [total]);

  // A different set of menus — an editor published a page — starts over.
  useLayoutEffect(() => {
    reset();
  }, [reset]);

  // So does a resize of the bar. It is observed rather than the window so that
  // a change with no resize behind it — the WhatsApp button switched off in
  // settings, which gives the menus more room — is picked up too. The parent
  // is what changes width: the nav itself fills what is left over, so its own
  // box does not move when a menu is dropped, and observing it cannot loop.
  useLayoutEffect(() => {
    const box = ref.current?.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(reset);
    observer.observe(box);
    return () => observer.disconnect();
  }, [reset]);

  /*
   * And a label changing width invalidates the measurement without resizing
   * anything else. The webfont is the case that bites: `display=swap` draws
   * the bar in the fallback first, and the ten labels grew from 744px to 840px
   * when Inter arrived — after `document.fonts.ready` had already resolved,
   * because the stylesheet that asks for Inter had not loaded when it was
   * asked. Watching the labels themselves needs no guess about when that is.
   *
   * This one only re-measures; it does not restore folded menus. Folding
   * changes the labels, so a reset here would put everything back and fold
   * again for ever. Restoring is the resize observer's job above, which fires
   * on the change that actually creates the room.
   */
  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(remeasure);
    [...nav.children].forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [remeasure, limit]);

  // One menu per commit: each pass drops one and the next measures what that
  // bought, until it fits or there is nothing left to give.
  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav || limit <= minimum) return;
    if (nav.scrollWidth > nav.clientWidth + 1) setLimit((current) => current - 1);
  }, [limit, pass, minimum]);

  return [ref, limit];
}
