import { useCallback, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useEditorState } from '@tiptap/react';

import Tooltip from '../../ui/Tooltip';

import styles from '../RichTextEditor.module.css';

/** `⌘` on a Mac, `Ctrl` everywhere else — tooltips should read like the keyboard. */
const MOD =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '')
    ? '⌘'
    : 'Ctrl';

/** A label with its shortcut, for the tooltip. */
const hint = (label, keys) => (keys ? `${label} (${keys})` : label);

/**
 * One toolbar control.
 *
 * `aria-pressed` is what tells a screen reader that "Bold" is a state rather
 * than an action; `data-toolbar-item` is how the arrow keys find it.
 */
export function ToolbarButton({
  label,
  icon,
  shortcut,
  active = false,
  disabled = false,
  onClick,
}) {
  return (
    <Tooltip title={hint(label, shortcut)}>
      <span className={styles.toolbarSlot}>
        <button
          type="button"
          data-toolbar-item
          tabIndex={-1}
          className={[styles.toolbarButton, active ? styles.toolbarButtonOn : '']
            .filter(Boolean)
            .join(' ')}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          <Icon icon={icon} width="20" height="20" aria-hidden="true" />
        </button>
      </span>
    </Tooltip>
  );
}

/** A labelled group, so the arrow keys move through something with a shape. */
function Group({ label, children }) {
  return (
    <div className={styles.toolbarGroup} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/**
 * What the toolbar needs to know about the document under the cursor.
 *
 * The snapshot can carry a `null` editor — during the first render and on the
 * server — so the selector answers `null` rather than reading through it.
 */
const selectState = ({ editor }) =>
  !editor
    ? null
    : {
        block: editor.isActive('heading', { level: 2 })
          ? 'h2'
          : editor.isActive('heading', { level: 3 })
            ? 'h3'
            : editor.isActive('heading', { level: 4 })
              ? 'h4'
              : editor.isActive('blockquote')
                ? 'blockquote'
                : 'p',
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        strike: editor.isActive('strike'),
        code: editor.isActive('code'),
        link: editor.isActive('link'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        blockquote: editor.isActive('blockquote'),
        alignLeft: editor.isActive({ textAlign: 'left' }),
        alignCenter: editor.isActive({ textAlign: 'center' }),
        alignRight: editor.isActive({ textAlign: 'right' }),
        inTable: editor.isActive('table'),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      };

/** The block styles the Text select offers. */
const BLOCKS = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'blockquote', label: 'Quote' },
];

/**
 * The fixed toolbar.
 *
 * It is one tab stop: `role="toolbar"` with a roving tabindex, so a keyboard
 * user tabs past the whole strip in one press and walks it with the arrow keys
 * when they want it (§8.3). Buttons take `mousedown` away from the browser so
 * clicking one never steals the selection the command is about to act on.
 *
 * @param {object} props
 * @param {import('@tiptap/core').Editor} props.editor
 * @param {'full'|'compact'} [props.variant]
 */
export default function Toolbar({
  editor,
  variant = 'full',
  fullscreen = false,
  outlineOpen = false,
  onLink,
  onImage,
  onYoutube,
  onInsertCta,
  onInsertProperties,
  onInsertFaq,
  onToggleFullscreen,
  onToggleOutline,
}) {
  const ref = useRef(null);
  const state = useEditorState({ editor, selector: selectState });

  /** Arrow keys walk the controls; Home/End jump to the ends (§8.3). */
  const onKeyDown = useCallback((event) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const items = [...(ref.current?.querySelectorAll('[data-toolbar-item]') ?? [])].filter(
      (item) => !item.disabled
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement);
    const last = items.length - 1;
    let next = current;

    if (event.key === 'ArrowRight') next = current >= last ? 0 : current + 1;
    else if (event.key === 'ArrowLeft') next = current <= 0 ? last : current - 1;
    else if (event.key === 'Home') next = 0;
    else next = last;

    event.preventDefault();
    items[next]?.focus();
  }, []);

  if (!editor || !state) return null;

  const compact = variant === 'compact';

  const setBlock = (value) => {
    const chain = editor.chain().focus();
    if (value === 'p') chain.clearNodes().setParagraph().run();
    else if (value === 'blockquote') chain.clearNodes().toggleBlockquote().run();
    else chain.setNode('heading', { level: Number(value.slice(1)) }).run();
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Formatting"
      aria-orientation="horizontal"
      className={styles.toolbar}
      onKeyDown={onKeyDown}
    >
      <Group label="Text style">
        <select
          data-toolbar-item
          tabIndex={0}
          className={styles.toolbarSelect}
          aria-label="Text style"
          value={state.block}
          onChange={(event) => setBlock(event.target.value)}
        >
          {BLOCKS.filter((block) => !compact || block.value !== 'blockquote').map((block) => (
            <option key={block.value} value={block.value}>
              {block.label}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Emphasis">
        <ToolbarButton
          label="Bold"
          shortcut={`${MOD}+B`}
          icon="mdi:format-bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          shortcut={`${MOD}+I`}
          icon="mdi:format-italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Underline"
          shortcut={`${MOD}+U`}
          icon="mdi:format-underline"
          active={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        {compact ? null : (
          <>
            <ToolbarButton
              label="Strikethrough"
              shortcut={`${MOD}+Shift+S`}
              icon="mdi:format-strikethrough"
              active={state.strike}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />
            <ToolbarButton
              label="Code"
              shortcut={`${MOD}+E`}
              icon="mdi:code-tags"
              active={state.code}
              onClick={() => editor.chain().focus().toggleCode().run()}
            />
          </>
        )}
      </Group>

      {compact ? null : (
        <Group label="Alignment">
          <ToolbarButton
            label="Align left"
            shortcut={`${MOD}+Shift+L`}
            icon="mdi:format-align-left"
            active={state.alignLeft}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          />
          <ToolbarButton
            label="Align centre"
            shortcut={`${MOD}+Shift+E`}
            icon="mdi:format-align-center"
            active={state.alignCenter}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          />
          <ToolbarButton
            label="Align right"
            shortcut={`${MOD}+Shift+R`}
            icon="mdi:format-align-right"
            active={state.alignRight}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          />
        </Group>
      )}

      <Group label="Lists">
        <ToolbarButton
          label="Bulleted list"
          shortcut={`${MOD}+Shift+8`}
          icon="mdi:format-list-bulleted"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numbered list"
          shortcut={`${MOD}+Shift+7`}
          icon="mdi:format-list-numbered"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </Group>

      <Group label="Blocks">
        <ToolbarButton
          label="Link"
          shortcut={`${MOD}+K`}
          icon="mdi:link-variant"
          active={state.link}
          onClick={onLink}
        />
        {compact ? null : (
          <>
            <ToolbarButton
              label="Quote"
              icon="mdi:format-quote-close"
              active={state.blockquote}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarButton
              label="Divider"
              icon="mdi:minus"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            />
            <ToolbarButton label="Image" icon="mdi:image-outline" onClick={onImage} />
            <ToolbarButton label="YouTube video" icon="mdi:youtube" onClick={onYoutube} />
            <ToolbarButton
              label="Table"
              icon="mdi:table"
              active={state.inTable}
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            />
          </>
        )}
      </Group>

      {compact ? null : (
        <Group label="Insert">
          <ToolbarButton label="Call to action" icon="mdi:bullhorn-outline" onClick={onInsertCta} />
          <ToolbarButton label="Listings" icon="mdi:home-group" onClick={onInsertProperties} />
          <ToolbarButton
            label="Questions"
            icon="mdi:comment-question-outline"
            onClick={onInsertFaq}
          />
        </Group>
      )}

      <Group label="Tools">
        <ToolbarButton
          label="Undo"
          shortcut={`${MOD}+Z`}
          icon="mdi:undo"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="Redo"
          shortcut={`${MOD}+Shift+Z`}
          icon="mdi:redo"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        />
        {compact ? null : (
          <>
            <ToolbarButton
              label="Clear formatting"
              icon="mdi:format-clear"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            />
            <ToolbarButton
              label={outlineOpen ? 'Hide the outline' : 'Show the outline'}
              icon="mdi:format-list-bulleted-square"
              active={outlineOpen}
              onClick={onToggleOutline}
            />
            <ToolbarButton
              label={fullscreen ? 'Leave full screen' : 'Full screen'}
              shortcut={fullscreen ? 'Esc' : undefined}
              icon={fullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}
              active={fullscreen}
              onClick={onToggleFullscreen}
            />
          </>
        )}
      </Group>
    </div>
  );
}
