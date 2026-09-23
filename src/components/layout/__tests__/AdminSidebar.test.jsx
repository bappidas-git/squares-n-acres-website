/**
 * The admin sidebar says where the reader is (prompt 12, §7 guard 2).
 */

import { screen } from '@testing-library/react';

import AdminSidebar, { activeChildPath, NAV_OPEN_STORAGE_KEY } from '../AdminSidebar';
import renderWith from '../../../test-utils';
import storage from '../../../utils/storage';

jest.mock('../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({ role: 'admin' }),
}));

jest.mock('../../../contexts/LeadNotificationsContext', () => ({
  useLeadNotifications: () => ({ newLeadCount: 0 }),
}));

const PROPERTY_CHILDREN = [
  { label: 'All properties', path: '/admin/properties' },
  { label: 'Add property', path: '/admin/properties/add' },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe('activeChildPath', () => {
  it('puts the edit screen of a listing under "All properties"', () => {
    expect(activeChildPath(PROPERTY_CHILDREN, '/admin/properties/edit/20')).toBe(
      '/admin/properties'
    );
  });

  it('prefers the longest match, so the add screen is "Add property"', () => {
    expect(activeChildPath(PROPERTY_CHILDREN, '/admin/properties/add')).toBe(
      '/admin/properties/add'
    );
  });

  it('matches segment by segment, not by prefix of characters', () => {
    expect(activeChildPath(PROPERTY_CHILDREN, '/admin/property-types')).toBeNull();
    expect(activeChildPath(PROPERTY_CHILDREN, '/admin/properties/')).toBe('/admin/properties');
  });
});

describe('AdminSidebar', () => {
  it('opens the group the page belongs to and marks its child as current', () => {
    renderWith(<AdminSidebar />, { initialEntries: ['/admin/properties/edit/20'] });

    const group = screen.getByRole('button', { name: /Properties/ });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'All properties' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Add property' })).not.toHaveAttribute('aria-current');
    expect(storage.getItem(NAV_OPEN_STORAGE_KEY, {})).toMatchObject({ Properties: true });
  });

  it('marks "Add property", and only it, on the add screen', () => {
    renderWith(<AdminSidebar />, { initialEntries: ['/admin/properties/add'] });

    expect(screen.getByRole('link', { name: 'Add property' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'All properties' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});
