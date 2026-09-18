import useInView from './useInView';

/**
 * A band that asks for its data only once it is nearly on screen (§8.6).
 *
 * The home page is nine bands deep and six of them fetch. Firing all six on
 * load puts them in the same queue as the hero image — the page's LCP — on a
 * connection where the queue is the bottleneck. Deferred, the hero has the
 * network to itself and the rest arrive as the visitor scrolls towards them.
 *
 *   const { ref, ready } = useDeferredSection();
 *   const { data, loading } = useApi(fetcher, deps, { enabled: ready });
 *   return <Section ref={ref}>…</Section>;
 *
 * `200px` of `rootMargin` is the margin that matters: the request starts while
 * the band is still one short scroll away, so it is filled by the time it is
 * read rather than skeleton-first. A band already inside the first viewport is
 * `ready` on the first render and nothing is deferred at all.
 *
 * `ready` is also `true` immediately when there is no `IntersectionObserver`
 * (jsdom), under `prefers-reduced-motion`, and during the prerender crawl —
 * `useInView` decides all three, so a deferred band is still in the HTML the
 * prerender saves.
 *
 * A band that renders nothing until it has data — a partner strip with no
 * partners is not an empty partner strip, it is no band at all — has nothing
 * for the observer to watch, so it renders an empty `<div ref={ref}>` in the
 * meantime: a block box of zero height, which is the position the observer
 * needs and not one pixel of layout. A band that already draws a
 * layout-identical skeleton (§8.2) puts the ref on that instead.
 *
 * @param {{ rootMargin?: string }} [options]
 * @returns {{ ref: (node: Element | null) => void, ready: boolean }}
 */
export default function useDeferredSection({ rootMargin = '200px' } = {}) {
  const { ref, inView } = useInView({ rootMargin, threshold: 0, triggerOnce: true });
  return { ref, ready: inView };
}
