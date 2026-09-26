import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import BulkActionsBar from '../../../components/admin/BulkActionsBar';
import DeleteGuardDialog from '../../../components/admin/DeleteGuardDialog';
import FilterBar, { SEARCH_DEBOUNCE_MS } from '../../../components/admin/FilterBar';
import FolderRail from './FolderRail';
import ManageFoldersDialog from './ManageFoldersDialog';
import MediaAddUrlDialog from './MediaAddUrlDialog';
import MediaEditDrawer from './MediaEditDrawer';
import MediaGrid, { libraryFolders, libraryUnfiled } from './MediaGrid';
import MediaUploadZone from './MediaUploadZone';
import MoveFilesDialog from './MoveFilesDialog';
import NewFolderDialog from './NewFolderDialog';
import PageHeader from '../../../components/admin/PageHeader';
import PATHS from '../../../routes/paths';
import mediaService from '../../../services/mediaService';
import useApiList from '../../../hooks/useApiList';
import useCloudinaryConfig from '../../../hooks/useCloudinaryConfig';
import useLingering from '../../../hooks/useLingering';
import useMediaUpload from './useMediaUpload';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { Alert, Button, Pagination } from '../../../components/ui';
import { MEDIA_PROVIDERS, MEDIA_TYPES } from '../../../config/enums';
import { firstFieldMessage } from '../../../services/apiError';
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
  unfiled: 'bool',
  usage: 'string',
  provider: 'string',
  page: 'int',
  perPage: 'int',
  sort: 'string',
  order: 'string',
};

/** The message every screen shows when there is nothing to upload to (§7). */
export const NOT_CONFIGURED_HINT =
  'Configure Cloudinary in Settings → Integrations to enable uploads.';

/** Where the Cloudinary walkthrough and its "Test uploads" live (prompt 51). */
export const INTEGRATIONS_PATH = `${PATHS.adminSettings}?tab=integrations`;

/** What leaving asks while files are still on their way (QA-63). */
const UPLOADING_QUESTION = {
  title: 'Leave while files are uploading?',
  message:
    'Leaving this page stops the files that are still uploading. The ones that have finished are already in the library.',
  confirmLabel: 'Leave and stop them',
  cancelLabel: 'Stay on this page',
};

/** What the selection can do (prompt 51). */
const BULK_ACTIONS = [
  { key: 'move', label: 'Move to folder', icon: 'mdi:folder-move-outline' },
  {
    key: 'delete',
    label: 'Remove from library',
    icon: 'mdi:delete-outline',
    danger: true,
    confirm: {
      title: 'Remove {count} from the library?',
      message:
        'Only the library entries go — each file stays where it is hosted. A file something on the site still shows is not removed: you are shown where it is used first.',
    },
  },
];

/** The name a toast gives a file. */
const nameOf = (record) => record?.title || record?.alt || record?.url || 'The file';

/** "1 file", "3 files". */
const filesOf = (count) => `${formatNumber(count)} ${count === 1 ? 'file' : 'files'}`;

/** "was" or "were", for a count. */
const wasWere = (count) => (count === 1 ? 'was' : 'were');

/** Whether two ids name the same record, whatever their type. */
const sameId = (left, right) => String(left) === String(right);

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
 * What QA-63 settled here: the folders on offer are every folder in the
 * library (`meta.folders`), not the page's; a request that fails says so
 * instead of leaving the last answer on screen, and one on its way dims the
 * grid; paging brings the top of the new page into view; a removal that
 * empties a page steps back one; a batch of uploads is announced once, and
 * leaving while it runs asks first.
 *
 * What prompt 51 added: the folders sit in a rail beside the grid with their
 * counts, "New folder" makes one before any upload, "Manage" renames them, a
 * select mode moves or removes many files at once, and "Only files nothing
 * uses" finds what a cleanup can take.
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
  // Where uploads go: `null` follows the folder on screen until the editor
  // chooses another one in the upload zone.
  const [uploadFolder, setUploadFolder] = useState(null);
  // Folders made on this page that no file is filed in yet — client state
  // only, which the New folder dialog says (prompt 51).
  const [pending, setPending] = useState([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  // Select mode (prompt 51).
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const anchor = useRef(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const [shownBlocked, releaseBlocked] = useLingering(blocked);

  const gridTopRef = useRef(null);

  // The page as last rendered, for the answers that land after it changed.
  const latest = useRef({ items, page: params.page ?? 1 });
  latest.current = { items, page: params.page ?? 1 };

  // Every folder in the library with its count (QA-63, prompt 51).
  const listed = useMemo(() => libraryFolders(meta, items), [meta, items]);
  const unfiled = libraryUnfiled(meta);
  const pendingShown = useMemo(
    () => pending.filter((name) => !listed.some((entry) => entry.name === name)),
    [pending, listed]
  );
  // The rail: the listed folders, and the one on screen when it holds nothing
  // the other filters let through and is not one just made.
  const railFolders = useMemo(
    () =>
      params.folder && !pendingShown.includes(params.folder)
        ? libraryFolders(meta, items, params.folder)
        : listed,
    [meta, items, params.folder, pendingShown, listed]
  );
  // What a folder field offers: every folder, and the ones just made.
  const folderChoices = useMemo(
    () => [...listed, ...pendingShown.map((name) => ({ name, count: 0 }))],
    [listed, pendingShown]
  );

  // A folder made here stops being "pending" once a file is filed in it.
  useEffect(() => {
    if (pending.some((name) => listed.some((entry) => entry.name === name))) {
      setPending((current) =>
        current.filter((name) => !listed.some((entry) => entry.name === name))
      );
    }
  }, [pending, listed]);

  const uploadTarget = uploadFolder ?? params.folder ?? '';

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

  const queue = useMediaUpload({ folder: uploadTarget, onUploaded });

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

  // A selection never outlives the page it was made on: paging on or
  // narrowing the view drops the files that left it, as the tables do.
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const onPage = new Set(items.map((item) => String(item.id)));
    const kept = selectedIds.filter((id) => onPage.has(String(id)));
    if (kept.length !== selectedIds.length) setSelectedIds(kept);
  }, [items, selectedIds]);

  const stopSelecting = useCallback(() => {
    setSelecting(false);
    setSelectedIds([]);
    anchor.current = null;
  }, []);

  // Escape leaves select mode — unless it was meant for a dialog.
  useEffect(() => {
    if (!selecting) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target?.closest?.('[role="dialog"], [role="presentation"]')) return;
      stopSelecting();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selecting, stopSelecting]);

  /** A tile pressed in select mode: toggles it, or selects the run to it with Shift. */
  const toggleSelected = useCallback((item, event) => {
    const ids = latest.current.items.map((one) => one.id);
    if (event?.shiftKey && anchor.current !== null) {
      const from = ids.findIndex((id) => sameId(id, anchor.current));
      const to = ids.findIndex((id) => sameId(id, item.id));
      if (from !== -1 && to !== -1) {
        const run = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        setSelectedIds((current) => [
          ...current,
          ...run.filter((id) => !current.some((one) => sameId(one, id))),
        ]);
        return;
      }
    }
    anchor.current = item.id;
    setSelectedIds((current) =>
      current.some((one) => sameId(one, item.id))
        ? current.filter((one) => !sameId(one, item.id))
        : [...current, item.id]
    );
  }, []);

  /** Picks a folder, "No folder" or every file. */
  const chooseFolder = useCallback(
    ({ folder, unfiled: onlyUnfiled }) => setFilters({ folder, unfiled: onlyUnfiled }),
    [setFilters]
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
        key: 'provider',
        type: 'select',
        label: 'Stored',
        placeholder: 'Anywhere',
        options: MEDIA_PROVIDERS.options,
      },
    ],
    []
  );

  const filtered = Boolean(
    params.q || params.type || params.folder || params.unfiled || params.usage || params.provider
  );
  // An unanswered request has no count and no pages: the header and the pager
  // used to go on reading the last answer under an error (QA-63).
  const total = error ? undefined : meta?.total;
  const totalPages = error ? 1 : (meta?.totalPages ?? 1);
  const pendingOnScreen = Boolean(params.folder) && pendingShown.includes(params.folder);

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
    if (pendingOnScreen) {
      return {
        title: `“${params.folder}” is ready for its first file`,
        text: 'Until a file is filed in it, the folder lives only on this page — it is not kept if you leave first.',
        action: configured ? (
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            Upload into it
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setUrlOpen(true)}>
            Add a file by URL
          </Button>
        ),
      };
    }
    if (params.usage === 'unused') {
      return {
        title: 'Every file here is in use',
        text: 'Each file in this view is shown somewhere on the site, so there is nothing to clean up.',
        action: (
          <Button variant="outline" onClick={() => setFilters({ usage: undefined })}>
            Show every file
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
  }, [
    params.page,
    params.folder,
    params.usage,
    pendingOnScreen,
    filtered,
    resetFilters,
    setFilters,
    configured,
    changePage,
  ]);

  /** Closes the drawer when it still shows `record` — not another file opened since. */
  const closeIfShowing = useCallback((record) => {
    setEditing((current) =>
      current && record && String(current.id) === String(record.id) ? null : current
    );
  }, []);

  /**
   * Reads the grid again after `ids` left it, a page back when they were every
   * file on a page after the first (QA-63): the list used to stay on "Nothing
   * on this page", page 17 of 16.
   */
  const refreshAfterRemoving = useCallback(
    (ids) => {
      const { items: shown, page } = latest.current;
      const gone = new Set(ids.map(String));
      const emptied =
        page > 1 && shown.length > 0 && shown.every((one) => gone.has(String(one.id)));
      if (emptied) changePage(page - 1);
      else refetch();
    },
    [changePage, refetch]
  );

  /** "New folder": kept on this page until a file lands in it (prompt 51). */
  const createFolder = (name) => {
    setNewFolderOpen(false);
    if (!listed.some((entry) => entry.name === name)) {
      setPending((current) => (current.includes(name) ? current : [...current, name]));
    }
    setFilters({ folder: name, unfiled: undefined });
    setUploadFolder(name);
    if (configured) setUploadOpen(true);
    else setUrlOpen(true);
  };

  /** A rename refiles the folder on screen too, and the upload target with it. */
  const onRenamed = (result) => {
    const moved = (folder) =>
      folder && (folder === result.from || folder.startsWith(`${result.from}/`))
        ? `${result.to}${folder.slice(result.from.length)}`
        : null;
    const onScreen = moved(params.folder);
    if (uploadFolder && moved(uploadFolder)) setUploadFolder(moved(uploadFolder));
    if (onScreen) setFilters({ folder: onScreen });
    else refetch();
  };

  /** The selection, removed from the library — all or nothing (QA-63). */
  const removeSelected = async (ids, { force = false } = {}) => {
    setBulkBusy(true);
    try {
      const response = await mediaService.bulk({ ids, action: 'delete' }, { force });
      const affected = response?.data?.affected ?? 0;
      setBlocked(null);
      setSelectedIds([]);
      if (affected === 0) toast.info('Those files had already left the library.');
      else
        toast.success(
          `Removed ${filesOf(affected)} from the library. The files themselves are untouched.`
        );
      refreshAfterRemoving(ids);
    } catch (thrown) {
      if (thrown?.status === 409) {
        setBlocked({
          ids,
          message: thrown.message,
          refused: thrown.data?.refused ?? [],
          usedBy: thrown.data?.usedIn ?? thrown.data?.usedBy ?? [],
        });
      } else {
        toast.error(firstFieldMessage(thrown, 'The files could not be removed. Try again.'));
      }
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * The selection, refiled (prompt 51). Files that had gone are named, not a
   * reason to stop; and when the move empties the folder on screen, the view
   * follows the files to where they went.
   */
  const moveSelected = async (folder) => {
    const ids = selectedIds;
    setBulkBusy(true);
    try {
      const response = await mediaService.move(ids, folder);
      const affected = response?.data?.affected ?? 0;
      const missing = Array.isArray(response?.data?.missing) ? response.data.missing.length : 0;
      const already = Math.max(0, ids.length - affected - missing);
      const where = folder ? `“${folder}”` : 'no folder';

      if (affected === 0 && missing === 0) {
        toast.info(`${ids.length === 1 ? 'That file is' : 'Those files are'} in ${where} already.`);
      } else if (affected === 0) {
        toast.warning(
          `Nothing moved — ${formatNumber(missing)} of the files ${wasWere(missing)} no longer in the library.`
        );
      } else {
        const notes = [
          missing > 0
            ? `${formatNumber(missing)} ${wasWere(missing)} no longer in the library.`
            : '',
          already > 0 ? `${formatNumber(already)} ${wasWere(already)} there already.` : '',
        ].filter(Boolean);
        const message = [`Moved ${filesOf(affected)} to ${where}.`, ...notes].join(' ');
        if (missing > 0) toast.warning(message);
        else toast.success(message);
      }

      setMoveOpen(false);
      setSelectedIds([]);
      if (folder) setPending((current) => current.filter((name) => name !== folder));

      // The folder on screen, emptied: follow the files.
      const shownCount = params.unfiled
        ? unfiled
        : (railFolders.find((entry) => entry.name === params.folder)?.count ?? null);
      const emptied =
        (params.folder || params.unfiled) && shownCount !== null && affected >= shownCount;
      if (emptied && affected > 0) {
        setFilters(folder ? { folder, unfiled: undefined } : { folder: undefined, unfiled: true });
      } else {
        refetch();
      }
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The files could not be moved. Try again.'));
    } finally {
      setBulkBusy(false);
    }
  };

  const selectionCount = selectedIds.length;

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
            library works exactly the same.{' '}
            <Link to={INTEGRATIONS_PATH}>Set up Cloudinary uploads</Link>
          </Alert>
        )}

        {configured && uploadOpen ? (
          <MediaUploadZone
            queue={queue}
            folder={uploadTarget}
            folders={folderChoices}
            onFolderChange={(next) => setUploadFolder(next ?? '')}
          />
        ) : null}

        <div className={styles.layout}>
          <FolderRail
            folders={railFolders}
            unfiled={unfiled}
            pending={pendingShown}
            folder={params.folder ?? ''}
            unfiledOnly={params.unfiled === true}
            onChange={chooseFolder}
            onNewFolder={() => setNewFolderOpen(true)}
            onManage={() => setManageOpen(true)}
            unusedOnly={params.usage === 'unused'}
            onUnusedChange={(on) => setFilters({ usage: on ? 'unused' : undefined })}
          />

          <div className={styles.main}>
            <div ref={gridTopRef} className={styles.gridTop}>
              <FilterBar
                fields={filterFields}
                values={params}
                onChange={setFilters}
                onReset={resetFilters}
              />
            </div>

            <div className={styles.toolbar}>
              <p className={styles.toolbarNote} aria-live="polite">
                {selecting && selectionCount === 0 ? (
                  <>
                    <span className={styles.toolbarCount}>Nothing selected yet</span> — press files
                    to select them; Shift selects a run. Esc leaves select mode.
                  </>
                ) : selecting ? (
                  'Shift selects a run. Esc leaves select mode.'
                ) : null}
              </p>
              <Button
                variant={selecting ? 'secondary' : 'outline'}
                size="sm"
                aria-pressed={selecting}
                icon={<Icon icon="mdi:checkbox-multiple-outline" width="16" height="16" />}
                disabled={!selecting && items.length === 0}
                onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              >
                {selecting ? 'Done selecting' : 'Select'}
              </Button>
            </div>

            {selecting ? (
              <BulkActionsBar
                selectedIds={selectedIds}
                actions={BULK_ACTIONS}
                busy={bulkBusy}
                nounOne="file"
                nounMany="files"
                onClear={() => setSelectedIds([])}
                onAction={(key, ids) => {
                  if (key === 'move') setMoveOpen(true);
                  else if (key === 'delete') removeSelected(ids);
                }}
              />
            ) : null}

            <MediaGrid
              items={items}
              loading={loading}
              refreshing={refreshing}
              error={error}
              onRetry={refetch}
              emptyState={emptyState}
              onOpen={selecting ? toggleSelected : setEditing}
              onCopy={selecting ? undefined : (item) => copy(item.url)}
              selectable={selecting}
              checkboxes={selecting}
              selectedIds={selectedIds}
              label="Media library"
              className={styles.gridWithRail}
            />

            {totalPages > 1 ? (
              <div className={styles.pager}>
                <p className={styles.pagerCount}>
                  {typeof total === 'number' ? filesOf(total) : ''}
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
        </div>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        existing={folderChoices}
        uploadsOn={configured}
        onClose={() => setNewFolderOpen(false)}
        onCreate={createFolder}
      />

      <ManageFoldersDialog
        open={manageOpen}
        folders={listed}
        onClose={() => setManageOpen(false)}
        onRenamed={onRenamed}
      />

      <MoveFilesDialog
        open={moveOpen}
        count={selectionCount}
        folders={folderChoices}
        current={params.folder ?? ''}
        busy={bulkBusy}
        onClose={() => setMoveOpen(false)}
        onMove={moveSelected}
      />

      <DeleteGuardDialog
        open={Boolean(blocked)}
        heading="Still in use — nothing was removed"
        title="These files"
        message={shownBlocked?.message}
        refused={shownBlocked?.refused ?? []}
        usedBy={shownBlocked?.usedBy ?? []}
        hint="Take each file out of the records above, or remove the library entries anyway: the files stay where they are hosted, and the pages that show them keep working."
        confirmLabel="Remove them anyway"
        loading={bulkBusy}
        onClose={() => setBlocked(null)}
        onExited={releaseBlocked}
        onConfirm={() => {
          if (shownBlocked) removeSelected(shownBlocked.ids, { force: true });
        }}
      />

      <MediaAddUrlDialog
        open={urlOpen}
        // A file added while one folder is on screen is filed there, so it
        // does not vanish from the view it was added in (QA-63).
        folder={uploadTarget}
        folders={folderChoices}
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
        folders={folderChoices}
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
          refreshAfterRemoving([record.id]);
        }}
        onGone={(record, action) => {
          const name = `“${nameOf(record)}”`;
          if (action === 'delete') toast.info(TOASTS.alreadyDeleted(name));
          else toast.error(TOASTS.gone(name));
          closeIfShowing(record);
          refreshAfterRemoving([record.id]);
        }}
      />
    </>
  );
}
