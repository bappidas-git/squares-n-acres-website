import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Switch from '@mui/material/Switch';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import HeaderMenuDialog from './HeaderMenuDialog';
import IconButton from '../../../components/ui/IconButton';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import SortableList from '../../../components/admin/SortableList';
import headerMenuService from '../../../services/headerMenuService';
import pageService from '../../../services/pageService';
import useApi from '../../../hooks/useApi';
import useLingering from '../../../hooks/useLingering';
import { HEADER_MENU_SOURCES } from '../../../config/enums';
import { Skeleton } from '../../../components/ui';
import { firstFieldMessage } from '../../../services/apiError';
import { isGeneratedMenu } from '../../../config/headerMenus';
import { resetNavPagesCache } from '../../../hooks/useNavPages';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useHeaderMenus } from './pagesAdmin';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './HeaderMenusPage.module.css';

/** "3 pages · 1 link · 2 submenus", leaving out what is not there. */
function contentsOf(menu, pages) {
  const placed = pages.filter((page) => page.showInHeader && page.headerMenu === menu.slug);
  const live = placed.filter((page) => page.status === 'published').length;
  const parts = [];
  if (placed.length > 0) {
    parts.push(
      `${placed.length} ${placed.length === 1 ? 'page' : 'pages'}${
        live < placed.length ? ` (${placed.length - live} draft)` : ''
      }`
    );
  }
  const links = (menu.links ?? []).length;
  if (links > 0) parts.push(`${links} ${links === 1 ? 'link' : 'links'}`);
  const submenus = (menu.submenus ?? []).length;
  if (submenus > 0) parts.push(`${submenus} ${submenus === 1 ? 'submenu' : 'submenus'}`);
  return parts;
}

/**
 * Admin → Pages → Header menu (`/admin/pages/menus`, QA-56).
 *
 * The header's menus were a list in `config/navigation.js`, and a page could
 * join three of them. Here they are records: left to right in the order of
 * this list — dragged, or moved with the arrows — each shown or hidden, each
 * with its submenus, its links and the pages placed in it, and any number of
 * new ones beside them. The three generated menus (Buy, Rent, Commercial) keep
 * the columns master data gives them and take pages and links on top; they
 * cannot be deleted, only hidden. Deleting any other menu takes its pages out
 * of the header — the pages themselves stay published at their addresses.
 */
export default function HeaderMenusPage() {
  const toast = useToast();
  const { can } = useAdminAuth();
  const canEdit = can('content', 'edit');
  const canDelete = can('content', 'delete');

  const { menus: loaded, loading, error, refetch } = useHeaderMenus();
  const {
    data: pageData,
    loading: pagesLoading,
    refetch: refetchPages,
  } = useApi(
    (signal) => pageService.adminList({ perPage: 'all', sort: 'order', order: 'asc' }, { signal }),
    [],
    { initialData: [] }
  );
  const pages = useMemo(() => (Array.isArray(pageData) ? pageData : []), [pageData]);

  // The list as drawn: a move or a switch shows at once, and the API's answer
  // replaces it when it lands (or puts it back when the write fails).
  const [menus, setMenus] = useState(loaded);
  useEffect(() => setMenus(loaded), [loaded]);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shownEditing, releaseEditing] = useLingering(editing);
  const [shownDeleting, releaseDeleting] = useLingering(deleting);

  /** After any write: the lists again, and the site's cached menus dropped (D93). */
  const settle = useCallback(() => {
    resetNavPagesCache();
    refetch();
    refetchPages();
  }, [refetch, refetchPages]);

  const setShown = async (menu, isActive) => {
    setMenus((current) =>
      current.map((entry) => (entry.id === menu.id ? { ...entry, isActive } : entry))
    );
    try {
      await headerMenuService.patch(menu.id, { isActive });
      toast.success(
        isActive ? `“${menu.name}” is back in the header.` : `“${menu.name}” is hidden.`
      );
      settle();
    } catch (thrown) {
      setMenus(loaded);
      toast.error(firstFieldMessage(thrown, 'The menu could not be changed.'));
    }
  };

  /**
   * One `PATCH { order }` on the menu that travelled, placing it where the one
   * it landed on sits — the API settles the rest to `1..n` (§5.8, D98).
   */
  const reorder = async (next, move) => {
    const menu = move?.item;
    const neighbour = move ? menus[move.to] : null;
    if (!menu || !neighbour) return;

    setMenus(next);
    const anchor = Number(neighbour.order) || move.to + 1;
    const order = move.to < move.from ? anchor : anchor + 1;
    try {
      await headerMenuService.patch(menu.id, { order });
      settle();
    } catch (thrown) {
      setMenus(loaded);
      toast.error(firstFieldMessage(thrown, 'The new order could not be saved.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await headerMenuService.remove(deleting.id);
      toast.success(`“${deleting.name}” deleted.`);
      setDeleting(null);
      settle();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The menu could not be deleted.'));
      if (thrown?.status >= 400 && thrown?.status < 500) setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const deletingPages = shownDeleting
    ? pages.filter((page) => page.showInHeader && page.headerMenu === shownDeleting.slug)
    : [];

  const renderMenu = (menu) => {
    const contents = contentsOf(menu, pages);
    const generated = isGeneratedMenu(menu);

    return (
      <div className={styles.menuRow}>
        <div className={styles.menuText}>
          <span className={styles.menuName}>
            {menu.name}
            {menu.isActive === false ? <span className={styles.hiddenTag}>Hidden</span> : null}
          </span>
          <span className={styles.menuMeta}>
            {generated ? HEADER_MENU_SOURCES.labelOf(menu.source) : 'Pages and links'}
            {menu.href ? ` · opens ${menu.href}` : ''}
            {contents.length > 0 ? ` · ${contents.join(' · ')}` : ''}
          </span>
        </div>
        <span className={styles.menuActions}>
          <label className={styles.shownSwitch}>
            <Switch
              size="small"
              checked={menu.isActive !== false}
              disabled={!canEdit}
              onChange={(event) => setShown(menu, event.target.checked)}
              slotProps={{
                input: { 'aria-label': `Show “${menu.name}” in the header` },
              }}
            />
            <span aria-hidden="true">Shown</span>
          </label>
          {canEdit ? (
            <IconButton label={`Edit “${menu.name}”`} size="sm" onClick={() => setEditing(menu)}>
              <Icon icon="mdi:pencil-outline" width="18" height="18" />
            </IconButton>
          ) : null}
          {canDelete && !generated ? (
            <IconButton
              label={`Delete “${menu.name}”`}
              size="sm"
              className={styles.danger}
              onClick={() => setDeleting(menu)}
            >
              <Icon icon="mdi:trash-can-outline" width="18" height="18" />
            </IconButton>
          ) : null}
        </span>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Header menu"
        count={loading ? undefined : menus.length}
        breadcrumbs={[{ label: 'Pages', to: PATHS.adminPages }, { label: 'Header menu' }]}
        subtitle="The menus across the top of every page, left to right. A page joins one here or from its own form."
        actions={
          <span className={styles.headerActions}>
            <Button
              variant="outline"
              href={PATHS.home}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Icon icon="mdi:open-in-new" width="18" height="18" />}
            >
              View site
            </Button>
            {canEdit ? (
              <Button
                icon={<Icon icon="mdi:plus" width="18" height="18" />}
                onClick={() => setEditing({})}
              >
                Add menu
              </Button>
            ) : null}
          </span>
        }
      />

      {error ? (
        <ErrorState text={error.message} onRetry={refetch} />
      ) : loading || pagesLoading ? (
        <div className={styles.loading} role="status" aria-busy="true">
          <span className={styles.srOnly}>Loading the menus…</span>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} variant="rounded" height={64} />
          ))}
        </div>
      ) : menus.length === 0 ? (
        <EmptyState
          icon={<Icon icon="mdi:menu" width="32" height="32" />}
          title="The header has no menus"
          text="Add one, then place pages in it here or from each page’s form."
          action={canEdit ? <Button onClick={() => setEditing({})}>Add menu</Button> : null}
        />
      ) : (
        <div className={styles.screen}>
          <p className={styles.lead}>
            Drag a menu, or move it with its arrows, to change its place in the header. On a
            narrower screen the menus that do not fit fold into “More”.
          </p>
          <SortableList
            label="Header menus, left to right"
            items={menus}
            disabled={!canEdit}
            getId={(menu) => menu.id}
            getLabel={(menu) => menu.name}
            onReorder={reorder}
            renderItem={renderMenu}
          />
        </div>
      )}

      <HeaderMenuDialog
        open={Boolean(editing)}
        menu={shownEditing}
        pages={pages}
        menus={menus}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          settle();
        }}
        onExited={releaseEditing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={shownDeleting ? `Delete “${shownDeleting.name}”?` : ''}
        message={
          shownDeleting
            ? deletingPages.length > 0
              ? `The ${deletingPages.length === 1 ? 'page' : `${deletingPages.length} pages`} in it will be taken out of the header — each stays published at its own address. This cannot be undone.`
              : 'The menu leaves the header. This cannot be undone.'
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        onExited={releaseDeleting}
      >
        {deletingPages.length > 0 ? (
          <ul className={styles.deletingList}>
            {deletingPages.map((page) => (
              <li key={page.id}>{page.title}</li>
            ))}
          </ul>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
