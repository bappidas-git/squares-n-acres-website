/**
 * The animation features `LazyMotion` loads, in a chunk of their own.
 *
 * `framer-motion` ships two ways of using it. `motion.div` is the convenient
 * one and it drags in every feature the library has — layout projection, drag,
 * pan and press gestures, scroll linking, SVG path morphing — because a
 * `motion` component cannot know which of them the element it renders will
 * want. `m.div` is the same component with none of them, and a `LazyMotion`
 * ancestor supplies the ones the app actually uses.
 *
 * This site animates opacity and transforms, and nothing else: a toast sliding
 * in, an accordion opening, the back-to-top button appearing, a page fading
 * between routes. That is exactly `domAnimation`, which is a fraction of the
 * full bundle — and because this module is reached only through `import()`,
 * even that fraction lands in a chunk of its own, after the first paint,
 * instead of ahead of it (§8.6, and the decision recorded in
 * `docs/DECISIONS.md`).
 *
 * It is a re-export and nothing else on purpose: one named import of
 * `domAnimation`, in a module with no other import, is what lets webpack put
 * the feature bundle in this chunk and leave the rest of the library out of
 * it. Anything added here would be downloaded with it.
 */

export { domAnimation as default } from 'framer-motion';
