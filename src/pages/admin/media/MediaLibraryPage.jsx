import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import FilterBar, { SEARCH_DEBOUNCE_MS } from '../../../components/admin/FilterBar';
import MediaAddUrlDialog from './MediaAddUrlDialog';
import MediaEditDrawer from './MediaEditDrawer';
import MediaGrid, { libraryFolders } from './MediaGrid';
import MediaUploadZone from './MediaUploadZone';
import PageHeader from '../../../components/admin/PageHeader';
import mediaService from '../../../services/mediaService';
import useApiList from '../../../hooks/useApiList';
import useCloudinaryConfig from '../../../hooks/useCloudinaryConfig';
import useLingering from '../../../hooks/useLingering';
import useMediaUpload from './useMediaUpload';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
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

/** What leaving asks while files are still on their way (QA-63). */
const UPLOADING_QUESTION = {
  title: 'Leave while files are uploading?',
  message:
    'Leaving this page stops the files that are still uploading. The ones that have finished are already in the library.',
  confirmLabel: 'Leave and stop them',
  cancelLabel: 'Stay on this page',
};

/** The name a toast gives a file. */
const nameOf = (record) => record?.title || record?.alt || record?.url || 'The file';

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
 *
 * What QA-63 settled here: the Folder filter offers every folder in the
 * library (`meta.folders`), not the page's; a request that fails says so
 * instead of leaving the last answer on screen, and one on its way dims the
 * grid; paging brings the top of the new page into view; a removal that
 * empties a page steps back one; a batch of uploads is announced once, and
 * leaving while it runs asks first.
 */
export default function MediaLibraryPage() {
  const toast = useToast();
  const { configured } = useCloudinaryConfig();

  const {
    items,
    meta,
    loading,
    refreshing,
    error,
    params,
    setPage,
    setFilters,
    resetFilters,
    refetch,
  } = useApiList((query, options) => mediaService.list(query, options), {
    syncToUrl: true,
    paramKeys: PARAM_KEYS,
    defaults: LIST_DEFAULTS,
    debounceMs: SEARCH_DEBOUNCE_MS,
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // The drawer keeps its file while it slides away (QA-63).
  const [shownEditing, releaseEditing] = useLingering(editing);
  const [folder, setFolder] = useState('');

  const gridTopRef = useRef(null);

  // The page as last rendered, for the answers that land after it changed.
  const latest = useRef({ items, page: params.page ?? 1 });
  latest.current = { items, page: params.page ?? 1 };

  const folders = useMemo(
    () => libraryFolders(meta, items, params.folder),
    [meta, items, params.folder]
  );

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

  // A batch of uploads is announced once, and the grid read once, when the
  // last of it has finished (QA-63). Each file used to raise its own toast and
  // its own reload — eight files, eight toasts, eight reads of the library —
  // while each row of the queue already said "Added" on its own.
  const finished = useRef([]);
  const onUploaded = useCallback((records) => {
    finished.current.push(...records);
  }, []);

  const queue = useMediaUpload({ folder, onUploaded });

  useEffect(() => {
    if (queue.busy || finished.current.length === 0) return;
    const records = finished.current;
    finished.current = [];
    toast.success(
      records.length === 1
        ? `“${nameOf(records[0])}” is in the library.`
        : `${records.length} files are in the library.`
    );
    refetch();
  }, [queue.busy, toast, refetch]);

  // Leaving the page stops what is still uploading, so it asks first — and so
  // does closing or reloading the tab (QA-63).
  useUnsavedChanges(queue.busy, { question: UPLOADING_QUESTION });

  /** Pages, bringing the top of the grid back into view when it has scrolled away. */
  const changePage = useCallback(
    (next) => {
      setPage(next);
      const element = gridTopRef.current;
      if (!element) return;
      // The admin scrolls inside its canvas, under a sticky bar, so "out of
      // view" is measured against the canvas rather than the window.
      const canvas = element.closest('main');
      const top = canvas ? canvas.getBoundingClientRect().top : 0;
      if (element.getBoundingClientRect().top < top) {
        element.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      }
    },
    [setPage]
  );

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
  // An unanswered request has no count and no pages: the header and the pager
  // used to go on reading the last answer under an error (QA-63).
  const total = error ? undefined : meta?.total;
  const totalPages = error ? 1 : (meta?.totalPages ?? 1);

  const emptyState = useMemo(() => {
    if (params.page > 1) {
      return {
        title: TABLES.emptyPage,
        text: TABLES.emptyPageText,
        // With a single page left there is no pager to go back with (QA-63).
        action: (
          <Button variant="outline" onClick={() => changePage(1)}>
            {TABLES.firstPage}
          </Button>
        ),
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
  }, [params.page, filtered, resetFilters, configured, changePage]);

  /** Closes the drawer when it still shows `record` — not another file opened since. */
  const closeIfShowing = useCallback((record) => {
    setEditing((current) =>
      current && record && String(current.id) === String(record.id) ? null : current
    );
  }, []);

  /**
   * Reads the grid again after `record` left it, a page back when it was the
   * last file on a page after the first (QA-63): the list used to stay on
   * "Nothing on this page", page 17 of 16.
   */
  const refreshAfterRemoving = useCallback(
    (record) => {
      const { items: shown, page } = latest.current;
      const emptied =
        page > 1 && shown.length > 0 && shown.every((one) => String(one.id) === String(record.id));
      if (emptied) changePage(page - 1);
      else refetch();
    },
    [changePage, refetch]
  );

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

        <div ref={gridTopRef} className={styles.gridTop}>
          <FilterBar
            fields={filterFields}
            values={params}
            onChange={setFilters}
            onReset={resetFilters}
          />
        </div>

        <MediaGrid
          items={items}
          loading={loading}
          refreshing={refreshing}
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
              onChange={changePage}
              label="Media library pages"
            />
          </div>
        ) : null}
      </div>

      <MediaAddUrlDialog
        open={urlOpen}
        // A file added while one folder is on screen is filed there, so it
        // does not vanish from the view it was added in (QA-63).
        folder={folder || params.folder || ''}
        folders={folders}
        onClose={() => setUrlOpen(false)}
        onCreated={(record) => {
          toast.success(`“${nameOf(record)}” is in the library.`);
          refetch();
        }}
        // An address already in the library opens the file it belongs to.
        onExisting={setEditing}
      />

      <MediaEditDrawer
        open={Boolean(editing)}
        item={shownEditing}
        folders={folders}
        onCopy={copy}
        onClose={() => setEditing(null)}
        onExited={releaseEditing}
        onSaved={(record) => {
          toast.success(TOASTS.saved('File'));
          closeIfShowing(record);
          refetch();
        }}
        onDeleted={(record) => {
          toast.success(`“${nameOf(record)}” is out of the library. The file itself is untouched.`);
          closeIfShowing(record);
          refreshAfterRemoving(record);
        }}
        onGone={(record, action) => {
          const name = `“${nameOf(record)}”`;
          if (action === 'delete') toast.info(TOASTS.alreadyDeleted(name));
          else toast.error(TOASTS.gone(name));
          closeIfShowing(record);
          refreshAfterRemoving(record);
        }}
      />
    </>
  );
}
