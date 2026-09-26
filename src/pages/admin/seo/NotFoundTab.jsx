import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import Chip from '../../../components/ui/Chip';
import DataTable from '../../../components/admin/DataTable';
import PATHS from '../../../routes/paths';
import seoService from '../../../services/seoService';
import useApi from '../../../hooks/useApi';
import { firstFieldMessage } from '../../../services/apiError';
import { formatNumber, formatRelative } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SeoDashboardPage.module.css';

/** Lines per page of the list. */
const PER_PAGE = 20;

/**
 * Where "Create redirect" goes: the redirects screen, its form open on the
 * address — the redirects screen reads `?create=`.
 *
 * @param {string} path
 * @returns {string}
 */
export const createRedirectLink = (path) =>
  `${PATHS.adminRedirects}?create=${encodeURIComponent(path)}`;

/**
 * SEO → 404s (prompt 51): the addresses visitors reached that answered "not
 * found", reported by the site's 404 page — the most reached first, with the
 * days they were reached on, when last and the page that linked there. Each
 * is one click from a redirect; one a redirect now answers says where it goes,
 * and any can be dismissed (a new visit lists it again).
 *
 * @param {object} props
 * @param {boolean} [props.canEdit] may create redirects and dismiss lines
 */
export default function NotFoundTab({ canEdit = false }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [dismissing, setDismissing] = useState(null);

  const { data, meta, loading, error, refetch } = useApi(
    (signal) => seoService.notFoundList({ page, perPage: PER_PAGE }, { signal }),
    [page],
    {
      initialData: [],
    }
  );

  const dismiss = async (line) => {
    setDismissing(line.id);
    try {
      await seoService.dismissNotFound(line.id);
      toast.success(`${line.path} is off the list until a visitor reaches it again.`);
      refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The address could not be dismissed.'));
    } finally {
      setDismissing(null);
    }
  };

  const columns = [
    {
      key: 'path',
      label: 'Address',
      primary: true,
      render: (line) => (
        <span className={styles.notFoundPath}>
          <code>{line.path}</code>
          {line.redirectedTo ? (
            <Chip tone="success" size="sm">
              Redirected to {line.redirectedTo}
            </Chip>
          ) : null}
        </span>
      ),
    },
    {
      key: 'count',
      label: 'Visits',
      align: 'right',
      width: '90px',
      mobile: true,
      render: (line) => formatNumber(line.count),
    },
    {
      key: 'days',
      label: 'Days',
      align: 'right',
      width: '80px',
      hideBelow: 'md',
      render: (line) => formatNumber(line.days),
    },
    {
      key: 'lastSeenAt',
      label: 'Last reached',
      width: '150px',
      mobile: true,
      render: (line) => formatRelative(line.lastSeenAt),
    },
    {
      key: 'referrer',
      label: 'Linked from',
      hideBelow: 'md',
      render: (line) =>
        line.referrer ? (
          <span className={styles.notFoundReferrer} title={line.referrer}>
            {line.referrer}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  const rowActions = canEdit
    ? (line) => [
        ...(line.redirectedTo
          ? []
          : [
              {
                key: 'redirect',
                label: `Create a redirect for ${line.path}`,
                icon: 'mdi:directions-fork',
                onClick: () => navigate(createRedirectLink(line.path)),
              },
            ]),
        {
          key: 'dismiss',
          label: `Dismiss ${line.path}`,
          icon: 'mdi:close-circle-outline',
          disabled: dismissing === line.id,
          onClick: () => dismiss(line),
        },
      ]
    : undefined;

  return (
    <DataTable
      columns={columns}
      rows={Array.isArray(data) ? data : []}
      meta={meta}
      loading={loading}
      error={error}
      onRetry={refetch}
      onPageChange={setPage}
      rowActions={rowActions}
      rowActionsLabel={(line) => `Actions for ${line.path}`}
      getRowId={(line) => line.id}
      caption="Addresses visitors reached that answered 404, the most reached first"
      emptyState={{
        icon: <Icon icon="mdi:link-variant-off" width="28" height="28" />,
        title: 'No missing addresses yet',
        text: 'The site’s 404 page reports every address a visitor reaches that has no page. They are listed here, the most reached first, each one click from a redirect.',
      }}
    />
  );
}
