import { Helmet } from 'react-helmet-async';

import CustomHtml from './CustomHtml';
import JsonLd from './JsonLd';
import useSeoResolved from './useSeoResolved';

/**
 * The head of every page on this site (§9.2, §9.3).
 *
 * One component, because the alternative is what this replaces: twelve pages
 * each writing their own `<Helmet>`, agreeing on the title and disagreeing on
 * everything else — half of them with no canonical, none of them with a social
 * card, and the structured data nowhere at all.
 *
 * What it puts in the head, in the order a reader of the rendered page will
 * find it: `<html lang>`, the title, the description, the canonical, the robots
 * directive, the Open Graph and Twitter cards, `article:*` where there is an
 * article, `rel=prev`/`rel=next` where there is a series, the feed on the blog
 * routes, the search engines' verification tags, the favicons and the browser
 * chrome, whatever an administrator has put in `customHeadHtml`, and one
 * `<script type="application/ld+json">` holding the whole page's `@graph` —
 * the last of those written by `JsonLd.jsx` rather than by Helmet, for the
 * reason that file documents.
 *
 * What it does **not** do is decide any of it: `useSeoResolved` does, and it is
 * where the rules and their tests live.
 *
 * @param {object} props
 * @param {'home'|'property'|'listing'|'locality'|'localities'|'developer'|'builders'|
 *   'article'|'articleCategory'|'articleTag'|'author'|'blog'|'faqs'|'page'|'jobs'|
 *   'job'|'search'|'shortlist'|'notFound'|'error'|'admin'} props.type what kind of
 *   page this is (`seoDefaults.js`)
 * @param {object} [props.entity] the record, with its §9.6 `seo` branch
 * @param {string} [props.title] the page's own name — it goes **through** the
 *   type's title template, so most pages want this one
 * @param {string} [props.description] the page's own summary
 * @param {{title?: string, description?: string, canonical?: string, robots?: object,
 *   og?: object, twitter?: object, noindex?: boolean}} [props.overrides] — here
 *   `title` is the finished `<title>`, used verbatim (§9.3)
 * @param {object} [props.variables] extra template variables (`count`, `page`)
 * @param {Array<{name: string, path?: string}>} [props.breadcrumbs] the trail
 *   `<Breadcrumbs>` is drawing, from `seo/breadcrumbs.js`
 * @param {{prev?: string, next?: string}} [props.pagination]
 * @param {{src: string, ratio?: string, sizes?: string, fit?: 'cover'|'contain'}}
 *   [props.preloadImage] the page's LCP image — a property's cover, an
 *   article's featured image, a locality's or builder's hero. It is named in
 *   the head as `<link rel="preload" as="image">` with the same candidate list
 *   `LazyImage` will publish, so the download starts with the stylesheet
 *   rather than after the route's chunk has rendered (§8.6)
 * @param {Array<{question: string, answer: string}>} [props.faqs] the questions
 *   this page actually shows, which may be more than the record stores
 * @param {Array<{name?: string, title?: string, url?: string}>} [props.items] what
 *   this page is a list of
 * @param {Array<object>} [props.testimonials] only genuine ones are published (D41)
 * @param {object|Array<object>} [props.jsonLd] extra graphs to merge
 */
export default function Seo(props) {
  const seo = useSeoResolved(props);

  return (
    <>
      <Helmet htmlAttributes={{ lang: seo.lang }}>
        <title>{seo.title}</title>
        {seo.description ? <meta name="description" content={seo.description} /> : null}
        <meta name="robots" content={seo.robots} />
        {seo.canonical ? <link rel="canonical" href={seo.canonical} /> : null}

        <meta property="og:type" content={seo.og.type} />
        <meta property="og:site_name" content={seo.og.siteName} />
        <meta property="og:locale" content={seo.og.locale} />
        {seo.og.title ? <meta property="og:title" content={seo.og.title} /> : null}
        {seo.og.description ? (
          <meta property="og:description" content={seo.og.description} />
        ) : null}
        {seo.og.url ? <meta property="og:url" content={seo.og.url} /> : null}
        {seo.og.image ? <meta property="og:image" content={seo.og.image} /> : null}

        <meta name="twitter:card" content={seo.twitter.card} />
        {seo.twitter.title ? <meta name="twitter:title" content={seo.twitter.title} /> : null}
        {seo.twitter.description ? (
          <meta name="twitter:description" content={seo.twitter.description} />
        ) : null}
        {seo.twitter.image ? <meta name="twitter:image" content={seo.twitter.image} /> : null}

        {seo.articleMeta?.publishedTime ? (
          <meta property="article:published_time" content={seo.articleMeta.publishedTime} />
        ) : null}
        {seo.articleMeta?.modifiedTime ? (
          <meta property="article:modified_time" content={seo.articleMeta.modifiedTime} />
        ) : null}
        {seo.articleMeta?.author ? (
          <meta property="article:author" content={seo.articleMeta.author} />
        ) : null}
        {seo.articleMeta?.section ? (
          <meta property="article:section" content={seo.articleMeta.section} />
        ) : null}
        {(seo.articleMeta?.tags ?? []).map((tag) => (
          <meta key={`tag-${tag}`} property="article:tag" content={tag} />
        ))}

        {/* Spread rather than named props: `useSeoResolved` has already
            dropped the keys that do not apply, and Helmet writes every prop it
            is handed — a named `imagesrcset={undefined}` becomes an empty
            `imagesrcset=""`, which is a candidate list with nothing in it. */}
        {seo.preload ? (
          <link rel="preload" as="image" fetchpriority="high" {...seo.preload} />
        ) : null}

        {seo.links.prev ? <link rel="prev" href={seo.links.prev} /> : null}
        {seo.links.next ? <link rel="next" href={seo.links.next} /> : null}
        {seo.links.rss ? (
          <link
            rel="alternate"
            type="application/rss+xml"
            title={`${seo.og.siteName} — insights`}
            href={seo.links.rss}
          />
        ) : null}

        {seo.verification.map((meta) => (
          <meta key={meta.name} name={meta.name} content={meta.content} />
        ))}

        {seo.icons.map((icon) => (
          <link key={`${icon.rel}-${icon.sizes ?? 'default'}`} {...icon} />
        ))}
        <meta name="theme-color" content={seo.themeColor} />
        <meta name="application-name" content={seo.applicationName} />
      </Helmet>

      <CustomHtml />
      <JsonLd graph={seo.jsonLd} />
    </>
  );
}
