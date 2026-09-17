import { useEffect } from 'react';

/**
 * One page, one `<script type="application/ld+json">` (§9.3).
 *
 * Several scripts on a page are legal and Google reads them all, but one
 * `@graph` is what lets the nodes reference each other by `@id` — the listing
 * pointing at its publisher, the article at its author, the page at the site —
 * and a graph that references a node in a *different* script is a graph with
 * dangling pointers.
 *
 * **Why this does not go through Helmet.** `react-helmet-async` treats
 * `<script>` as a cumulative tag and de-duplicates it by its *content*: two
 * mounted instances holding two different scripts are two scripts, by design.
 * It also registers each instance during `render()` rather than in an effect,
 * so a render React starts and then discards — which is what `React.lazy` and
 * `<Suspense>` do on every route in this app — leaves an instance behind with
 * the props it was discarded with. The two together are visible: a listing page
 * renders `<Seo>` once with no results and again with them, and the head ends
 * up carrying both graphs. Measured against the production build, not only the
 * dev server.
 *
 * Every other tag survives that because its de-duplication key is its name — a
 * second `<meta name="description">` collapses onto the first. Only the graph
 * is keyed by what it says. So the graph owns one node in the head and rewrites
 * its text in place: one script, whatever React does with the renders around
 * it, and the last `<Seo>` to run wins, which is the one on screen.
 *
 * The JSON is serialised with `<` escaped: a description containing
 * `</script>` would otherwise close the element early, which is the one way a
 * JSON-LD block can become an injection rather than a data block. `JSON.parse`
 * reads `<` back as `<`, so nothing is lost to a reader.
 */

/** The attribute that marks the one node this component owns. */
export const MARKER = 'data-sna-jsonld';

/** JSON that cannot end the script element that carries it. */
export function serialise(graph) {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

/**
 * @param {object} props
 * @param {{'@context': string, '@graph': Array<object>}} [props.graph]
 */
export default function JsonLd({ graph }) {
  const json =
    graph && Array.isArray(graph['@graph']) && graph['@graph'].length ? serialise(graph) : '';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const existing = document.head.querySelector(`script[${MARKER}]`);
    if (!json) {
      existing?.remove();
      return undefined;
    }

    const node = existing ?? document.createElement('script');
    if (!existing) {
      node.type = 'application/ld+json';
      node.setAttribute(MARKER, 'true');
      document.head.appendChild(node);
    }
    if (node.textContent !== json) node.textContent = json;

    // Nothing is removed on unmount: every route renders a `<Seo>`, so the next
    // page rewrites this node rather than inheriting an empty head for a frame.
    return undefined;
  }, [json]);

  return null;
}
