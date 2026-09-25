import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import FilterBar, { SEARCH_DEBOUNCE_MS } from './FilterBar';
import MediaGrid, { libraryFolders } from '../../pages/admin/media/MediaGrid';
import MediaUploadZone from '../../pages/admin/media/MediaUploadZone';
import Modal from '../ui/Modal';
import Pagination from '../ui/Pagination';
import Tabs from '../ui/Tabs';
import mediaService from '../../services/mediaService';
import useApiList from '../../hooks/useApiList';
import useCloudinaryConfig from '../../hooks/useCloudinaryConfig';
import useMediaUpload from '../../pages/admin/media/useMediaUpload';
import { MEDIA_TYPES } from '../../config/enums';
import { MediaUrlForm } from '../../pages/admin/media/MediaAddUrlDialog';

import styles from './MediaPickerDialog.module.css';

/** A page of tiles inside a dialog: one screenful, not two. */
const PICKER_PER_PAGE = 18;

/**
 * The fields a picked file hands back to a form.
 *
 * Deliberately not the whole record: a property image row, a page block and the
 * editor's figure all want the same five things, and none of them wants the
 * library's own bookkeeping (§2, §5).
 *
 * @param {object} record a `media` row
 * @returns {{url: string, alt: string, title: string, width: number|null,
 *            height: number|null, id: string|number}}
 */
export const toSelection = (record) => ({
  id: record.id,
  url: record.url,
  alt: record.alt ?? '',
  title: record.title ?? '',
  width: record.width ?? null,
  height: record.height ?? null,
});

/**
 * The media library, in a dialog, for every field that needs a file.
 *
 * It is the same grid as `/admin/media` because it is the same library —
 * an editor who has filed a photograph should find it in the same place with
 * the same filters, not in a second, simpler list that behaves differently.
 * What it adds is choosing: a tile toggles, `multiple` keeps the order the
 * tiles were pressed in (so "select two" appends them in that order, §7), and
 * the footer says how many are held.
 *
 * Three tabs, and the middle one is conditional: Library always, Upload only
 * when Cloudinary is configured (§7 — a button that cannot work is not
 * offered), URL always, because a link is the one way in that never needs
 * configuring. An upload selects itself when it finishes, which is what
 * somebody who just dragged a file in meant to happen.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(items: Array<ReturnType<typeof toSelection>>) => void} props.onSelect
 * @param {boolean} [props.multiple]
 * @param {'image'|'document'|'video'|'any'} [props.accept]
 * @param {string} [props.folder] pre-selects the folder filter and files uploads there
 * @param {'library'|'upload'|'url'} [props.defaultTab] where it opens
 * @param {string} [props.title]
 */
export default function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  multiple = false,
  accept = 'image',
  folder = '',
  defaultTab = 'library',
  title,
}) {
  const { configured } = useCloudinaryConfig();
  const [tab, setTab] = useState(defaultTab);
  const [picked, setPicked] = useState([]);
  const [uploadFolder, setUploadFolder] = useState(folder);

  const fixedParams = useMemo(
    () => ({
      perPage: PICKER_PER_PAGE,
      sort: 'createdAt',
      order: 'desc',
      ...(accept === 'any' ? null : { type: accept }),
    }),
    [accept]
  );

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
    // Never the URL: the dialog's filters are not the page's filters, and a
    // picker opened over a half-filled form must not rewrite its address.
    syncToUrl: false,
    defaults: { page: 1, q: '', folder },
    fixedParams,
    debounceMs: SEARCH_DEBOUNCE_MS,
  });

  // A dialog that reopens is a fresh choice, not the last one continued — and
  // it opens on the tab its trigger asked for, so "Upload" lands on Upload in
  // the first render rather than a frame later. Adjusting during render (the
  // React pattern) rather than in an effect is what makes that true.
  const [session, setSession] = useState({ open: false, defaultTab, folder });
  if (open !== session.open || defaultTab !== session.defaultTab || folder !== session.folder) {
    setSession({ open, defaultTab, folder });
    setUploadFolder(folder);
    if (open) setTab(defaultTab);
    else setPicked([]);
  }

  // Every folder in the library, not the page's (QA-63).
  const folders = useMemo(
    () => libraryFolders(meta, items, params.folder),
    [meta, items, params.folder]
  );

  // The grid scrolls inside the dialog, and the pager sits under it: the next
  // page used to open where the last one ended (QA-63).
  const gridScrollRef = useRef(null);
  const changePage = useCallback(
    (next) => {
      setPage(next);
      if (gridScrollRef.current) gridScrollRef.current.scrollTop = 0;
    },
    [setPage]
  );

  const toggle = useCallback(
    (record) => {
      const selection = toSelection(record);
      if (!multiple) {
        onSelect?.([selection]);
        onClose?.();
        return;
      }
      setPicked((current) =>
        current.some((one) => String(one.id) === String(record.id))
          ? current.filter((one) => String(one.id) !== String(record.id))
          : [...current, selection]
      );
    },
    [multiple, onSelect, onClose]
  );

  const onUploaded = useCallback(
    (records) => {
      refetch();
      const selections = records.map(toSelection);
      if (!multiple) {
        onSelect?.(selections.slice(0, 1));
        onClose?.();
        return;
      }
      setPicked((current) => [
        ...current,
        ...selections.filter(
          (one) => !current.some((existing) => String(existing.id) === String(one.id))
        ),
      ]);
    },
    [refetch, multiple, onSelect, onClose]
  );

  const queue = useMediaUpload({ folder: uploadFolder, accept, onUploaded });

  const confirm = () => {
    if (picked.length === 0) return;
    onSelect?.(picked);
    onClose?.();
  };

  const filterFields = useMemo(() => {
    const fields = [
      { key: 'q', type: 'search', label: 'Search', placeholder: 'Alt text, title or address' },
      {
        key: 'folder',
        type: 'select',
        label: 'Folder',
        placeholder: 'Any folder',
        options: folders.map((name) => ({ value: name, label: name })),
      },
    ];
    // With `accept` fixed to one type there is nothing to choose between.
    if (accept === 'any') {
      fields.splice(1, 0, {
        key: 'type',
        type: 'select',
        label: 'Type',
        placeholder: 'Any type',
        options: MEDIA_TYPES.options,
      });
    }
    return fields;
  }, [folders, accept]);

  // An unanswered request has no pages to offer (QA-63).
  const totalPages = error ? 1 : (meta?.totalPages ?? 1);

  const tabs = [
    { value: 'library', label: 'Library' },
    ...(configured ? [{ value: 'upload', label: 'Upload' }] : []),
    { value: 'url', label: 'By URL' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? (multiple ? 'Choose files' : 'Choose a file')}
      size="lg"
      mobile="fullscreen"
      footer={
        <>
          <span className={styles.footerCount} aria-live="polite">
            {multiple && picked.length > 0
              ? `${picked.length} selected`
              : multiple
                ? 'Nothing selected yet'
                : ''}
          </span>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {multiple ? (
            <Button variant="primary" disabled={picked.length === 0} onClick={confirm}>
              {picked.length > 0 ? `Select ${picked.length}` : 'Select'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className={styles.picker}>
        <Tabs items={tabs} value={tab} onChange={setTab} label="How to choose a file" />

        {tab === 'library' ? (
          <>
            <FilterBar
              fields={filterFields}
              values={params}
              onChange={setFilters}
              onReset={resetFilters}
            />

            <div className={styles.gridScroll} ref={gridScrollRef}>
              <MediaGrid
                items={items}
                loading={loading}
                refreshing={refreshing}
                error={error}
                onRetry={refetch}
                selectable
                selectedIds={picked.map((one) => one.id)}
                onOpen={toggle}
                label="Files you can choose"
                emptyState={{
                  title: 'Nothing to choose from',
                  text: configured
                    ? 'Upload a file, or add one by its address, on the tabs above.'
                    : 'Add a file by its address on the tab above.',
                  action: (
                    <Button variant="outline" onClick={() => setTab(configured ? 'upload' : 'url')}>
                      {configured ? 'Upload a file' : 'Add by URL'}
                    </Button>
                  ),
                }}
              />
            </div>

            {totalPages > 1 ? (
              <Pagination
                page={params.page ?? 1}
                totalPages={totalPages}
                onChange={changePage}
                label="Pages of files"
              />
            ) : null}
          </>
        ) : null}

        {tab === 'upload' ? (
          <MediaUploadZone
            queue={queue}
            accept={accept}
            folder={uploadFolder}
            folders={folders}
            onFolderChange={setUploadFolder}
          />
        ) : null}

        {tab === 'url' ? (
          <MediaUrlForm
            folder={uploadFolder}
            folders={folders}
            submitLabel={multiple ? 'Add and select' : 'Use this file'}
            onCreated={(record) => onUploaded([record])}
          />
        ) : null}

        {multiple && picked.length > 0 ? (
          <ul className={styles.chosen} aria-label="Files you have selected">
            {picked.map((one, index) => (
              <li key={one.id}>
                <span className={styles.chosenIndex}>{index + 1}</span>
                <span className={styles.chosenName}>{one.title || one.alt || one.url}</span>
                <button
                  type="button"
                  className={styles.chosenRemove}
                  aria-label={`Remove ${one.title || one.alt || one.url} from the selection`}
                  onClick={() =>
                    setPicked((current) =>
                      current.filter((each) => String(each.id) !== String(one.id))
                    )
                  }
                >
                  <Icon icon="mdi:close" width="16" height="16" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
