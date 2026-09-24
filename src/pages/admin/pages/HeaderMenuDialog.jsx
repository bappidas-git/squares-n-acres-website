import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import IconButton from '../../../components/ui/IconButton';
import Modal from '../../../components/ui/Modal';
import PATHS from '../../../routes/paths';
import headerMenuService from '../../../services/headerMenuService';
import pageService from '../../../services/pageService';
import { HEADER_MENU_SOURCES } from '../../../config/enums';
import { SelectField, SwitchField, TextField } from '../../../components/ui/FormField';
import { firstFieldMessage } from '../../../services/apiError';
import { isGeneratedMenu } from '../../../config/headerMenus';
import { slugify } from '../../../utils/slug';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './HeaderMenusPage.module.css';

/** The API's limits (`src/services/schemas/headerMenu.js`). */
const LIMITS = { name: 40, submenuName: 60, linkLabel: 80, href: 500, submenus: 12, links: 40 };

/** A path on this site or a full `http(s)` address — what the API accepts. */
const HREF_RE = /^(\/(?!\/)|https?:\/\/)/i;

/** What a generated menu is built from, in the dialog's words. */
const GENERATED_FROM = {
  buy: 'the construction statuses, the property types, the budget bands and the featured localities',
  rent: 'the property types to rent, and lease',
  commercial: 'the commercial property types, and lease',
};

let uidCounter = 0;
const uid = () => {
  uidCounter += 1;
  return `u${uidCounter}`;
};

/** The dialog's working copy of a menu, and of the pages placed in it. */
function draftOf(menu, pages) {
  const submenus = (menu?.submenus ?? []).map((entry) => ({
    uid: uid(),
    slug: entry.slug,
    name: entry.name ?? '',
  }));
  const bySlug = new Map(submenus.map((entry) => [entry.slug, entry.uid]));

  return {
    name: menu?.name ?? '',
    href: menu?.href ?? '',
    isActive: menu?.isActive !== false,
    submenus,
    links: (menu?.links ?? [])
      .slice()
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map((link) => ({
        uid: uid(),
        label: link.label ?? '',
        href: link.href ?? '',
        submenu: link.submenu ? (bySlug.get(link.submenu) ?? '') : '',
        newTab: Boolean(link.newTab),
      })),
    placed: menu?.slug
      ? (pages ?? [])
          .filter((page) => page.showInHeader && page.headerMenu === menu.slug)
          .map((page) => ({
            pageId: page.id,
            submenu: page.headerSubmenu ? (bySlug.get(page.headerSubmenu) ?? '') : '',
          }))
      : [],
  };
}

/** The draft without the dialog's own keys — what "changed" compares. */
const comparable = (draft) =>
  JSON.stringify({
    ...draft,
    submenus: draft.submenus.map(({ slug, name }) => ({ slug, name })),
    links: draft.links.map(({ uid: _uid, ...link }) => link),
  });

/** A name as two of them are compared: trimmed, one space, any case. */
const nameKey = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

/**
 * The client's half of a menu's validation — what the API would refuse, said
 * before the request and next to the box that caused it.
 *
 * @param {object} draft
 * @param {Array<object>} others every other menu of the header
 */
function validate(draft, others = []) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Give the menu a name — it is the label the header shows.';
  else {
    const clash = others.find((menu) => nameKey(menu.name) === nameKey(name));
    if (clash) {
      errors.name = `The header already has a menu called “${clash.name}”. Give this one another name.`;
    }
  }
  const href = draft.href.trim();
  if (href && !HREF_RE.test(href)) {
    errors.href = 'Start with “/” for a page of this site, or with https:// for another site.';
  }
  const seen = new Set();
  draft.submenus.forEach((entry, index) => {
    const key = nameKey(entry.name);
    if (!key) errors[`submenus.${index}.name`] = 'A submenu needs a name.';
    else if (seen.has(key)) {
      errors[`submenus.${index}.name`] = 'Two submenus of one menu cannot share a name.';
    }
    seen.add(key);
  });
  draft.links.forEach((link, index) => {
    if (!link.label.trim()) errors[`links.${index}.label`] = 'A link needs a label.';
    if (!link.href.trim()) errors[`links.${index}.href`] = 'A link needs an address.';
    else if (!HREF_RE.test(link.href.trim())) {
      errors[`links.${index}.href`] =
        'Start with “/” for a page of this site, or with https:// for another site.';
    }
  });
  return errors;
}

/** Moves one entry of a list. */
const moved = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
};

/**
 * One header menu, in a dialog: its name and address, whether it shows, its
 * submenus, the links typed into it and the pages placed in it (QA-56).
 *
 * The pages are placed from here as well as from each page's own form: a page
 * added to the menu, moved to a submenu or taken out is written to that page
 * when the menu is saved — the menu's own record first, so a new submenu
 * exists before a page is filed under it. A submenu's key is made from its
 * name the first time it is saved and kept after that, so renaming one keeps
 * its pages.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.menu the record being edited; `{}` for a new one
 * @param {Array<object>} props.pages every page, for the placements
 * @param {Array<object>} props.menus every menu, to say where a page is now
 * @param {() => void} props.onClose
 * @param {(menu: object) => void} props.onSaved
 * @param {() => void} [props.onExited]
 */
export default function HeaderMenuDialog({
  open,
  menu,
  pages = [],
  menus = [],
  onClose,
  onSaved,
  onExited,
}) {
  const toast = useToast();
  const isNew = !menu?.id;
  const generated = isGeneratedMenu(menu);

  const [draft, setDraft] = useState(() => draftOf(menu, pages));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState({ pageId: '', submenu: '' });
  const [discarding, setDiscarding] = useState(false);
  const initial = useRef(comparable(draft));

  // A fresh working copy each time the dialog opens on a record — before the
  // dialog is painted: after it, its first frame showed the menu empty, with
  // no name, no submenus, no pages and no links.
  useLayoutEffect(() => {
    if (!open) return;
    const next = draftOf(menu, pages);
    setDraft(next);
    initial.current = comparable(next);
    setErrors({});
    setAdding({ pageId: '', submenu: '' });
    setDiscarding(false);
    // The pages list is read when the dialog opens; a refetch behind an open
    // dialog must not throw the editor's work away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menu]);

  const dirty = comparable(draft) !== initial.current;

  /**
   * Cancel, Escape and the backdrop all come here. Work in the dialog is asked
   * about once before it goes: it used to vanish on Cancel, while Escape did
   * nothing at all.
   */
  const requestClose = () => {
    if (saving) return;
    if (dirty) setDiscarding(true);
    else onClose?.();
  };
  const pagesById = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);
  const menuNames = useMemo(() => new Map(menus.map((entry) => [entry.slug, entry.name])), [menus]);

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const clearError = (key) =>
    setErrors((current) => {
      if (!(key in current)) return current;
      const { [key]: _gone, ...rest } = current;
      return rest;
    });

  /* ---------------- submenus ---------------- */

  const submenuOptions = draft.submenus.map((entry, index) => ({
    value: entry.uid,
    label: entry.name.trim() || `Submenu ${index + 1}`,
  }));

  const removeSubmenu = (entryUid) =>
    setDraft((current) => ({
      ...current,
      submenus: current.submenus.filter((entry) => entry.uid !== entryUid),
      // What was filed under it moves to the menu's own list, as it will on the site.
      links: current.links.map((link) =>
        link.submenu === entryUid ? { ...link, submenu: '' } : link
      ),
      placed: current.placed.map((entry) =>
        entry.submenu === entryUid ? { ...entry, submenu: '' } : entry
      ),
    }));

  /* ---------------- pages ---------------- */

  const placedIds = new Set(draft.placed.map((entry) => entry.pageId));
  const candidates = pages
    .filter((page) => !placedIds.has(page.id))
    .slice()
    .sort((left, right) => String(left.title).localeCompare(String(right.title)));

  const candidateLabel = (page) => {
    const where =
      page.showInHeader && page.headerMenu && page.headerMenu !== menu?.slug
        ? ` — now in ${menuNames.get(page.headerMenu) ?? page.headerMenu}`
        : '';
    const draftNote = page.status === 'published' ? '' : ' (draft)';
    return `${page.title}${draftNote}${where}`;
  };

  const addPage = () => {
    const pageId = Number(adding.pageId);
    if (!pageId) return;
    update({ placed: [...draft.placed, { pageId, submenu: adding.submenu }] });
    setAdding({ pageId: '', submenu: adding.submenu });
  };

  /** The pages of one group, in the order the header shows them. */
  const placedIn = (group) =>
    draft.placed
      .filter((entry) => entry.submenu === group)
      .map((entry) => ({ ...entry, page: pagesById.get(entry.pageId) }))
      .filter((entry) => entry.page)
      .sort((left, right) => (left.page.order ?? 0) - (right.page.order ?? 0));

  /* ---------------- save ---------------- */

  const save = async () => {
    const found = validate(
      draft,
      menus.filter((entry) => String(entry.id) !== String(menu?.id ?? ''))
    );
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    // A new submenu's key is made from its name, unique within the menu.
    const taken = new Set(draft.submenus.map((entry) => entry.slug).filter(Boolean));
    const slugOf = new Map();
    for (const entry of draft.submenus) {
      if (entry.slug) {
        slugOf.set(entry.uid, entry.slug);
        continue;
      }
      const base = slugify(entry.name) || 'group';
      let slug = base;
      for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;
      taken.add(slug);
      slugOf.set(entry.uid, slug);
    }
    const submenuSlug = (entryUid) => (entryUid ? (slugOf.get(entryUid) ?? null) : null);

    const body = {
      name: draft.name.trim(),
      href: draft.href.trim() || null,
      isActive: draft.isActive,
      submenus: draft.submenus.map((entry) => ({
        slug: slugOf.get(entry.uid),
        name: entry.name.trim(),
      })),
      links: draft.links.map((link, index) => ({
        label: link.label.trim(),
        href: link.href.trim(),
        submenu: submenuSlug(link.submenu),
        order: index + 1,
        newTab: link.newTab,
      })),
    };

    setSaving(true);
    let saved;
    try {
      const response = isNew
        ? await headerMenuService.create({ ...body, source: 'custom', order: menus.length + 1 })
        : await headerMenuService.update(menu.id, {
            ...body,
            slug: menu.slug,
            source: menu.source,
            order: menu.order ?? 0,
          });
      saved = response?.data;
    } catch (thrown) {
      const fields = thrown?.errors ?? {};
      setErrors(
        Object.fromEntries(
          Object.entries(fields).map(([key, messages]) => [
            key,
            Array.isArray(messages) ? messages[0] : String(messages),
          ])
        )
      );
      toast.error(firstFieldMessage(thrown, 'The menu could not be saved.'));
      setSaving(false);
      return;
    }

    // The pages second: every placement that differs from what the page holds.
    const wanted = new Map(draft.placed.map((entry) => [entry.pageId, submenuSlug(entry.submenu)]));
    const writes = [];
    for (const page of pages) {
      const inMenu = page.showInHeader && page.headerMenu === saved.slug;
      if (wanted.has(page.id)) {
        const submenu = wanted.get(page.id);
        if (!inMenu || (page.headerSubmenu ?? null) !== submenu) {
          writes.push({
            page,
            body: { showInHeader: true, headerMenu: saved.slug, headerSubmenu: submenu },
          });
        }
      } else if (inMenu) {
        writes.push({
          page,
          body: { showInHeader: false, headerMenu: null, headerSubmenu: null },
        });
      }
    }

    const failed = [];
    for (const write of writes) {
      try {
        await pageService.patch(write.page.id, write.body);
      } catch (thrown) {
        failed.push(`“${write.page.title}”: ${firstFieldMessage(thrown, 'not saved')}`);
      }
    }
    setSaving(false);

    if (failed.length > 0) {
      toast.error(
        `The menu was saved, but ${failed.length === 1 ? 'one page' : `${failed.length} pages`} could not be placed — ${failed.join('; ')}`
      );
    } else {
      toast.success(isNew ? `“${saved.name}” added to the header.` : `“${saved.name}” saved.`);
    }
    onSaved?.(saved);
  };

  const renderPlaced = (group) =>
    placedIn(group).map(({ pageId, page, submenu }) => (
      <li key={pageId} className={styles.placedRow}>
        <span className={styles.placedText}>
          <span className={styles.placedTitle}>
            {page.title}
            {page.status === 'published' ? null : (
              <span className={styles.draftTag}> · draft, shown once published</span>
            )}
          </span>
          <span className={styles.placedUrl}>
            {PATHS.page(page.slug)} · order {page.order ?? 0}
          </span>
        </span>
        {draft.submenus.length > 0 ? (
          <SelectField
            label={`Group for ${page.title}`}
            fieldClassName={styles.inlineSelect}
            className={styles.compactControl}
            options={[{ value: '', label: 'The menu’s own list' }, ...submenuOptions]}
            value={submenu}
            disabled={saving}
            onChange={(event) =>
              update({
                placed: draft.placed.map((entry) =>
                  entry.pageId === pageId ? { ...entry, submenu: event.target.value } : entry
                ),
              })
            }
          />
        ) : null}
        <IconButton
          label={`Take “${page.title}” out of the menu`}
          size="sm"
          disabled={saving}
          onClick={() =>
            update({ placed: draft.placed.filter((entry) => entry.pageId !== pageId) })
          }
        >
          <Icon icon="mdi:close" width="18" height="18" />
        </IconButton>
      </li>
    ));

  const groups = [
    { uid: '', name: draft.name.trim() || 'The menu’s own list', own: true },
    ...draft.submenus.map((entry, index) => ({
      uid: entry.uid,
      name: entry.name.trim() || `Submenu ${index + 1}`,
    })),
  ];

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        dismissible={!saving}
        title={isNew ? 'Add a menu' : `Edit “${menu?.name ?? ''}”`}
        description={
          generated
            ? `Generated from ${GENERATED_FROM[menu.source] ?? 'master data'}. Pages and links placed here come after those columns.`
            : 'A menu of the header: the pages placed in it and the links typed into it, grouped by submenu.'
        }
        size="lg"
        mobile="fullscreen"
        slotProps={{ transition: { onExited } }}
        footer={
          <>
            <Button variant="ghost" onClick={requestClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {isNew ? 'Add menu' : 'Save menu'}
            </Button>
          </>
        }
      >
        <div className={styles.dialog}>
          <section className={styles.block} aria-labelledby="menu-basics">
            <h3 className={styles.blockTitle} id="menu-basics">
              The menu
            </h3>
            <div className={styles.grid}>
              <TextField
                label="Name"
                required
                maxLength={LIMITS.name}
                value={draft.name}
                error={errors.name}
                disabled={saving}
                hint="The label the header shows."
                onChange={(event) => {
                  update({ name: event.target.value });
                  clearError('name');
                }}
              />
              <TextField
                label="Address"
                maxLength={LIMITS.href}
                value={draft.href}
                error={errors.href}
                disabled={saving}
                placeholder={generated ? `/${menu.source}` : '/insights/articles'}
                hint="Where the label itself goes: a path on this site or a full address. Empty, it opens the menu’s first entry."
                onChange={(event) => {
                  update({ href: event.target.value });
                  clearError('href');
                }}
              />
            </div>
            <SwitchField
              label="Show in the header"
              checked={draft.isActive}
              disabled={saving}
              hint="A hidden menu keeps its pages and links, and leaves the header until it is shown again."
              onChange={(next) => update({ isActive: next })}
            />
            {generated ? (
              <p className={styles.note}>
                <Icon icon="mdi:auto-fix" width="16" height="16" aria-hidden="true" />
                {HEADER_MENU_SOURCES.labelOf(menu.source)}. It cannot be deleted; hide it instead.
              </p>
            ) : null}
          </section>

          <section className={styles.block} aria-labelledby="menu-submenus">
            <h3 className={styles.blockTitle} id="menu-submenus">
              Submenus
            </h3>
            <p className={styles.blockHint}>
              The groups of the menu’s panel, each under its own heading. Pages and links that name
              none are listed first, under the menu’s name.
            </p>
            {draft.submenus.length === 0 ? (
              <p className={styles.empty}>No submenus — the menu is one list.</p>
            ) : (
              <ol className={styles.rows}>
                {draft.submenus.map((entry, index) => (
                  <li key={entry.uid} className={styles.row}>
                    <TextField
                      label={`Submenu ${index + 1}`}
                      fieldClassName={styles.grow}
                      maxLength={LIMITS.submenuName}
                      value={entry.name}
                      error={errors[`submenus.${index}.name`]}
                      disabled={saving}
                      onChange={(event) => {
                        update({
                          submenus: draft.submenus.map((other) =>
                            other.uid === entry.uid ? { ...other, name: event.target.value } : other
                          ),
                        });
                        clearError(`submenus.${index}.name`);
                      }}
                    />
                    <span className={styles.rowActions}>
                      <IconButton
                        label={`Move submenu ${index + 1} up`}
                        size="sm"
                        disabled={saving || index === 0}
                        onClick={() =>
                          update({ submenus: moved(draft.submenus, index, index - 1) })
                        }
                      >
                        <Icon icon="mdi:arrow-up" width="18" height="18" />
                      </IconButton>
                      <IconButton
                        label={`Move submenu ${index + 1} down`}
                        size="sm"
                        disabled={saving || index === draft.submenus.length - 1}
                        onClick={() =>
                          update({ submenus: moved(draft.submenus, index, index + 1) })
                        }
                      >
                        <Icon icon="mdi:arrow-down" width="18" height="18" />
                      </IconButton>
                      <IconButton
                        label={`Remove submenu ${index + 1}`}
                        size="sm"
                        disabled={saving}
                        onClick={() => removeSubmenu(entry.uid)}
                      >
                        <Icon icon="mdi:trash-can-outline" width="18" height="18" />
                      </IconButton>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={saving || draft.submenus.length >= LIMITS.submenus}
              icon={<Icon icon="mdi:plus" width="16" height="16" />}
              onClick={() =>
                update({ submenus: [...draft.submenus, { uid: uid(), slug: '', name: '' }] })
              }
            >
              Add submenu
            </Button>
          </section>

          <section className={styles.block} aria-labelledby="menu-pages">
            <h3 className={styles.blockTitle} id="menu-pages">
              Pages in this menu
            </h3>
            <p className={styles.blockHint}>
              A page shows in the header once it is published. Within a group, pages follow the
              Order field of each page’s form, and come before the links.
            </p>
            {groups.map((group) => {
              const rows = renderPlaced(group.uid);
              if (rows.length === 0 && !group.own) return null;
              return (
                <div key={group.uid || 'own'} className={styles.group}>
                  <h4 className={styles.groupTitle}>{group.name}</h4>
                  {rows.length > 0 ? (
                    <ul className={styles.placedList}>{rows}</ul>
                  ) : (
                    <p className={styles.empty}>No pages here yet.</p>
                  )}
                </div>
              );
            })}
            <div className={styles.addRow}>
              <SelectField
                label="Add a page"
                fieldClassName={styles.grow}
                placeholder="Choose a page"
                options={candidates.map((page) => ({
                  value: page.id,
                  label: candidateLabel(page),
                }))}
                value={adding.pageId}
                disabled={saving}
                onChange={(event) => setAdding({ ...adding, pageId: event.target.value })}
              />
              {draft.submenus.length > 0 ? (
                <SelectField
                  label="To"
                  options={[{ value: '', label: 'The menu’s own list' }, ...submenuOptions]}
                  value={adding.submenu}
                  disabled={saving}
                  onChange={(event) => setAdding({ ...adding, submenu: event.target.value })}
                />
              ) : null}
              <Button
                variant="outline"
                className={styles.addButton}
                disabled={saving || !adding.pageId}
                icon={<Icon icon="mdi:plus" width="16" height="16" />}
                onClick={addPage}
              >
                Add
              </Button>
            </div>
          </section>

          <section className={styles.block} aria-labelledby="menu-links">
            <h3 className={styles.blockTitle} id="menu-links">
              Links
            </h3>
            <p className={styles.blockHint}>
              Destinations that are not pages: a filtered listing such as{' '}
              <code>/buy?maxPrice=5000000</code>, a section of the site, or another site.
            </p>
            {draft.links.length === 0 ? (
              <p className={styles.empty}>No links.</p>
            ) : (
              <ol className={styles.rows}>
                {draft.links.map((link, index) => (
                  <li key={link.uid} className={[styles.row, styles.linkRow].join(' ')}>
                    <div className={styles.linkFields}>
                      <TextField
                        label={`Link ${index + 1} label`}
                        maxLength={LIMITS.linkLabel}
                        value={link.label}
                        error={errors[`links.${index}.label`]}
                        disabled={saving}
                        onChange={(event) => {
                          update({
                            links: draft.links.map((other) =>
                              other.uid === link.uid
                                ? { ...other, label: event.target.value }
                                : other
                            ),
                          });
                          clearError(`links.${index}.label`);
                        }}
                      />
                      <TextField
                        label={`Link ${index + 1} address`}
                        maxLength={LIMITS.href}
                        value={link.href}
                        placeholder="/buy?maxPrice=5000000"
                        error={errors[`links.${index}.href`]}
                        disabled={saving}
                        onChange={(event) => {
                          update({
                            links: draft.links.map((other) =>
                              other.uid === link.uid
                                ? { ...other, href: event.target.value }
                                : other
                            ),
                          });
                          clearError(`links.${index}.href`);
                        }}
                      />
                      {draft.submenus.length > 0 ? (
                        <SelectField
                          label={`Link ${index + 1} group`}
                          options={[{ value: '', label: 'The menu’s own list' }, ...submenuOptions]}
                          value={link.submenu}
                          disabled={saving}
                          onChange={(event) =>
                            update({
                              links: draft.links.map((other) =>
                                other.uid === link.uid
                                  ? { ...other, submenu: event.target.value }
                                  : other
                              ),
                            })
                          }
                        />
                      ) : null}
                      <SwitchField
                        label="Open in a new tab"
                        checked={link.newTab}
                        disabled={saving}
                        onChange={(next) =>
                          update({
                            links: draft.links.map((other) =>
                              other.uid === link.uid ? { ...other, newTab: next } : other
                            ),
                          })
                        }
                      />
                    </div>
                    <span className={styles.rowActions}>
                      <IconButton
                        label={`Move link ${index + 1} up`}
                        size="sm"
                        disabled={saving || index === 0}
                        onClick={() => update({ links: moved(draft.links, index, index - 1) })}
                      >
                        <Icon icon="mdi:arrow-up" width="18" height="18" />
                      </IconButton>
                      <IconButton
                        label={`Move link ${index + 1} down`}
                        size="sm"
                        disabled={saving || index === draft.links.length - 1}
                        onClick={() => update({ links: moved(draft.links, index, index + 1) })}
                      >
                        <Icon icon="mdi:arrow-down" width="18" height="18" />
                      </IconButton>
                      <IconButton
                        label={`Remove link ${index + 1}`}
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          update({ links: draft.links.filter((other) => other.uid !== link.uid) })
                        }
                      >
                        <Icon icon="mdi:trash-can-outline" width="18" height="18" />
                      </IconButton>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={saving || draft.links.length >= LIMITS.links}
              icon={<Icon icon="mdi:plus" width="16" height="16" />}
              onClick={() =>
                update({
                  links: [
                    ...draft.links,
                    { uid: uid(), label: '', href: '', submenu: '', newTab: false },
                  ],
                })
              }
            >
              Add link
            </Button>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={discarding}
        title="Discard your changes?"
        message={
          isNew
            ? 'The menu has not been added yet; what you entered will be lost.'
            : 'The menu keeps what it had before you opened it.'
        }
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onClose={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          onClose?.();
        }}
      />
    </>
  );
}
