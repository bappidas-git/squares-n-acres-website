import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { createDocument } from '@tiptap/core';

import BubbleMenuBar from './toolbar/BubbleMenuBar';
import FloatingInsertMenu from './toolbar/FloatingInsertMenu';
import ImageDialog from './toolbar/ImageDialog';
import LinkDialog from './toolbar/LinkDialog';
import OutlinePanel from './toolbar/OutlinePanel';
import TableMenu from './toolbar/TableMenu';
import Toolbar from './toolbar/Toolbar';
import YoutubeDialog from './toolbar/YoutubeDialog';
import buildExtensions from './extensions';
import normalizeHtml from './normalizeHtml';
import sanitizeHtml from './sanitize';
import { Field } from '../ui/FormField';

import styles from './RichTextEditor.module.css';

/** How long the editor waits after the last keystroke before telling the form. */
const EMIT_DELAY_MS = 200;

/** Words a minute, for the reading-time figure a visitor sees on an article. */
const WORDS_PER_MINUTE = 200;

/** The document as it will be stored: tidied, then reduced to the allow-list. */
const serialize = (editor) => sanitizeHtml(normalizeHtml(editor.getHTML()));

/**
 * Whether an editor is still one to read from.
 *
 * Tiptap destroys an instance whose component has not committed within a
 * millisecond of creating it, and hands over a new one a render later; until
 * then the render that was drawn with the old one still runs its effects. A
 * destroyed editor keeps its object but drops its schema, and serialising it
 * throws — the article form of a slow first load went to "Something went
 * wrong" (QA-55). `isDestroyed` cannot tell: it also answers `true` for an
 * editor whose view is not mounted yet, which is perfectly readable.
 */
const isLive = (editor) => Boolean(editor?.schema);

/**
 * Whether an editor already holds the document some HTML describes. The two
 * are compared as documents, not as strings: a stored body and the editor's
 * own HTML of it differ in whitespace and attribute order, and a string
 * compare read that as a different article and loaded it again.
 */
function holds(editor, html) {
  try {
    return createDocument(html, editor.schema, editor.options.parseOptions ?? {}).eq(
      editor.state.doc
    );
  } catch {
    return false;
  }
}

/** Reading time in whole minutes, never zero for a document with words in it. */
const readingTimeOf = (words) =>
  words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));

/** The headings a table of contents would show, with where each one starts. */
function outlineOf(editor) {
  const headings = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return;
    if (node.attrs.level > 3) return;
    headings.push({ id: `h-${pos}`, level: node.attrs.level, text: node.textContent, pos });
  });
  return headings;
}

/** Words, characters and reading time, from the CharacterCount extension. */
function statsOf(editor) {
  const counter = editor.storage.characterCount;
  const words = counter?.words?.() ?? 0;
  return { words, characters: counter?.characters?.() ?? 0, readingTime: readingTimeOf(words) };
}

/**
 * The one rich-text editor of the panel.
 *
 * Everything an editor writes — a listing's description, an article body, a
 * FAQ answer, a page block — is written here, and what leaves is already
 * sanitised: `onChange` emits `sanitize(normalize(html))`, so the value a form
 * holds is the value `SafeHtml` will render, with no step in between where
 * markup could arrive that the page then has to be careful about.
 *
 * It is deliberately not a controlled input. ProseMirror owns the document and
 * the selection; `value` is read at mount and re-read only when it changes to
 * something the editor did not itself produce — a draft restored, a form reset,
 * a record loaded. Feeding every keystroke back in would fight the cursor.
 *
 * @param {object} props
 * @param {string} props.value HTML
 * @param {(html: string) => void} props.onChange sanitised HTML, debounced
 * @param {string} [props.placeholder]
 * @param {'full'|'compact'} [props.variant] `compact` drops the block inserts
 * @param {number} [props.minHeight] of the writing area, in pixels
 * @param {boolean} [props.disabled] read-only: no toolbar, no menus
 * @param {string} [props.focusKeyword] hinted in the image dialog's alt-text help
 * @param {() => Promise<{url: string, alt?: string, caption?: string}|null>} [props.onRequestImage]
 *   the media library, once there is one; without it images come from a URL
 * @param {(files: FileList) => Promise<{src: string, alt?: string}|null>|null} [props.onDropFiles]
 *   a picture dropped on the editor, uploaded; `null` when uploads are off
 * @param {number} [props.maxWords] a target shown beside the word count
 * @param {string} [props.id]
 * @param {string} [props.label]
 * @param {boolean} [props.required] marks the label, as every other field does —
 *   a FAQ's required answer was the one label without its asterisk (QA-59)
 * @param {string} [props.error]
 * @param {string} [props.helper]
 */
/** What the image dialog says when a file is dropped and uploads are off. */
export const DROP_NEEDS_UPLOADS =
  'Drop needs Cloudinary — paste an address instead. Uploads are switched on under Settings → Integrations.';

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    value = '',
    onChange,
    placeholder = '',
    variant = 'full',
    minHeight = 280,
    disabled = false,
    focusKeyword = '',
    onRequestImage,
    onDropFiles,
    maxWords,
    id,
    label,
    required = false,
    error,
    helper,
  },
  ref
) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const containerRef = useRef(null);

  const [fullscreen, setFullscreen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [linkDialog, setLinkDialog] = useState(null);
  const [imageDialog, setImageDialog] = useState(null);
  const [youtubeDialog, setYoutubeDialog] = useState(null);

  // The last HTML this editor handed the form. An incoming `value` equal to it
  // is our own change coming back and must not reset the document.
  const emittedRef = useRef(value ?? '');
  // The last value that arrived from outside — a record loaded, a draft
  // restored — and the document it became, read back through `serialize`. The
  // two differ more often than not: a stored body carries the newlines between
  // its blocks that the editor never writes. Without this, reading an untouched
  // document back reported that difference as an edit, and every article opened
  // with unsaved changes (QA-55).
  const loadedRef = useRef({ editor: null, raw: value ?? '', serialized: null });
  const timerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Read by the drop handler, which the editor keeps from its creation.
  const onDropFilesRef = useRef(onDropFiles);
  onDropFilesRef.current = onDropFiles;

  const extensions = useMemo(
    () => buildExtensions({ variant, placeholder }),
    [variant, placeholder]
  );

  const emit = useCallback((editor) => {
    if (!isLive(editor)) return;
    const html = serialize(editor);
    // The document the form was given, unchanged, is handed back as the very
    // string the form holds — so a click into the body and out again, or an
    // edit typed and then undone, leaves the form as clean as it was.
    const { raw, serialized } = loadedRef.current;
    const next = serialized !== null && html === serialized ? raw : html;
    if (next === emittedRef.current) return;
    emittedRef.current = next;
    onChangeRef.current?.(next);
  }, []);

  const editor = useEditor(
    {
      extensions,
      content: value ?? '',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: `prose ${styles.surface}`,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': label || 'Rich text',
          spellcheck: 'true',
        },
        handleDrop: (_view, event) => {
          const transfer = event.dataTransfer;
          if (!transfer) return false;
          const dropped = transfer.getData('text/uri-list') || transfer.getData('text/plain');
          const hasFiles = (transfer.files?.length ?? 0) > 0;
          if (!hasFiles && !/^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|avif|svg)/i.test(dropped)) {
            return false;
          }
          event.preventDefault();
          if (!hasFiles) {
            setImageDialog({ src: dropped, alt: '', caption: '' });
            return true;
          }
          // A file: uploaded when uploads are on, then described in the dialog
          // — it used to open the dialog empty and throw the file away
          // (prompt 51). Without Cloudinary the dialog says why it is empty.
          const upload = onDropFilesRef.current?.(transfer.files);
          if (upload && typeof upload.then === 'function') {
            upload.then((uploaded) => {
              if (uploaded?.src) {
                setImageDialog({ src: uploaded.src, alt: uploaded.alt ?? '', caption: '' });
              }
            });
            return true;
          }
          setImageDialog({ src: '', alt: '', caption: '', note: DROP_NEEDS_UPLOADS });
          return true;
        },
      },
      onUpdate: ({ editor: instance }) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => emit(instance), EMIT_DELAY_MS);
      },
      onBlur: ({ editor: instance }) => {
        clearTimeout(timerRef.current);
        emit(instance);
      },
    },
    [extensions]
  );

  // The selector reads the editor `useEditor` holds now, not the one in the
  // snapshot. Tiptap replaces its first instance when the mount effect runs
  // later than its 1 ms destroy timer — a sixteen-tab form always does — and
  // the snapshot kept the discarded, empty one until the next transaction. A
  // stored description arrives in the replacement's own `content`, so there
  // was no next transaction: the counter read "0 words · 0 characters" under
  // 1,022 characters of text until the first keystroke (QA-62).
  const view = useEditorState({
    editor,
    selector: () =>
      isLive(editor)
        ? { outline: outlineOf(editor), stats: statsOf(editor) }
        : { outline: [], stats: { words: 0, characters: 0, readingTime: 0 } },
  });

  const stats = view?.stats ?? { words: 0, characters: 0, readingTime: 0 };
  const outline = view?.outline ?? [];

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Without `emitUpdate: false` Tiptap announces an `update` for a change of
  // editability — on mount, and every time a save disables the form and
  // enables it again — and an update is what `emit` answers.
  useEffect(() => {
    if (isLive(editor)) editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  // A value that did not come from here — a draft restored, a record loaded —
  // replaces the document; one that did is ignored, cursor intact. A new
  // editor instance holds whatever it was created with, which becomes the
  // value it compares its own output against.
  useEffect(() => {
    if (!isLive(editor)) return;
    const incoming = value ?? '';
    const fresh = loadedRef.current.editor !== editor;
    if (!fresh && incoming === emittedRef.current) return;
    emittedRef.current = incoming;

    const settle = () => {
      loadedRef.current = { editor, raw: incoming, serialized: serialize(editor) };
    };
    if (holds(editor, incoming)) {
      settle();
      return;
    }
    // Loaded a moment later, outside React's commit: Tiptap draws a React node
    // view (a figure, a block) with `flushSync` once the editor is initialised,
    // which React refuses — with a warning — from inside an effect. That was a
    // record arriving after its editor had mounted empty, as Back and Forward
    // do. A newer value, or the editor's replacement, supersedes this one.
    queueMicrotask(() => {
      if (!isLive(editor) || emittedRef.current !== incoming) return;
      editor.commands.setContent(incoming, { emitUpdate: false });
      settle();
    });
  }, [editor, value]);

  const onKeyDown = (event) => {
    // Ctrl/Cmd+S saves the form around the editor, which hears about typing
    // 200 ms late: the words typed just before it were not in the save, and a
    // required answer read as empty (QA-59). They are handed over now; the
    // form's own shortcut does the saving.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      clearTimeout(timerRef.current);
      emit(editor);
      return;
    }
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    if (disabled) return;
    event.preventDefault();
    openLink();
  };

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setFullscreen(false);
      editor?.commands.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, editor]);

  // What the dialog needs to know about the link under the cursor.
  //
  // "Is anything selected" is answered by the text between the two ends rather
  // than by the selection being non-empty: an editor that has not been clicked
  // into yet reports a selection that covers the document, and a dialog that
  // believed it would hide the box the new link's words go in.
  const openLink = useCallback(() => {
    if (!editor) return;
    const attributes = editor.getAttributes('link');
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ').trim();
    const rel = String(attributes.rel ?? '');

    setLinkDialog({
      href: attributes.href ?? '',
      text: selected,
      newTab: attributes.target === '_blank',
      noFollow: rel.includes('nofollow'),
      hasSelection: selected.length > 0,
      editing: Boolean(attributes.href),
    });
  }, [editor]);

  const applyLink = ({ href, text, newTab, noFollow }) => {
    const rel = [newTab ? 'noopener' : null, noFollow ? 'nofollow' : null].filter(Boolean);
    const attributes = {
      href,
      target: newTab ? '_blank' : null,
      rel: rel.length > 0 ? rel.join(' ') : null,
    };

    if (linkDialog?.hasSelection) {
      editor.chain().focus().extendMarkRange('link').setLink(attributes).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: text || href,
          marks: [{ type: 'link', attrs: attributes }],
        })
        .run();
    }
    setLinkDialog(null);
  };

  const insertMenuItems = useMemo(() => {
    if (!editor || variant === 'compact') return [];
    return [
      {
        key: 'image',
        label: 'Image',
        icon: 'mdi:image-outline',
        run: () => setImageDialog({ src: '', alt: '', caption: '' }),
      },
      {
        key: 'table',
        label: 'Table',
        icon: 'mdi:table',
        run: () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        key: 'youtube',
        label: 'YouTube video',
        icon: 'mdi:youtube',
        run: () => setYoutubeDialog({ url: '' }),
      },
      {
        key: 'cta',
        label: 'Call to action',
        icon: 'mdi:bullhorn-outline',
        run: () => editor.chain().focus().insertCtaBlock().run(),
      },
      {
        key: 'properties',
        label: 'Listings',
        icon: 'mdi:home-group',
        run: () => editor.chain().focus().insertPropertyEmbed([]).run(),
      },
      {
        key: 'faq',
        label: 'Questions',
        icon: 'mdi:comment-question-outline',
        run: () => editor.chain().focus().insertFaqBlock([]).run(),
      },
      {
        key: 'divider',
        label: 'Divider',
        icon: 'mdi:minus',
        run: () => editor.chain().focus().setHorizontalRule().run(),
      },
    ];
  }, [editor, variant]);

  // What a form can ask the editor to do from outside: put the cursor in it,
  // drop generated markup into it, and read the two things a SEO panel wants.
  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.commands.focus(),
      insertHtml: (html) => editor?.chain().focus().insertContent(sanitizeHtml(html)).run(),
      getOutline: () => (editor ? outlineOf(editor) : []),
      getStats: () => (editor ? statsOf(editor) : { words: 0, characters: 0, readingTime: 0 }),
    }),
    [editor]
  );

  const showOutline = variant === 'full' && (outlineOpen || fullscreen);

  return (
    <Field
      id={fieldId}
      label={label}
      hint={helper}
      error={error}
      required={required}
      labelAs="span"
      className={styles.field}
    >
      {({ hintId, errorId }) => (
        <div
          ref={containerRef}
          className={[
            styles.editor,
            fullscreen ? styles.fullscreen : '',
            error ? styles.invalid : '',
            disabled ? styles.readOnly : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          onKeyDown={onKeyDown}
        >
          {disabled ? null : (
            <>
              <Toolbar
                editor={editor}
                variant={variant}
                fullscreen={fullscreen}
                outlineOpen={outlineOpen}
                onLink={openLink}
                onImage={() => setImageDialog({ src: '', alt: '', caption: '' })}
                onYoutube={() => setYoutubeDialog({ url: '' })}
                onInsertCta={() => editor?.chain().focus().insertCtaBlock().run()}
                onInsertProperties={() => editor?.chain().focus().insertPropertyEmbed([]).run()}
                onInsertFaq={() => editor?.chain().focus().insertFaqBlock([]).run()}
                onToggleFullscreen={() => setFullscreen((open) => !open)}
                onToggleOutline={() => setOutlineOpen((open) => !open)}
              />
              <TableMenu editor={editor} />
            </>
          )}

          <div className={styles.workspace}>
            <div className={styles.canvas} style={{ minHeight: `${minHeight}px` }}>
              <EditorContent editor={editor} />
              {disabled ? null : (
                <>
                  <BubbleMenuBar editor={editor} containerRef={containerRef} onLink={openLink} />
                  <FloatingInsertMenu
                    editor={editor}
                    containerRef={containerRef}
                    items={insertMenuItems}
                  />
                </>
              )}
            </div>

            {showOutline ? (
              <OutlinePanel
                outline={outline}
                stats={stats}
                maxWords={maxWords}
                onJump={(pos) => editor?.chain().focus(pos).scrollIntoView().run()}
              />
            ) : null}
          </div>

          {variant === 'full' && !showOutline ? (
            <p className={styles.statusBar}>
              <span>{stats.words.toLocaleString('en-IN')} words</span>
              <span>{stats.characters.toLocaleString('en-IN')} characters</span>
              <span>{stats.readingTime} min read</span>
            </p>
          ) : null}

          <LinkDialog
            open={Boolean(linkDialog)}
            value={linkDialog}
            onSubmit={applyLink}
            onRemove={
              linkDialog?.editing
                ? () => {
                    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                    setLinkDialog(null);
                  }
                : undefined
            }
            onClose={() => setLinkDialog(null)}
          />

          <ImageDialog
            open={Boolean(imageDialog)}
            value={imageDialog}
            focusKeyword={focusKeyword}
            onRequestImage={onRequestImage}
            onSubmit={(attributes) => {
              editor?.chain().focus().setFigureImage(attributes).run();
              setImageDialog(null);
            }}
            onClose={() => setImageDialog(null)}
          />

          <YoutubeDialog
            open={Boolean(youtubeDialog)}
            initialUrl={youtubeDialog?.url ?? ''}
            onSubmit={(url) => {
              editor?.chain().focus().setYoutubeVideo({ src: url }).run();
              setYoutubeDialog(null);
            }}
            onClose={() => setYoutubeDialog(null)}
          />
        </div>
      )}
    </Field>
  );
});

export default RichTextEditor;
