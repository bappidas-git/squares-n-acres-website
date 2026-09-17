import PartnersSection from '../../sections/home/PartnersSection';

/**
 * Partner logos (§6.10 `partners`).
 *
 * `PartnersSection` owns the request, the marquee and the reduced-motion grid;
 * the block only says which category — if any — the page wants.
 */
export default function PartnersBlock({ data = {} }) {
  return (
    <PartnersSection
      category={data.category || undefined}
      title={data.title || 'Our partners'}
      subtitle=""
    />
  );
}
