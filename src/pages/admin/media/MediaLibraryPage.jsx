import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import FilterBar, { SEARCH_DEBOUNCE_MS } from '../../../components/admin/FilterBar';
import MediaAddUrlDialog from './MediaAddUrlDialog';
import MediaEditDrawer from './MediaEditDrawer';
import MediaGrid, { foldersOf } from './MediaGrid';
import MediaUploadZone from './MediaUploadZone';
import PageHeader from '../../../components/admin/PageHeader';
import mediaService from '../../../services/mediaService';
import useApiList from '../../../hooks/useApiList';
import useCloudinaryConfig from '../../../hooks/useCloudinaryConfig';
import useMediaUpload from './useMediaUpload';
import { Alert, Button, Pagination } from '../../../components/ui';
import { MEDIA_PROVIDERS, MEDIA_TYPES } from '../../../config/enums';
import { formatNumber } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './MediaLibraryPage.module.css';
import { TABLES, TOASTS } from '../../../config/adminCopy';

/** A page of tiles: two full rows on a desktop grid of six. */
export const MEDIA_PER_PAGE = 24;

/** What the grid asks for before anybody touches a control (§5.6). */
const LIST_DEFAULTS = {
  page: 1,
  perPage: MEDIA_PER_PAGE,
  sort: 'createdAt',
  order: 'desc',
  withUsage: true,
};

/** The parameters that live in the URL, and how each is serialised (§5.6). */
const PARAM_KEYS = {
  q: 'string',
  type: 'string',
  folder: 'string',
  provider: 'string',
  page: 'int',
  perPage: 'int',
  sort: 'string',
  order: 'string',
};

/** The message every screen shows when there is nothing to upload to (§7). */
export const NOT_CONFIGURED_HINT =
  'Configure Cloudinary in Settings → Integrations to enable uploads.';

/**
 * Admin → Media (`/admin/media`) — every picture, video and document the site
 * points at (§6.12).
 *
 * The library is metadata, not storage. A file arrives one of two ways: it is
 * uploaded straight to Cloudinary from this browser and the record follows
 * (D12), or it is already online somewhere and only the record is made. Both
 * ways exist on purpose — the second is the only one that works before a
 * client has given us a cloud name, and it is what every seed picture uses —
 * so "Add by URL" is never hidden and the upload half simply is not offered
 * until it can work.
 */
export default function MediaLibraryPage() {
  const toast = useToast();
  const { configured } = useCloudinaryConfig();

  const { items, meta, loading, error, params, setPage, setFilters, resetFilters, refetch } =
    useApiList((query, options) => mediaService.list(query, options), {
      syncToUrl: true,
      paramKeys: PARAM_KEYS,
      defaults: LIST_DEFAULTS,
      debounceMs: SEARCH_DEBOUNCE_MS,
    });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [folder, setFolder] = useState('');

  const folders = useMemo(() => foldersOf(items), [items]);

  const copy = useCallback(
    async (url) => {
      try {
        await navigator.clipboard.writeText(url ?? '');
        toast.success(TOASTS.copied('Address'));
      } catch (_thrown) {
        toast.error(TOASTS.addressCopyBlocked);
      }
    },
    [toast]
  );

  const onUploaded = useCallback(
    (records) => {
      toast.success(
        records.length === 1
          ? `“${records[0].title || records[0].alt}” is in the library.`
          : `${records.length} files are in the library.`
      );
      refetch();
    },
    [toast, refetch]
  );

  const queue = useMediaUpload({ folder, onUploaded });

  const filterFields = useMemo(
    () => [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Alt text, title or address' },
      {
        key: 'type',
        type: 'select',
        label: 'Type',
        placeholder: 'Any type',
        options: MEDIA_TYPES.options,
      },
      {
        key: 'folder',
        type: 'select',
        label: 'Folder',
        placeholder: 'Any folder',
        options: folders.map((name) => ({ value: name, label: name })),
      },
      {
        key: 'provider',
        type: 'select',
        label: 'Stored',
        placeholder: 'Anywhere',
        options: MEDIA_PROVIDERS.options,
      },
    ],
    [folders]
  );

  const filtered = Boolean(params.q || params.type || params.folder || params.provider);
  const total = meta?.total;
  const totalPages = meta?.totalPages ?? 1;

  const emptyState = useMemo(() => {
    if (params.page > 1) {
      return {
        title: TABLES.emptyPage,
        text: TABLES.emptyPageText,
      };
    }
    if (filtered) {
      return {
        title: 'No files match',
        text: 'Nothing in the library answers every filter you have set.',
        action: (
          <Button variant="outline" onClick={resetFilters}>
            {TABLES.resetFilters}
          </Button>
        ),
      };
    }
    return {
      title: 'The library is empty',
      text: configured
        ? 'Upload a file, or add one by its address if it is already online.'
        : 'Add a file by its address. Uploads need a Cloudinary cloud name in Settings → Integrations.',
      action: (
        <Button variant="primary" onClick={() => setUrlOpen(true)}>
          Add by URL
        </Button>
      ),
    };
  }, [params.page, filtered, resetFilters, configured]);

  return (
    <>
      <PageHeader
        title="Media library"
        count={total}
        subtitle="Every picture, video and document the site points at."
        actions={
          <>
            {configured ? (
              <Button
                variant={uploadOpen ? 'secondary' : 'primary'}
                aria-expanded={uploadOpen}
                icon={<Icon icon="mdi:tray-arrow-up" width="18" height="18" />}
                onClick={() => setUploadOpen((open) => !open)}
              >
                Upload
              </Button>
            ) : null}
            <Button
              variant={configured ? 'outline' : 'primary'}
              icon={<Icon icon="mdi:link-variant-plus" width="18" height="18" />}
              onClick={() => setUrlOpen(true)}
            >
              Add by URL
            </Button>
          </>
        }
      />

      <div className={styles.screen}>
        {configured ? null : (
          <Alert tone="info" title="Uploads are switched off">
            {NOT_CONFIGURED_HINT} Until then, add files by their address — everything else in the
            library works exactly the same.
          </Alert>
        )}

        {configured && uploadOpen ? (
          <MediaUploadZone
            queue={queue}
            folder={folder}
            folders={folders}
            onFolderChange={setFolder}
          />
        ) : null}

        <FilterBar
          fields={filterFields}
          values={params}
          onChange={setFilters}
          onReset={resetFilters}
        />

        <MediaGrid
          items={items}
          loading={loading}
          error={error}
          onRetry={refetch}
          emptyState={emptyState}
          onOpen={setEditing}
          onCopy={(item) => copy(item.url)}
          label="Media library"
        />

        {totalPages > 1 ? (
          <div className={styles.pager}>
            <p className={styles.pagerCount}>
              {typeof total === 'number'
                ? `${formatNumber(total)} ${total === 1 ? 'file' : 'files'}`
                : ''}
            </p>
            <Pagination
              page={params.page ?? 1}
              totalPages={totalPages}
              onChange={setPage}
              label="Media library pages"
            />
          </div>
        ) : null}
      </div>

      <MediaAddUrlDialog
        open={urlOpen}
        folder={folder}
        folders={folders}
        onClose={() => setUrlOpen(false)}
        onCreated={(record) => {
          toast.success(`“${record.title || record.alt}” is in the library.`);
          refetch();
        }}
      />

      <MediaEditDrawer
        item={editing}
        folders={folders}
        onCopy={copy}
        onClose={() => setEditing(null)}
        onSaved={() => {
          toast.success(TOASTS.saved('File'));
          setEditing(null);
          refetch();
        }}
        onDeleted={(record) => {
          toast.success(
            `“${record.title || record.alt}” is out of the library. The file itself is untouched.`
          );
          setEditing(null);
          refetch();
        }}
      />
    </>
  );
}
