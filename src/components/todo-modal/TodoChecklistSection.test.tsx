import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { TodoChecklistSection } from './TodoChecklistSection';

const checklist: NonNullable<Todo['checklist']> = {
  title: 'check list',
  items: [{ id: 'item-1', title: '', checked: false }],
};

describe('TodoChecklistSection paste behavior', () => {
  it('parses semicolon-separated pasted text and forwards multiple items', async () => {
    const onChecklistPasteItems = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistPasteItems={onChecklistPasteItems}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    const input = screen.getByTestId('todo-checklist-item-input-item-1');

    const pasteEvent = createEvent.paste(input);
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => 'first; second ; third' },
      configurable: true,
    });

    fireEvent(input, pasteEvent);

    await waitFor(() => {
      expect(onChecklistPasteItems).toHaveBeenCalledWith('item-1', ['first', 'second', 'third']);
    });
    expect(pasteEvent.defaultPrevented).toBe(true);
  });

  it('does not intercept single-item paste', () => {
    const onChecklistPasteItems = vi.fn();

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistPasteItems={onChecklistPasteItems}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    const input = screen.getByTestId('todo-checklist-item-input-item-1');

    const pasteEvent = createEvent.paste(input);
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => 'single item' },
      configurable: true,
    });

    fireEvent(input, pasteEvent);

    expect(onChecklistPasteItems).not.toHaveBeenCalled();
    expect(pasteEvent.defaultPrevented).toBe(false);
    expect(screen.getByTestId('todo-checklist-item-input-item-1')).toBeInTheDocument();
  });

  it('keeps edit session active when paste handler fails', async () => {
    const onChecklistPasteItems = vi.fn().mockRejectedValue(new Error('fail'));

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistPasteItems={onChecklistPasteItems}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    const input = screen.getByTestId('todo-checklist-item-input-item-1');

    const pasteEvent = createEvent.paste(input);
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => 'first\nsecond' },
      configurable: true,
    });

    fireEvent(input, pasteEvent);

    await waitFor(() => {
      expect(onChecklistPasteItems).toHaveBeenCalledWith('item-1', ['first', 'second']);
    });
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(screen.getByTestId('todo-checklist-item-input-item-1')).toBeInTheDocument();
  });
});
