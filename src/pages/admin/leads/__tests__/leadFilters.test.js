/**
 * The lead table's filter vocabulary (prompt 51): the worklist travels with a
 * shared link and the CSV, and a colleague who has left is still somebody whose
 * leads can be found.
 */

import {
  LEAD_FILTER_KEYS,
  assigneeOptions,
  buildLeadFilterFields,
  exportParamsOf,
  hasActiveFilters,
} from '../leadFilters';

const USERS = [
  { id: 2, name: 'Manager User', isActive: true },
  { id: 4, name: 'Ravi', isActive: false },
];

describe('leadFilters', () => {
  it('names a deactivated colleague as inactive in the Assigned filter', () => {
    expect(assigneeOptions({ users: USERS, canAssign: true })).toEqual([
      { value: 'me', label: 'Me' },
      { value: 'unassigned', label: 'Unassigned' },
      { value: '2', label: 'Manager User' },
      { value: '4', label: 'Ravi (inactive)' },
    ]);
    // A sales user filters by the two states their own work has.
    expect(assigneeOptions({ users: USERS, canAssign: false })).toHaveLength(2);
  });

  it('keeps the worklist in the view, the shared link and the export', () => {
    expect(LEAD_FILTER_KEYS).toEqual(expect.arrayContaining(['followUp', 'idleDays']));
    expect(hasActiveFilters({ followUp: 'overdue' })).toBe(true);
    expect(
      exportParamsOf({ followUp: 'today', idleDays: 7, sort: 'createdAt', order: 'desc' })
    ).toEqual({ sort: 'createdAt', order: 'desc', followUp: 'today', idleDays: 7 });
  });

  it('offers the follow-up buckets as a filter', () => {
    const field = buildLeadFilterFields().find((entry) => entry.key === 'followUp');
    expect(field.options.map((option) => option.value)).toEqual([
      'overdue',
      'today',
      'next7',
      'none',
    ]);
  });
});
