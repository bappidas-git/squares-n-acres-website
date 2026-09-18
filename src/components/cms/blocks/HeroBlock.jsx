import PageHero from '../PageHero';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';

/**
 * The page's opening band (§6.10 `hero`).
 *
 * The heading is the block's own or, left blank, the page title — a page
 * always has an `<h1>`, and it is always this one (§9.7). The button follows
 * its link, unless the block names a lead source, in which case it opens the
 * enquiry dialog instead: a "Talk to an advisor" that scrolls somewhere is
 * worse than one that asks the question.
 *
 * @param {object} props
 * @param {object} props.data
 * @param {object} props.page the record being rendered
 * @param {Array<{label: string, to?: string}>} [props.breadcrumbs]
 */
export default function HeroBlock({ data = {}, page = {}, breadcrumbs = [] }) {
  const { openLeadModal, leadTriggerProps } = useLeadCapture();

  const entry = data.leadSource || page.leadSource || null;
  const label = data.ctaLabel?.trim();

  const action = label
    ? data.ctaHref
      ? { label, href: data.ctaHref }
      : entry
        ? {
            label,
            onClick: () => openLeadModal({ entry, pageSlug: page.slug }),
            ...leadTriggerProps,
          }
        : null
    : null;

  return (
    <PageHero
      title={data.title?.trim() || page.title}
      subtitle={data.subtitle}
      imageUrl={data.imageUrl || page.heroImageUrl}
      breadcrumbs={breadcrumbs}
      action={action}
    />
  );
}
