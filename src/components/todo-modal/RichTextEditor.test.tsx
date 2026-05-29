import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';

type SlashListener = () => void;

type MockEditor = {
  isFocused: boolean;
  state: {
    selection: {
      empty: boolean;
      from: number;
      to: number;
      $from: {
        parent: { textContent: string };
        parentOffset: number;
        start: () => number;
      };
    };
    doc: {
      textBetween: ReturnType<typeof vi.fn>;
    };
  };
  setEditable: ReturnType<typeof vi.fn>;
  getHTML: ReturnType<typeof vi.fn>;
  commands: {
    setContent: ReturnType<typeof vi.fn>;
  };
  chain: ReturnType<typeof vi.fn>;
  getAttributes: ReturnType<typeof vi.fn>;
  isActive: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: (event: 'selectionUpdate' | 'update') => void;
  chainApi: {
    focus: ReturnType<typeof vi.fn>;
    insertContentAt: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    unsetLink: ReturnType<typeof vi.fn>;
    extendMarkRange: ReturnType<typeof vi.fn>;
    setLink: ReturnType<typeof vi.fn>;
    setTextSelection: ReturnType<typeof vi.fn>;
    insertContent: ReturnType<typeof vi.fn>;
    unsetAllMarks: ReturnType<typeof vi.fn>;
    clearNodes: ReturnType<typeof vi.fn>;
    deleteRange: ReturnType<typeof vi.fn>;
    setParagraph: ReturnType<typeof vi.fn>;
    setHeading: ReturnType<typeof vi.fn>;
    toggleBulletList: ReturnType<typeof vi.fn>;
    toggleOrderedList: ReturnType<typeof vi.fn>;
    toggleBlockquote: ReturnType<typeof vi.fn>;
    toggleCodeBlock: ReturnType<typeof vi.fn>;
    toggleHeading: ReturnType<typeof vi.fn>;
    toggleBold: ReturnType<typeof vi.fn>;
    toggleItalic: ReturnType<typeof vi.fn>;
    toggleStrike: ReturnType<typeof vi.fn>;
  };
};

const { useEditorMock } = vi.hoisted(() => ({
  useEditorMock: vi.fn(),
}));

vi.mock('@tiptap/react', async () => {
  const React = await import('react');

  return {
    useEditor: useEditorMock,
    EditorContent: ({ className, ...rest }: { className?: string; [key: string]: unknown }) =>
      React.createElement('div', {
        ...rest,
        className,
      }),
  };
});

const createMockEditor = (): MockEditor => {
  const listeners = new Map<'selectionUpdate' | 'update', Set<SlashListener>>();
  listeners.set('selectionUpdate', new Set());
  listeners.set('update', new Set());

  const chainApi = {
    focus: vi.fn(),
    insertContentAt: vi.fn(),
    run: vi.fn(),
    unsetLink: vi.fn(),
    extendMarkRange: vi.fn(),
    setLink: vi.fn(),
    setTextSelection: vi.fn(),
    insertContent: vi.fn(),
    unsetAllMarks: vi.fn(),
    clearNodes: vi.fn(),
    deleteRange: vi.fn(),
    setParagraph: vi.fn(),
    setHeading: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
    toggleBlockquote: vi.fn(),
    toggleCodeBlock: vi.fn(),
    toggleHeading: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleStrike: vi.fn(),
  };

  for (const method of Object.keys(chainApi) as Array<keyof typeof chainApi>) {
    if (method === 'run') {
      chainApi.run.mockReturnValue(true);
    } else {
      chainApi[method].mockReturnValue(chainApi);
    }
  }

  const editor: MockEditor = {
    isFocused: false,
    state: {
      selection: {
        empty: false,
        from: 1,
        to: 4,
        $from: {
          parent: { textContent: '' },
          parentOffset: 0,
          start: () => 1,
        },
      },
      doc: {
        textBetween: vi.fn().mockReturnValue('abc'),
      },
    },
    setEditable: vi.fn(),
    getHTML: vi.fn().mockReturnValue('<p>from-editor</p>'),
    commands: {
      setContent: vi.fn(),
    },
    chain: vi.fn().mockReturnValue(chainApi),
    getAttributes: vi.fn().mockReturnValue({}),
    isActive: vi.fn().mockReturnValue(false),
    on: vi.fn((event: 'selectionUpdate' | 'update', listener: SlashListener) => {
      listeners.get(event)?.add(listener);
    }),
    off: vi.fn((event: 'selectionUpdate' | 'update', listener: SlashListener) => {
      listeners.get(event)?.delete(listener);
    }),
    emit: (event: 'selectionUpdate' | 'update') => {
      for (const listener of listeners.get(event) ?? []) {
        listener();
      }
    },
    chainApi,
  };

  return editor;
};

describe('RichTextEditor', () => {
  let editor: MockEditor;
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    editor = createMockEditor();
    useEditorMock.mockReturnValue(editor);
  });

  it('syncs external value into editor when editor is not focused', () => {
    editor.isFocused = false;
    editor.getHTML.mockReturnValue('<p>stale</p>');

    render(<RichTextEditor value="<p>next</p>" onChange={onChange} />);

    expect(editor.commands.setContent).toHaveBeenCalledWith('<p>next</p>', { emitUpdate: false });
  });

  it('does not sync external value while editor is focused', () => {
    editor.isFocused = true;

    render(<RichTextEditor value="<p>next</p>" onChange={onChange} />);

    expect(editor.commands.setContent).not.toHaveBeenCalled();
  });

  it('uppercases selected text through chain command', () => {
    editor.state.selection.empty = false;
    editor.state.selection.from = 3;
    editor.state.selection.to = 9;
    editor.state.doc.textBetween.mockReturnValue('hello!');

    render(<RichTextEditor value="<p>hello</p>" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Uppercase'));

    expect(editor.chainApi.insertContentAt).toHaveBeenCalledWith({ from: 3, to: 9 }, 'HELLO!');
    expect(editor.chainApi.run).toHaveBeenCalled();
  });

  it('handles selected text link flow and invalid link fallback', () => {
    editor.state.selection.empty = false;
    editor.state.selection.from = 1;
    editor.state.selection.to = 8;
    editor.state.doc.textBetween.mockReturnValue('example');

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    render(<RichTextEditor value="<p>example</p>" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Link'));

    expect(editor.chainApi.extendMarkRange).toHaveBeenCalledWith('link');
    expect(editor.chainApi.setLink).toHaveBeenCalledWith({ href: 'https://example.com/' });

    promptSpy.mockReturnValueOnce('javascript:alert(1)');
    fireEvent.click(screen.getByLabelText('Link'));
    expect(editor.chainApi.unsetLink).toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('links detected url at cursor and inserts raw url when no range is found', () => {
    editor.state.selection.empty = true;
    editor.state.selection.$from.parent.textContent = 'visit www.site.dev now';
    editor.state.selection.$from.parentOffset = 10;
    editor.state.selection.$from.start = () => 20;

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://site.dev');

    render(<RichTextEditor value="<p>visit</p>" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Link'));

    expect(editor.chainApi.setTextSelection).toHaveBeenCalledTimes(2);
    expect(editor.chainApi.setLink).toHaveBeenCalledWith({ href: 'https://site.dev/' });

    editor.state.selection.$from.parent.textContent = 'plain text';
    editor.state.selection.$from.parentOffset = 5;
    promptSpy.mockReturnValueOnce('https://plain.dev');
    fireEvent.click(screen.getByLabelText('Link'));

    expect(editor.chainApi.insertContent).toHaveBeenCalledWith(
      '<a href="https://plain.dev/" target="_blank" rel="noreferrer noopener">https://plain.dev/</a>'
    );

    promptSpy.mockRestore();
  });

  it('supports slash menu keyboard navigation and command execution', () => {
    editor.isFocused = true;
    editor.state.selection.empty = true;
    editor.state.selection.$from.parent.textContent = '/he';
    editor.state.selection.$from.parentOffset = 3;
    editor.state.selection.$from.start = () => 100;

    render(<RichTextEditor value="" onChange={onChange} />);

    act(() => {
      editor.emit('selectionUpdate');
    });

    expect(screen.getByText('Type to filter blocks')).toBeInTheDocument();

    const editorElement = screen.getByTestId('rich-text-editor');
    fireEvent.keyDown(editorElement, { key: 'ArrowDown' });
    fireEvent.keyDown(editorElement, { key: 'Enter' });

    expect(editor.chainApi.deleteRange).toHaveBeenCalledWith({ from: 100, to: 103 });
    expect(editor.chainApi.setHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it('shows no-match slash state and closes on Escape', () => {
    editor.isFocused = true;
    editor.state.selection.empty = true;
    editor.state.selection.$from.parent.textContent = '/zzzzz';
    editor.state.selection.$from.parentOffset = 6;

    render(<RichTextEditor value="" onChange={onChange} />);

    act(() => {
      editor.emit('update');
    });

    expect(screen.getByText('No matching block')).toBeInTheDocument();

    const editorElement = screen.getByTestId('rich-text-editor');
    fireEvent.keyDown(editorElement, { key: 'ArrowDown' });
    fireEvent.keyDown(editorElement, { key: 'Escape' });

    expect(screen.queryByText('No matching block')).not.toBeInTheDocument();
  });
});