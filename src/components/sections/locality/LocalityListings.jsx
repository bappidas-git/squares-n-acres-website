import { useMemo, useState } from 'react';

import ListingEngine from '../../listing/ListingEngine';
import PATHS from '../../../routes/paths';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { Tabs } from '../../ui';
import { PropertyGridSkeleton } from '../../common/SkeletonLoaders';

import styles from './LocalitySections.module.css';

/**
 * What is available in this locality, to buy and to rent.
 *
 * The full listing engine, embedded (D94): the same rail, the same facets and
 * the same sort a visitor gets on `/properties`, with the locality fixed and
 * shown as a locked chip they cannot remove. The temporary six-card row this
 * replaces linked away to the search instead.
 *
 * A tab with nothing behind it is not drawn — an empty "Rent" tab in a locality
 * nobody lets reads as a fault — and a locality with no listings at all leaves
 * the guide as it was.
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 */
export default function LocalityListings({ locality }) {
  const { id, name } = locality;
  const [tab, setTab] = useState('sale');

  // Two counting calls (`perPage=1`) decide which tabs exist; the engine itself
  // fetches the page of cards.
  const sale = useApi(
    (signal) =>
      propertyService.list({ localityId: id, listingType: 'sale', perPage: 1 }, { signal }),
    [id],
    { initialData: [] }
  );
  const rent = useApi(
    (signal) =>
      propertyService.list({ localityId: id, listingType: 'rent', perPage: 1 }, { signal }),
    [id],
    { initialData: [] }
  );

  const tabs = useMemo(
    () =>
      [
        { value: 'sale', label: `Buy (${sale.meta?.total ?? 0})`, total: sale.meta?.total ?? 0 },
        { value: 'rent', label: `Rent (${rent.meta?.total ?? 0})`, total: rent.meta?.total ?? 0 },
      ].filter((entry) => entry.total > 0),
    [sale.meta, rent.meta]
  );

  const active = tabs.some((entry) => entry.value === tab) ? tab : tabs[0]?.value;

  const routeConfig = useMemo(
    () => ({
      key: `locality-${locality.slug}`,
      path: PATHS.locality(locality.slug),
      fixed: {},
      noun: 'Properties',
      breadcrumbs: [],
    }),
    [locality.slug]
  );

  const fixedParams = useMemo(
    () => ({ localityId: [String(id)], listingType: active }),
    [id, active]
  );

  if (sale.loading || rent.loading) {
    return (
      <section className={styles.block} aria-busy="true">
        <h2 className={styles.blockTitle}>Listings in {name}</h2>
        <PropertyGridSkeleton count={3} />
      </section>
    );
  }

  // A failed count leaves the guide intact: the rest of the page is worth
  // reading, and the search is one click away in the header.
  if (sale.error || rent.error || tabs.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="locality-properties">
      <h2 className={styles.blockTitle} id="locality-properties">
        Listings in {name}
      </h2>

      {tabs.length > 1 ? (
        <Tabs
          items={tabs}
          value={active}
          onChange={setTab}
          label={`Properties in ${name}`}
          className={styles.listingTabs}
        />
      ) : null}

      <ListingEngine
        embedded
        routeConfig={routeConfig}
        fixedParams={fixedParams}
        headingLevel={null}
      />
    </section>
  );
}
