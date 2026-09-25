import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PropertyCard from '../../common/PropertyCard';
import propertyService from '../../../services/propertyService';
import styles from './PropertyRow.module.css';
import useApi from '../../../hooks/useApi';
import useDeferredSection from '../../../hooks/useDeferredSection';
import { Carousel, Container, Section, SectionHeader } from '../../ui';
import { HOME } from '../../../config/copy';
import { PropertyCardSkeleton } from '../../common/SkeletonLoaders';

/**
 * One row of listings on the home page: Featured, New launches, Ready to move,
 * Rentals — the same component four times, differing only by the filters it
 * sends and the words above it.
 *
 * The row hides itself below `minItems` (three by default). A carousel of one
 * card is not a carousel, and a heading over an almost-empty rail tells a
 * visitor the site has nothing rather than that this particular cut of it has
 * nothing (§7).
 *
 * "View all" carries the row's own filters, so the listing it lands on is the
 * same search this row is a window onto.
 *
 * The request waits until the row is nearly on screen
 * (`useDeferredSection`, §8.6). Four of these bands on one page is four
 * `GET /properties` calls, and on a phone three of them are a scroll away from
 * mattering — while the hero image they would have queued behind is the
 * number Lighthouse reports as LCP.
 */

/** The home rows show eight (D23). */
const PER_PAGE = 8;

/** The most any rail asks for: the §8.6 cap on the items of one page. */
const MAX_PER_PAGE = 24;

/**
 * The featured row shows every featured listing, up to that cap.
 *
 * Featuring a listing is an editor asking for it on the home page. Cut at
 * eight, the row showed the eight with the highest priority and nothing else:
 * the seed already features ten, so a listing featured from the list's star or
 * the form's switch was featured in the admin and under "View all", and never
 * in the row itself (QA-62).
 */
export const FEATURED_PER_PAGE = MAX_PER_PAGE;

/** Cards per view, by breakpoint (§8.1). */
const ITEMS_PER_VIEW = { xs: 1.15, sm: 2, md: 3, lg: 4 };

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {object} [props.params] `GET /properties` filters (§5.7)
 * @param {boolean} [props.featured] read `GET /properties/featured` instead
 * @param {string} props.viewAllHref
 * @param {number} [props.minItems] below this many results the row is absent
 */
export default function PropertyRow({
  title,
  subtitle = '',
  params,
  featured = false,
  viewAllHref,
  minItems = 3,
}) {
  // A hand-picked set (the CMS block's `ids`) says how many it holds; eight
  // used to override it, so the ninth pick and every one after it vanished.
  const request = useMemo(() => {
    const own = Number(params?.perPage);
    const perPage = Number.isInteger(own) && own > 0 ? Math.min(own, MAX_PER_PAGE) : PER_PAGE;
    return { ...(params ?? {}), perPage };
  }, [params]);
  const { ref, ready } = useDeferredSection();

  const { data, loading, error } = useApi(
    (signal) =>
      featured
        ? propertyService.featured({ perPage: FEATURED_PER_PAGE }, { signal })
        : propertyService.list(request, { signal }),
    [featured, request],
    { enabled: ready, initialData: [] }
  );

  const properties = Array.isArray(data) ? data : [];

  // The skeleton is also what a row that has not been scrolled to looks like,
  // and it is the element the observer watches — a row that rendered nothing
  // would never come into view and would never ask for anything.
  if (!ready || loading) {
    return (
      <Section background="bg" spacing="lg" aria-busy="true" ref={ref}>
        <Container>
          <SectionHeader title={title} subtitle={subtitle} />
          <div className={styles.skeletons}>
            {Array.from({ length: 4 }, (_, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        </Container>
      </Section>
    );
  }

  // A row that cannot be filled is not a row: no error state, no empty state,
  // no heading — the page simply goes on to the next band.
  if (error || properties.length < minItems) return null;

  return (
    <Section background="bg" spacing="lg" ref={ref}>
      <Container>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          action={
            <Link to={viewAllHref} className={styles.viewAll}>
              {HOME.viewAll}
              <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
            </Link>
          }
        />

        <Carousel itemsPerView={ITEMS_PER_VIEW} label={title} className={styles.rail}>
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </Carousel>
      </Container>
    </Section>
  );
}
