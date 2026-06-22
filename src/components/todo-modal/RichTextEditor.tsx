import { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import * as Toolbar from '@radix-ui/react-toolbar';
import {
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Type,
} from 'lucide-react';
import { isRichTextEmpty, sanitizeRichTextHtml } from './richText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  action: () => void;
};

const URL_LIKE_PATTERN = /^(https?:\/\/|mailto:|tel:|www\.)/i;

const findUrlRangeAtCursor = (editor: NonNullable<ReturnType<typeof useEditor>>) => {
  const { $from } = editor.state.selection;
  const nodeText = $from.parent.textContent;
  const cursorOffset = $from.parentOffset;

  let start = cursorOffset;
  while (start > 0 && !/\s/.test(nodeText[start - 1])) {
    start -= 1;
  }

  let end = cursorOffset;
  while (end < nodeText.length && !/\s/.test(nodeText[end])) {
    end += 1;
  }

  if (start === end) return null;

  const word = nodeText.slice(start, end).trim();
  if (!URL_LIKE_PATTERN.test(word)) return null;

  const parentStart = $from.start();
  return {
    from: parentStart + start,
    to: parentStart + end,
    text: word,
  };
};

export const RichTextEditor = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Write something...',
  className = '',
}: RichTextEditorProps) => {
  const toolbarClassName = useMemo(
    () =>
      'mb-3 rounded-xl border border-white/10 bg-slate-900/65 px-2 py-2',
    []
  );
  const toolbarButtonClassName =
    'inline-flex items-center justify-center rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40';
  const toolbarButtonInactiveClassName = 'text-slate-300 hover:bg-white/8';
  const toolbarButtonActiveClassName = 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100';
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noreferrer noopener',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value.trim() ? sanitizeRichTextHtml(value) : '<p></p>',
    editable: !disabled,
    onUpdate({ editor: nextEditor }) {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    try {
      const nextHtml = value.trim() ? sanitizeRichTextHtml(value) : '<p></p>';
      const currentHtml = editor.getHTML();
      if (currentHtml !== nextHtml) {
        editor.commands.setContent(nextHtml, { emitUpdate: false });
      }
    } catch {
      // Editor might not be fully initialized yet, silently ignore
    }
  }, [value, editor]);

  const applyUppercase = () => {
    if (!editor || disabled) return;

    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, selectedText.toUpperCase())
      .run();
  };

  const setLink = () => {
    if (!editor || disabled) return;

    const { empty, from, to } = editor.state.selection;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ').trim();
    const urlRange = empty ? findUrlRangeAtCursor(editor) : null;
    const existingHref = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Paste a link', existingHref ?? urlRange?.text ?? selectedText);
    if (url == null) return;

    const normalizedUrl = sanitizeRichTextHtml(`<a href="${url}">link</a>`).match(/href="([^"]+)"/)?.[1];

    if (!normalizedUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    if (!empty) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalizedUrl }).run();
      return;
    }

    if (urlRange) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: urlRange.from, to: urlRange.to })
        .setLink({ href: normalizedUrl })
        .setTextSelection(urlRange.to)
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(`<a href="${normalizedUrl}" target="_blank" rel="noreferrer noopener">${normalizedUrl}</a>`)
      .run();
  };

  const clearFormatting = () => {
    if (!editor || disabled) return;

    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  const slashCommands = useMemo<SlashCommand[]>(
    () => [
      {
        id: 'paragraph',
        label: 'Paragraph',
        hint: 'Regular text block',
        keywords: ['p', 'paragraph', 'text'],
        action: () => editor?.chain().focus().setParagraph().run(),
      },
      {
        id: 'heading-1',
        label: 'Heading 1',
        hint: 'Big section title',
        keywords: ['h1', 'heading', 'title'],
        action: () => editor?.chain().focus().setHeading({ level: 1 }).run(),
      },
      {
        id: 'heading-2',
        label: 'Heading 2',
        hint: 'Medium section title',
        keywords: ['h2', 'heading', 'title'],
        action: () => editor?.chain().focus().setHeading({ level: 2 }).run(),
      },
      {
        id: 'heading-3',
        label: 'Heading 3',
        hint: 'Small section title',
        keywords: ['h3', 'heading', 'title'],
        action: () => editor?.chain().focus().setHeading({ level: 3 }).run(),
      },
      {
        id: 'bullet-list',
        label: 'Bullet List',
        hint: 'Create unordered list',
        keywords: ['list', 'bullet', 'ul'],
        action: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered-list',
        label: 'Numbered List',
        hint: 'Create ordered list',
        keywords: ['list', 'number', 'ordered', 'ol'],
        action: () => editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'blockquote',
        label: 'Quote',
        hint: 'Highlight quoted text',
        keywords: ['quote', 'blockquote'],
        action: () => editor?.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'code-block',
        label: 'Code Block',
        hint: 'Insert monospaced block',
        keywords: ['code', 'snippet', 'pre'],
        action: () => editor?.chain().focus().toggleCodeBlock().run(),
      },
    ],
    [editor]
  );

  const filteredSlashCommands = useMemo(() => {
    const normalizedQuery = slashQuery.trim().toLowerCase();
    if (!normalizedQuery) return slashCommands;

    return slashCommands.filter((item) => {
      const haystack = [item.label, item.hint, ...item.keywords].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [slashCommands, slashQuery]);

  const activeSlashIndex =
    filteredSlashCommands.length === 0
      ? 0
      : Math.min(slashActiveIndex, filteredSlashCommands.length - 1);

  useEffect(() => {
    if (!editor) return;

    const updateSlashState = () => {
      if (disabled || !editor.isFocused) {
        setSlashOpen(false);
        setSlashQuery('');
        return;
      }

      const { empty, $from } = editor.state.selection;
      if (!empty) {
        setSlashOpen(false);
        setSlashQuery('');
        return;
      }

      const textBeforeCursor = $from.parent.textContent.slice(0, $from.parentOffset);
      const match = textBeforeCursor.match(/(?:^|\s)\/([^\s/]*)$/);
      if (!match) {
        setSlashOpen(false);
        setSlashQuery('');
        return;
      }

      setSlashOpen(true);
      setSlashQuery(match[1] ?? '');
      setSlashActiveIndex(0);
    };

    editor.on('selectionUpdate', updateSlashState);
    editor.on('update', updateSlashState);

    return () => {
      editor.off('selectionUpdate', updateSlashState);
      editor.off('update', updateSlashState);
    };
  }, [disabled, editor]);

  const removeSlashTrigger = () => {
    if (!editor) return;

    const { $from } = editor.state.selection;
    const textBeforeCursor = $from.parent.textContent.slice(0, $from.parentOffset);
    const match = textBeforeCursor.match(/(?:^|\s)\/([^\s/]*)$/);
    if (!match) return;

    const matchedText = match[0];
    const startsWithSpace = matchedText.startsWith(' ');
    const startOffset = textBeforeCursor.length - matchedText.length + (startsWithSpace ? 1 : 0);
    const parentStart = $from.start();

    editor
      .chain()
      .focus()
      .deleteRange({
        from: parentStart + startOffset,
        to: parentStart + textBeforeCursor.length,
      })
      .run();
  };

  const applySlashCommand = (command: SlashCommand) => {
    removeSlashTrigger();
    command.action();
    setSlashOpen(false);
    setSlashQuery('');
    setSlashActiveIndex(0);
  };

  const editorIsEmpty = !value.trim() || isRichTextEmpty(value);

  const getToolbarButtonClassName = (active = false) =>
    [toolbarButtonClassName, active ? toolbarButtonActiveClassName : toolbarButtonInactiveClassName]
      .filter(Boolean)
      .join(' ');

  return (
    <div className={className}>
      <Toolbar.Root
        className={toolbarClassName}
        aria-label="Text formatting"
      >
        <Toolbar.ToggleGroup type="multiple" className="flex flex-wrap gap-1">
          <Toolbar.ToggleItem
            value="paragraph"
            className={getToolbarButtonClassName(editor?.isActive('paragraph'))}
            onClick={() => editor?.chain().focus().setParagraph().run()}
            disabled={disabled || !editor}
            aria-label="Paragraph"
          >
            <Type size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="h1"
            className={getToolbarButtonClassName(editor?.isActive('heading', { level: 1 }))}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={disabled || !editor}
            aria-label="Heading 1"
          >
            <Heading1 size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="h2"
            className={getToolbarButtonClassName(editor?.isActive('heading', { level: 2 }))}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={disabled || !editor}
            aria-label="Heading 2"
          >
            <Heading2 size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="h3"
            className={getToolbarButtonClassName(editor?.isActive('heading', { level: 3 }))}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={disabled || !editor}
            aria-label="Heading 3"
          >
            <Heading3 size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.Separator className="mx-1 w-px bg-white/10" />
          <Toolbar.ToggleItem
            value="bold"
            className={getToolbarButtonClassName(editor?.isActive('bold'))}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={disabled || !editor}
            aria-label="Bold"
          >
            <Bold size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="italic"
            className={getToolbarButtonClassName(editor?.isActive('italic'))}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={disabled || !editor}
            aria-label="Italic"
          >
            <Italic size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="strike"
            className={getToolbarButtonClassName(editor?.isActive('strike'))}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={disabled || !editor}
            aria-label="Strikethrough"
          >
            <Strikethrough size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="bullet-list"
            className={getToolbarButtonClassName(editor?.isActive('bulletList'))}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={disabled || !editor}
            aria-label="Bullet list"
          >
            <List size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="ordered-list"
            className={getToolbarButtonClassName(editor?.isActive('orderedList'))}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={disabled || !editor}
            aria-label="Numbered list"
          >
            <ListOrdered size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem
            value="blockquote"
            className={getToolbarButtonClassName(editor?.isActive('blockquote'))}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={disabled || !editor}
            aria-label="Quote"
          >
            <Quote size={15} aria-hidden="true" />
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>

        <Toolbar.Separator className="my-2 h-px bg-white/10" />

        <div className="flex flex-wrap gap-1">
          <Toolbar.Button
            className={getToolbarButtonClassName(false)}
            onClick={applyUppercase}
            disabled={disabled || !editor}
            aria-label="Uppercase"
          >
            Aa
          </Toolbar.Button>
          <Toolbar.Button
            className={getToolbarButtonClassName(editor?.isActive('link'))}
            onClick={setLink}
            disabled={disabled || !editor}
            aria-label="Link"
          >
            <LinkIcon size={15} aria-hidden="true" />
          </Toolbar.Button>
          <Toolbar.Button
            className={getToolbarButtonClassName(false)}
            onClick={clearFormatting}
            disabled={disabled || !editor}
            aria-label="Clear formatting"
          >
            <Eraser size={15} aria-hidden="true" />
          </Toolbar.Button>
        </div>
      </Toolbar.Root>

      <div className="relative">
        <div
          onKeyDownCapture={(event) => {
            if (!slashOpen) return;

            if (event.key === 'Escape') {
              event.preventDefault();
              setSlashOpen(false);
              setSlashQuery('');
              return;
            }

            if (filteredSlashCommands.length === 0) return;

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setSlashActiveIndex((prevIndex) => (prevIndex + 1) % filteredSlashCommands.length);
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setSlashActiveIndex((prevIndex) =>
                prevIndex === 0 ? filteredSlashCommands.length - 1 : prevIndex - 1
              );
              return;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              const command = filteredSlashCommands[activeSlashIndex];
              if (command) {
                applySlashCommand(command);
              }
            }
          }}
        >
          <EditorContent editor={editor} className="rich-text-editor min-h-36" data-testid="rich-text-editor" />
        </div>

        {slashOpen && (
          <div className="absolute left-2 top-2 z-20 w-72 overflow-hidden rounded-xl border border-cyan-300/25 bg-slate-900/95 shadow-2xl backdrop-blur">
            <div className="border-b border-white/10 px-3 py-2 text-xs text-slate-400">
              Type to filter blocks
            </div>

            {filteredSlashCommands.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No matching block</div>
            ) : (
              <ul className="max-h-64 overflow-auto py-1">
                {filteredSlashCommands.map((item, index) => {
                  const isActive = index === activeSlashIndex;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                          isActive ? 'bg-cyan-300/15 text-cyan-100' : 'text-slate-200 hover:bg-white/5'
                        }`}
                        onMouseEnter={() => setSlashActiveIndex(index)}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applySlashCommand(item);
                        }}
                      >
                        <span className="min-w-0 text-sm font-medium">{item.label}</span>
                        <span className="min-w-0 text-xs text-slate-400">{item.hint}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {editorIsEmpty && (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-slate-500">{placeholder}</span>
        )}
      </div>
    </div>
  );
};
