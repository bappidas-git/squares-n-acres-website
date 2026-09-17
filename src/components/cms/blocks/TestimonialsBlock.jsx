import { useMemo } from 'react';

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
 */
export default function TestimonialsBlock({ data = {}, background = 'surface' }) {
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

  const items = Array.isArray(fetched) ? fetched : [];
  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <TestimonialsSection items={items} title={data.title || ''} />
      </Container>
    </Section>
  );
}
