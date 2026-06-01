import type { Todo, TodoChecklist, TodoChecklistItem } from '../types/todo';

export const DEFAULT_CHECKLIST_TITLE = 'check list';
export const DEFAULT_CHECKLIST_ITEM_TITLE = 'item';

export const normalizeTodoChecklist = (
  checklist: Todo['checklist'],
  options?: { createItemId?: () => string }
): TodoChecklist | null => {
  if (!checklist || typeof checklist !== 'object') return null;

  const normalizedTitle = typeof checklist.title === 'string' && checklist.title.trim()
    ? checklist.title.trim()
    : DEFAULT_CHECKLIST_TITLE;

  const normalizedItems = Array.isArray(checklist.items)
    ? checklist.items
      .map((item): TodoChecklistItem | null => {
        if (!item || typeof item !== 'object') return null;
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const itemId = typeof item.id === 'string' && item.id.trim()
          ? item.id
          : options?.createItemId?.();

        if (!itemId) return null;

        return {
          id: itemId,
          title: title || DEFAULT_CHECKLIST_ITEM_TITLE,
          checked: Boolean(item.checked),
        };
      })
      .filter((item): item is TodoChecklistItem => item !== null)
    : [];

  return {
    title: normalizedTitle,
    items: normalizedItems,
  };
};
