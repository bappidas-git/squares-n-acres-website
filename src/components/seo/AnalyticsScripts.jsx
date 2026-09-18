import { Helmet } from 'react-helmet-async';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { EVENTS, track } from '../../utils/analytics';
import { afterLoadIdle } from '../../utils/idle';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The measurement tags, injected once from `siteSettings.integrations` (§9.3).
 *
 * Three ids, three snippets, and nothing at all when an id is empty — which is
 * the seeded state, so a development build ships no third-party script unless
 * somebody has deliberately configured one.
 *
 * These are the **basic** tags: the vendor's own snippet, unchanged, with no
 * consent gate in front of it. A consent banner is a product decision nobody
 * has taken yet; when it is taken, it goes here, and this comment is how the
 * next reader knows the omission was noticed rather than forgotten.
 *
 * GA4 is configured with `send_page_view: false` and the page view is sent on
 * every route change instead. A single-page app fires one automatic page view
 * in its life — the first load — so leaving the default on would report a site
 * where nobody ever reads a second page.
 *
 * **Nothing is injected until the page has loaded** (prompt 41 §4.5). A tag
 * manager's container is a few hundred kilobytes of third-party JavaScript
 * that parses on the main thread, and a `gtag.js` in the head is a request
 * ahead of the hero image in the queue — both of them measured as this site's
 * Total Blocking Time and Largest Contentful Paint, neither of them anything
 * a visitor is waiting for. So the tags go in after `load`, in an idle slot
 * (`utils/idle.js`).
 *
 * The page view is **not** deferred with them. `track()` pushes onto
 * `window.dataLayer` whether or not a container is on the page, and a
 * container reads what is already in the array when it loads, so the first
 * page view is recorded at the moment it happens and delivered when the tag
 * arrives.
 *
 * Mounted once, in the app shell inside `SiteSettingsProvider`: Helmet
 * de-duplicates by tag, but a snippet mounted per route would re-run a tag
 * manager's container on every navigation.
 *
 * The admin panel is excluded. It is not the public site — `robots.txt`
 * disallows it and no page there links to it — and an editor spending a day in
 * the CMS would otherwise arrive in the client's analytics as their most
 * engaged visitor.
 */

/** `src/utils/analytics.js` bridges `track()` to whichever of these is on the page. */
const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js';
const GTM_SRC = 'https://www.googletagmanager.com/gtm.js';
const GTM_NOSCRIPT_SRC = 'https://www.googletagmanager.com/ns.html';
const PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

/** The `gtag.js` bootstrap, verbatim from Google, plus our one change. */
const gtagSnippet = (id) => `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { send_page_view: false });`;

/** Google Tag Manager's container loader, verbatim. */
const gtmSnippet = (id) => `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'${GTM_SRC}?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`;

/** Meta's pixel bootstrap, verbatim, with the automatic `PageView` kept. */
const pixelSnippet = (id) => `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script','${PIXEL_SRC}');
fbq('init', '${id}');
fbq('track', 'PageView');`;

/**
 * @param {object} props
 * @param {object} [props.integrations] defaults to `settings.integrations`
 */
export default function AnalyticsScripts({ integrations }) {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const [injected, setInjected] = useState(false);

  const admin = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const ids = admin ? {} : (integrations ?? settings?.integrations ?? {});
  const ga4 = String(ids.googleAnalyticsId ?? '').trim();
  const gtm = String(ids.googleTagManagerId ?? '').trim();
  const pixel = String(ids.facebookPixelId ?? '').trim();

  const path = `${location.pathname}${location.search}`;

  useEffect(() => {
    // The first load already has a title from the static HTML; by the time a
    // route change has painted, Helmet has written the page's own.
    if (!ga4 && !gtm && !pixel) return;
    track(EVENTS.pageView, {
      page_path: path,
      page_title: typeof document === 'undefined' ? undefined : document.title,
    });
  }, [path, ga4, gtm, pixel]);

  // The one thing that decides when a third-party script reaches the page.
  useEffect(() => {
    if (!ga4 && !gtm && !pixel) return undefined;
    return afterLoadIdle(() => setInjected(true));
  }, [ga4, gtm, pixel]);

  if (!ga4 && !gtm && !pixel) return null;
  if (!injected) return null;

  return (
    <>
      <Helmet>
        {ga4 ? <script async src={`${GTAG_SRC}?id=${encodeURIComponent(ga4)}`} /> : null}
        {ga4 ? <script>{gtagSnippet(ga4)}</script> : null}
        {gtm ? <script>{gtmSnippet(gtm)}</script> : null}
        {pixel ? <script>{pixelSnippet(pixel)}</script> : null}
        {pixel ? (
          <noscript>{`<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${encodeURIComponent(
            pixel
          )}&ev=PageView&noscript=1" />`}</noscript>
        ) : null}
      </Helmet>

      {gtm && typeof document !== 'undefined'
        ? createPortal(
            <noscript>
              <iframe
                title="Google Tag Manager"
                src={`${GTM_NOSCRIPT_SRC}?id=${encodeURIComponent(gtm)}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>,
            document.body
          )
        : null}
    </>
  );
}
