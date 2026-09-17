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
 * @param {number} [props.maxWords] a target shown beside the word count
 * @param {string} [props.id]
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.helper]
 */
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
    maxWords,
    id,
    label,
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
  const timerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = useMemo(
    () => buildExtensions({ variant, placeholder }),
    [variant, placeholder]
  );

  const emit = useCallback((editor) => {
    const html = serialize(editor);
    if (html === emittedRef.current) return;
    emittedRef.current = html;
    onChangeRef.current?.(html);
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
          setImageDialog({ src: hasFiles ? '' : dropped, alt: '', caption: '' });
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

  const view = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      instance
        ? { outline: outlineOf(instance), stats: statsOf(instance) }
        : { outline: [], stats: { words: 0, characters: 0, readingTime: 0 } },
  });

  const stats = view?.stats ?? { words: 0, characters: 0, readingTime: 0 };
  const outline = view?.outline ?? [];

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  // A value that did not come from here — a draft restored, a record loaded —
  // replaces the document; one that did is ignored, cursor intact.
  useEffect(() => {
    if (!editor) return;
    const incoming = value ?? '';
    if (incoming === emittedRef.current) return;
    if (incoming === serialize(editor)) return;
    emittedRef.current = incoming;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);

  const onKeyDown = (event) => {
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
