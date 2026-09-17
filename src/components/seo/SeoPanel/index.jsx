import { Suspense, lazy } from 'react';

import Skeleton from '../../ui/Skeleton';

/**
 * The SEO panel, loaded only when a form actually shows one.
 *
 * The panel is the second-heaviest thing in the admin after the editor — four
 * tabs, three previews, the analysis engine and its word lists — and six forms
 * import it. Reaching it through a dynamic import gives it a chunk of its own,
 * fetched the first time an editor opens an SEO tab, and keeps its stylesheet
 * out of the admin chunks that the kit's own CSS is ordered in. A stylesheet
 * spanning that boundary is exactly what makes the extracted CSS order
 * ambiguous (`components/editor/RichTextField.jsx` documents the same rule).
 *
 * Every prop is forwarded untouched; see `SeoPanel.jsx` for the contract. The
 * §9.6 value helpers — `createSeo`, `withSeoDefaults`, `toSeoPayload`,
 * `toSeoPaths` — are **not** re-exported here on purpose: a form's payload
 * needs them without needing the panel, and they live in
 * `components/seo/seoValues.js`.
 */

const SeoPanel = lazy(() => import('./SeoPanel'));

export default function LazySeoPanel(props) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading the SEO panel" aria-live="polite">
          <Skeleton variant="rounded" height={44} sx={{ marginBottom: 'var(--space-3)' }} />
          <Skeleton variant="rounded" height={420} />
        </div>
      }
    >
      <SeoPanel {...props} />
    </Suspense>
  );
}
