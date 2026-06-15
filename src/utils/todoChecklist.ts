import type { Todo, TodoChecklist, TodoChecklistItem } from '../types/todo';

export const DEFAULT_CHECKLIST_TITLE = 'check list';

const stripChecklistPrefix = (value: string): string => value
  .replace(/^[-*•—]?\s*\[(?: |x|X)\]\s+/, '')
  .replace(/^[-*•—]\s+/, '')
  .replace(/^\d+[.)]\s+/, '')
  .replace(/^;+\s*/, '')
  .trim();

export const parseChecklistItemTitles = (rawText: string): string[] => {
  const normalized = rawText.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const chunks = normalized.includes('\n') ? normalized.split('\n') : normalized.split(';');

  return chunks
    .map((chunk) => stripChecklistPrefix(chunk.trim()))
    .filter((chunk) => chunk.length > 0);
};

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
          title,
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

export const normalizeTodoChecklists = (
  checklists: Todo['checklists'],
  fallbackChecklist?: Todo['checklist'],
  options?: { createItemId?: () => string }
): TodoChecklist[] => {
  if (Array.isArray(checklists)) {
    return checklists
      .map((checklist) => normalizeTodoChecklist(checklist, options))
      .filter((checklist): checklist is TodoChecklist => checklist !== null);
  }

  const normalizedFallback = normalizeTodoChecklist(fallbackChecklist, options);
  return normalizedFallback ? [normalizedFallback] : [];
};
