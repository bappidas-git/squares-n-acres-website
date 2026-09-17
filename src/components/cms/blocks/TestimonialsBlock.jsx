import { useEffect, useMemo, useRef } from 'react';

import TestimonialsSection from '../../sections/shared/TestimonialsSection';
import masterDataService from '../../../services/masterDataService';
import useApi from '../../../hooks/useApi';
import { Container, Section } from '../../ui';

/**
 * Client quotes (§6.10 `testimonials`).
 *
 * With no ids the block shows the featured ones. `TestimonialsSection` drops
 * the seeded samples from a production build (D41) and hides itself when
 * nothing survives, so an unfilled library leaves no empty band behind.
 *
 * `onItems` reports what was fetched to the page above, which publishes the
 * genuine ones as `Review` nodes (§9.3). The block is the only thing that knows
 * *which* testimonials this page shows, and asking for them a second time in
 * the page would be the duplicate request D93 exists to prevent.
 *
 * @param {object} props
 * @param {object} props.data the block's §6.10 data
 * @param {'bg'|'surface'} [props.background]
 * @param {(items: Array<object>) => void} [props.onItems]
 */
export default function TestimonialsBlock({ data = {}, background = 'surface', onItems }) {
  const ids = Array.isArray(data.ids) ? data.ids : [];
  const idsKey = ids.join(',');

  const params = useMemo(
    () => (idsKey ? { ids: idsKey, perPage: ids.length } : { isFeatured: true, perPage: 9 }),
    [idsKey, ids.length]
  );

  const { data: fetched } = useApi(
    (signal) => masterDataService.testimonials.list(params, { signal }),
    [params],
    { initialData: [] }
  );

  const items = useMemo(() => (Array.isArray(fetched) ? fetched : []), [fetched]);

  // Through a ref, so a page passing an inline arrow does not re-run this on
  // every render it causes (the pattern `SafeHtml` uses for its questions).
  const report = useRef(onItems);
  report.current = onItems;
  useEffect(() => {
    report.current?.(items);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <TestimonialsSection items={items} title={data.title || ''} />
      </Container>
    </Section>
  );
}
