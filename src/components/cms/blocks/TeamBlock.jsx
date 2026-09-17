import { useMemo } from 'react';

import TeamSection from '../../sections/shared/TeamSection';
import masterDataService from '../../../services/masterDataService';
import useApi from '../../../hooks/useApi';
import { Container, Section } from '../../ui';

/**
 * The advisors (§6.10 `team`).
 *
 * With no ids the block asks for everyone marked "Show on About", which is the
 * setting an editor already maintains under Content → Team; with ids it asks
 * for exactly those, in the order they were picked.
 */
export default function TeamBlock({ data = {}, background = 'bg' }) {
  const ids = Array.isArray(data.memberIds) ? data.memberIds : [];
  const idsKey = ids.join(',');

  const params = useMemo(
    () => (idsKey ? { ids: idsKey, perPage: ids.length } : { showOnAbout: true, perPage: 24 }),
    [idsKey, ids.length]
  );

  const { data: fetched } = useApi(
    (signal) => masterDataService.team.list(params, { signal }),
    [params],
    { initialData: [] }
  );

  const members = Array.isArray(fetched) ? fetched : [];
  if (members.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        <TeamSection items={members} title={data.title || ''} />
      </Container>
    </Section>
  );
}
