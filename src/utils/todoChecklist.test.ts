import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHECKLIST_TITLE, normalizeTodoChecklist, parseChecklistItemTitles } from './todoChecklist';

describe('parseChecklistItemTitles', () => {
  it('splits multi-line text into checklist item titles', () => {
    expect(parseChecklistItemTitles('first\nsecond\nthird')).toEqual(['first', 'second', 'third']);
  });

  it('splits semicolon text when no line breaks are present', () => {
    expect(parseChecklistItemTitles('first; second ; third')).toEqual(['first', 'second', 'third']);
  });

  it('strips common list prefixes and drops empty entries', () => {
    expect(parseChecklistItemTitles('- one\n2. two\n[x] three\n\n;')).toEqual(['one', 'two', 'three']);
  });
});

describe('normalizeTodoChecklist', () => {
  it('returns null only for non-object checklist payloads', () => {
    expect(normalizeTodoChecklist(undefined)).toBeNull();
    expect(normalizeTodoChecklist(null as never)).toBeNull();
  });

  it('normalizes partial checklist payloads to defaults', () => {
    expect(normalizeTodoChecklist({} as never)).toEqual({
      title: DEFAULT_CHECKLIST_TITLE,
      items: [],
    });

    expect(normalizeTodoChecklist({ title: 'x' } as never)).toEqual({
      title: 'x',
      items: [],
    });

    expect(normalizeTodoChecklist({ items: [] } as never)).toEqual({
      title: DEFAULT_CHECKLIST_TITLE,
      items: [],
    });
  });

  it('normalizes checklist title and keeps empty checklist item titles', () => {
    const result = normalizeTodoChecklist({
      title: '   ',
      items: [
        { id: 'item-1', title: '   ', checked: false },
      ],
    });

    expect(result).toEqual({
      title: DEFAULT_CHECKLIST_TITLE,
      items: [
        { id: 'item-1', title: '', checked: false },
      ],
    });
  });

  it('trims valid title values', () => {
    const result = normalizeTodoChecklist({
      title: '  Sprint checklist  ',
      items: [
        { id: 'item-1', title: '  done  ', checked: true },
      ],
    });

    expect(result).toEqual({
      title: 'Sprint checklist',
      items: [
        { id: 'item-1', title: 'done', checked: true },
      ],
    });
  });

  it('drops invalid items and keeps valid ones', () => {
    const result = normalizeTodoChecklist({
      title: 'Checklist',
      items: [
        null,
        { title: 'no id', checked: false },
        { id: '', title: 'blank id', checked: false },
        { id: 'item-1', title: 'ok', checked: true },
      ] as never[],
    });

    expect(result).toEqual({
      title: 'Checklist',
      items: [{ id: 'item-1', title: 'ok', checked: true }],
    });
  });

  it('uses createItemId when item id is missing', () => {
    const createItemId = vi.fn().mockReturnValue('generated-id');

    const result = normalizeTodoChecklist(
      {
        title: 'Checklist',
        items: [{ title: 'item', checked: false } as never],
      },
      { createItemId }
    );

    expect(createItemId).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      title: 'Checklist',
      items: [{ id: 'generated-id', title: 'item', checked: false }],
    });
  });
});
