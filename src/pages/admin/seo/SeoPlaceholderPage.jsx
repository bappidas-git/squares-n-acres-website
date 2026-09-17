import AdminPlaceholderPage from '../../../components/admin/AdminPlaceholderPage';

/**
 * `/admin/seo` until prompt 37 builds the dashboard.
 *
 * The screen the boilerplate had here read the old property shape through
 * `utils/seoScoring.js` and `utils/seoGenerator.js` and wrote the boilerplate's
 * own titles and canonicals (ADD-20, ADD-27). Prompt 35 replaced that engine
 * with `src/seo/`, so those three files are gone and this stands in their place:
 * the route, the title and the `seo · view` guard keep working, and prompt 37
 * fills this folder with the real dashboard — the overview table, the bulk
 * actions, the settings and the redirects.
 */
export default function SeoPlaceholderPage() {
  return <AdminPlaceholderPage title="SEO dashboard" prompt={37} />;
}
