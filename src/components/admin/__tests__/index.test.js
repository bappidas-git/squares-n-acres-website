import * as kit from '../index';

/**
 * The barrel is what every later admin prompt imports from, so a component that
 * is not exported here does not exist as far as they are concerned.
 */
const EXPECTED = [
  // the table and its parts
  'DataTable',
  'BulkActionsBar',
  'RowActions',
  'DeleteGuardDialog',
  // layout
  'FilterBar',
  'PageHeader',
  'FormSection',
  'FormColumn',
  'AdminTabs',
  'AdminTabPanel',
  // fields
  'StatusChip',
  'ImageField',
  'ImageHint',
  'MultiSelect',
  'SlugField',
  'SortableList',
  'EntityPicker',
  'ToneSelect',
  'IconPicker',
  // the generic screen
  'MasterDataPage',
  'useMasterDataCrud',
  'MasterDataForm',
  'FormFieldControl',
  // what was already here
  'Forbidden',
  'ProtectedRoute',
  'RoleRoute',
];

describe('the admin kit barrel', () => {
  it.each(EXPECTED)('exports %s', (name) => {
    expect(kit[name]).toBeDefined();
  });

  it('exports the constants the kit is configured with', () => {
    expect(kit.DEFAULT_PER_PAGE).toBe(20);
    expect(kit.PER_PAGE_OPTIONS).toEqual([10, 20, 50, 100]);
    expect(kit.SEARCH_DEBOUNCE_MS).toBe(400);
    expect(Object.keys(kit.IMAGE_HINTS)).toEqual(
      expect.arrayContaining(['gallery', 'floorPlan', 'logo', 'og', 'avatar', 'hero'])
    );
  });
});
