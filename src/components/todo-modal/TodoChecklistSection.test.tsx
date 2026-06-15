import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { TodoChecklistSection } from './TodoChecklistSection';

const checklist: NonNullable<Todo['checklist']> = {
  title: 'check list',
  items: [{ id: 'item-1', title: '', checked: false }],
};

describe('TodoChecklistSection paste behavior', () => {
  it('saves checklist item on Enter', async () => {
    const onChecklistItemChange = vi.fn().mockResolvedValue(undefined);
    const onChecklistAddItem = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistItemChange={onChecklistItemChange}
        onChecklistAddItem={onChecklistAddItem}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    fireEvent.change(screen.getByTestId('todo-checklist-item-input-item-1'), { target: { value: 'edited item' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-item-input-item-1'), { key: 'Enter' });

    await waitFor(() => {
      expect(onChecklistItemChange).toHaveBeenCalledWith('item-1', { title: 'edited item' });
    });
    expect(onChecklistAddItem).not.toHaveBeenCalled();
  });

  it('saves checklist item and creates next one on Shift+Enter', async () => {
    const onChecklistItemChange = vi.fn().mockResolvedValue(undefined);
    const onChecklistAddItem = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistItemChange={onChecklistItemChange}
        onChecklistAddItem={onChecklistAddItem}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    fireEvent.change(screen.getByTestId('todo-checklist-item-input-item-1'), { target: { value: 'edited item' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-item-input-item-1'), { key: 'Enter', shiftKey: true });

    await waitFor(() => {
      expect(onChecklistItemChange).toHaveBeenCalledWith('item-1', { title: 'edited item' });
      expect(onChecklistAddItem).toHaveBeenCalledTimes(1);
    });
  });

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
