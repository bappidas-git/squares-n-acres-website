import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { adminCrud, cities } from '../../../services/masterDataService';
import { formatDate } from '../../../utils/format';
import { schemas } from '../../../services/schemas';
import { useMasterData } from '../../../contexts/MasterDataContext';

const cityService = adminCrud(cities);

/**
 * Admin → Master data → Cities (`/admin/master-data/cities`).
 *
 * A city is four fields, so it is edited in the kit's dialog. Deleting one that
 * localities or properties still point at is refused by the API and the guard
 * dialog lists them (D88) — which is the whole reason this screen exists rather
 * than a text field on the locality form.
 */
export default function CitiesPage() {
  // A write here invalidates the master-data cache the public site reads (D93).
  const { refresh } = useMasterData();

  const config = useMemo(
    () => ({
      key: 'cities',
      title: 'Cities',
      singular: 'city',
      service: cityService,
      onMutated: refresh,
      schema: schemas['city.update'],
      createSchema: schemas['city.create'],
      slugBase: '/',
      defaultSort: { field: 'name', order: 'asc' },
      activeToggle: true,
      usageGuard: true,

      columns: [
        { key: 'name', label: 'Name', sortable: true, primary: true },
        { key: 'state', label: 'State' },
        { key: 'slug', label: 'Slug', hideBelow: 'md', mobile: false },
        {
          key: 'updatedAt',
          label: 'Updated',
          hideBelow: 'lg',
          mobile: false,
          render: (row) => formatDate(row.updatedAt),
        },
      ],

      filters: [
        { key: 'q', type: 'search', label: 'Search', placeholder: 'Name or state' },
        {
          key: 'isActive',
          type: 'toggle',
          label: 'Status',
          trueLabel: 'Active',
          falseLabel: 'Inactive',
          placeholder: 'Any status',
        },
      ],

      bulkActions: [
        { key: 'activate', label: 'Activate', icon: 'mdi:eye-outline' },
        { key: 'deactivate', label: 'Deactivate', icon: 'mdi:eye-off-outline' },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          confirm: {
            title: 'Delete the selected cities?',
            message:
              '{count} will be deleted. A city a locality or a property still points at is refused.',
          },
        },
      ],

      formFields: [
        { name: 'name', type: 'text', label: 'Name', required: true, half: true },
        { name: 'state', type: 'text', label: 'State', required: true, half: true },
        { name: 'slug', type: 'slug', label: 'URL', source: 'name' },
        { name: 'isActive', type: 'switch', label: 'Active' },
      ],

      newValues: { isActive: true },

      toFormValues: (record) => ({
        name: record.name ?? '',
        state: record.state ?? '',
        slug: record.slug ?? '',
        isActive: record.isActive !== false,
      }),

      emptyState: {
        title: 'No cities yet',
        text: 'Add the cities your localities and listings sit in.',
      },
    }),
    [refresh]
  );

  return <MasterDataPage config={config} />;
}
