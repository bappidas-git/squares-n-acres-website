/**
 * The filter row of the admin lead table, and the directory it assigns from
 * (§5.14, §6.7, §7).
 *
 * Every filter here is one `GET /admin/leads` answers, so the list of keys is
 * at once what `FilterBar` shows, what `useApiList` keeps in the query string
 * and what the CSV export repeats — a filtered table, a shared link and a
 * downloaded file are the same view three ways.
 *
 * The sales scope of D15 is the server's (a sales user's list is already only
 * their own and the unassigned leads); what changes here is the vocabulary
 * offered: they filter by "Me" and "Unassigned", the two states their work
 * actually has, while an admin or a manager can also pick a colleague.
 */

import { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import useApi from '../../../hooks/useApi';
import userService from '../../../services/userService';
import { LEAD_FOLLOW_UP, LEAD_PRIORITY, LEAD_SOURCES, LEAD_STATUS } from '../../../config/enums';

/** What the table asks for before anybody touches a control (§5.6, D47). */
export const LEAD_LIST_DEFAULTS = {
  page: 1,
  perPage: DEFAULT_PER_PAGE,
  sort: 'createdAt',
  order: 'desc',
};

/**
 * The query parameters that live in the URL, and how each is serialised
 * (§5.6). `status` and `source` are the multi-value ones, so they are the two
 * read back as lists.
 */
export const LEAD_LIST_PARAM_KEYS = {
  q: 'string',
  status: 'csv',
  source: 'csv',
  priority: 'string',
  assignedTo: 'string',
  propertyId: 'string',
  from: 'string',
  to: 'string',
  // The worklist (prompt 51).
  followUp: 'string',
  idleDays: 'int',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

/** The keys that narrow the list, as opposed to paging or ordering it. */
export const LEAD_FILTER_KEYS = [
  'q',
  'status',
  'source',
  'priority',
  'assignedTo',
  'propertyId',
  'from',
  'to',
  'followUp',
  'idleDays',
];

const isSet = (value) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);

/**
 * Whether the view is narrowed at all — the difference between "no leads
 * match" and "no leads yet" (§8.2).
 *
 * @param {object} params
 * @returns {boolean}
 */
export const hasActiveFilters = (params = {}) => LEAD_FILTER_KEYS.some((key) => isSet(params[key]));

/**
 * The parameters `GET /admin/leads/export` repeats: the filters and the order
 * of the table as it stands.
 *
 * There is no `perPage`: the export endpoint writes every matching row by
 * definition, and a page size in the query would only invite the reader to
 * believe otherwise.
 *
 * @param {object} params
 * @returns {object}
 */
export function exportParamsOf(params = {}) {
  const query = { sort: params.sort, order: params.order };
  for (const key of LEAD_FILTER_KEYS) {
    if (isSet(params[key])) query[key] = params[key];
  }
  return query;
}

/**
 * The people a lead can be handed to.
 *
 * `leads.assign` is admin and manager; a sales user claims rather than
 * assigns (D89) and never sees this list, so the request is not made for them
 * — `/admin/users` would refuse it anyway (§7).
 *
 * @param {{enabled?: boolean}} [options]
 * @returns {{users: Array<object>, loading: boolean}}
 */
export function useAssignableUsers({ enabled = true } = {}) {
  const { data, loading } = useApi(
    (signal) => userService.list({ perPage: 'all', isActive: true }, { signal }),
    [],
    { enabled, initialData: [] }
  );

  return { users: Array.isArray(data) ? data : [], loading };
}

/**
 * Everyone who has held leads — the deactivated colleagues too, for the
 * Assigned filter (prompt 51): the leads of somebody who has left are exactly
 * the ones that need finding, and an active-only list hid them.
 *
 * @param {{enabled?: boolean}} [options]
 * @returns {{users: Array<object>, loading: boolean}}
 */
export function useLeadDirectory({ enabled = true } = {}) {
  const { data, loading } = useApi(
    (signal) => userService.list({ perPage: 'all' }, { signal }),
    [],
    { enabled, initialData: [] }
  );

  return { users: Array.isArray(data) ? data : [], loading };
}

/**
 * `Me`, `Unassigned` and — for the roles that may assign — every colleague,
 * a deactivated one as "Ravi (inactive)".
 */
export function assigneeOptions({ users = [], canAssign = false } = {}) {
  const options = [
    { value: 'me', label: 'Me' },
    { value: 'unassigned', label: 'Unassigned' },
  ];
  if (!canAssign) return options;

  return [
    ...options,
    ...users.map((user) => ({
      value: String(user.id),
      label: user.isActive === false ? `${user.name} (inactive)` : user.name,
    })),
  ];
}

/**
 * The `FilterBar` fields, in the order they appear.
 *
 * The property filter is a `custom` one: a catalogue of listings is searched
 * rather than scrolled, so the screen hands in an `EntityPicker` instead of
 * the options for a `<select>` nobody could read (§6 of prompt 13). Its chip is
 * named by `propertyTitle`, since only the screen knows what the listing is
 * called; without a chip the filter counted for nothing, so a list narrowed to
 * one listing offered no Reset (QA-53).
 *
 * @param {object} [sources]
 * @param {Array<object>} [sources.users] the assignable colleagues
 * @param {boolean} [sources.canAssign] false for a sales user
 * @param {(api: {values: object, onChange: Function, labelClassName: string,
 *   fieldClassName: string}) => React.ReactNode} [sources.renderProperty]
 * @param {(id: string) => string|null} [sources.propertyTitle] the chosen listing's title
 * @returns {Array<object>}
 */
export function buildLeadFilterFields({
  users = [],
  canAssign = false,
  renderProperty,
  propertyTitle,
} = {}) {
  return [
    {
      key: 'q',
      type: 'search',
      label: 'Search',
      placeholder: 'Name, phone, e-mail or message',
    },
    {
      key: 'status',
      type: 'multiselect',
      label: 'Status',
      placeholder: 'Any status',
      options: LEAD_STATUS.options,
    },
    {
      key: 'source',
      type: 'multiselect',
      label: 'Source',
      placeholder: 'Any source',
      options: LEAD_SOURCES.options,
    },
    {
      key: 'priority',
      type: 'select',
      label: 'Priority',
      placeholder: 'Any priority',
      options: LEAD_PRIORITY.options,
    },
    {
      key: 'assignedTo',
      type: 'select',
      label: 'Assigned',
      placeholder: 'Anyone',
      options: assigneeOptions({ users, canAssign }),
    },
    {
      key: 'followUp',
      type: 'select',
      label: 'Follow-up',
      placeholder: 'Any follow-up',
      options: LEAD_FOLLOW_UP.options,
    },
    {
      key: 'created',
      type: 'daterange',
      label: 'Created',
      keys: ['from', 'to'],
    },
    ...(renderProperty
      ? [
          {
            key: 'propertyId',
            type: 'custom',
            label: 'Property',
            width: '260px',
            render: renderProperty,
            chipLabel: (values) =>
              `Property: ${propertyTitle?.(values.propertyId) ?? `#${values.propertyId}`}`,
          },
        ]
      : []),
  ];
}
