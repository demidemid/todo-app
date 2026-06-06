import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { Todo } from '../../types/todo';
import { normalizeTodoChecklist, parseChecklistItemTitles } from '../../utils/todoChecklist';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { useHotkeyHandler } from '../../hooks/useHotkey';

interface TodoChecklistSectionProps {
  checklist: Todo['checklist'];
  onChecklistTitleChange?: (title: string) => Promise<void> | void;
  onChecklistAddItem?: () => Promise<void> | void;
  onChecklistItemChange?: (itemId: string, updates: { title?: string; checked?: boolean }) => Promise<void> | void;
  onChecklistPasteItems?: (itemId: string, itemTitles: string[]) => Promise<void> | void;
  onChecklistDeleteItem?: (itemId: string) => Promise<void> | void;
}

export const TodoChecklistSection = ({
  checklist: rawChecklist,
  onChecklistTitleChange,
  onChecklistAddItem,
  onChecklistItemChange,
  onChecklistPasteItems,
  onChecklistDeleteItem,
}: TodoChecklistSectionProps) => {
  const checklist = useMemo(() => normalizeTodoChecklist(rawChecklist), [rawChecklist]);

  const [isEditingChecklistTitle, setIsEditingChecklistTitle] = useState(false);
  const [checklistTitleDraft, setChecklistTitleDraft] = useState('');
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [checklistItemTitleDraft, setChecklistItemTitleDraft] = useState('');
  const [focusNewChecklistItem, setFocusNewChecklistItem] = useState(false);
  const checklistItems = useMemo(() => checklist?.items ?? [], [checklist]);
  const previousChecklistItemIdsRef = useRef<string[]>(checklistItems.map((item) => item.id));
  const hadChecklistRef = useRef(Boolean(checklist));

  const saveChecklistTitle = async () => {
    if (!onChecklistTitleChange || !checklist) {
      setIsEditingChecklistTitle(false);
      return;
    }

    await onChecklistTitleChange(checklistTitleDraft);
    setIsEditingChecklistTitle(false);
  };

  const startChecklistItemEdit = (itemId: string, initialTitle: string) => {
    setEditingChecklistItemId(itemId);
    setChecklistItemTitleDraft(initialTitle);
  };

  const cancelChecklistItemEdit = () => {
    setEditingChecklistItemId(null);
    setChecklistItemTitleDraft('');
  };

  const saveChecklistItemTitle = async () => {
    if (!editingChecklistItemId) return;

    if (!onChecklistItemChange) {
      cancelChecklistItemEdit();
      return;
    }

    await onChecklistItemChange(editingChecklistItemId, { title: checklistItemTitleDraft });
    cancelChecklistItemEdit();
  };

  const handleChecklistTitleEnter = useHotkeyHandler('enter', (event) => {
    event.preventDefault();
    void saveChecklistTitle();
  });

  const handleChecklistTitleEscape = useHotkeyHandler('escape', (event) => {
    event.preventDefault();
    setChecklistTitleDraft(checklist?.title ?? '');
    setIsEditingChecklistTitle(false);
  });

  const handleChecklistTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    handleChecklistTitleEnter(event);
    handleChecklistTitleEscape(event);
  };

  const handleChecklistItemEnter = useHotkeyHandler('enter', (event) => {
    event.preventDefault();
    void saveChecklistItemTitle();
  });

  const handleChecklistItemEscape = useHotkeyHandler('escape', (event) => {
    event.preventDefault();
    cancelChecklistItemEdit();
  });

  const handleChecklistItemKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    handleChecklistItemEnter(event);
    handleChecklistItemEscape(event);
  };

  const handleChecklistItemPaste = async (event: React.ClipboardEvent<HTMLInputElement>, itemId: string) => {
    if (!onChecklistPasteItems) {
      return;
    }

    const parsedTitles = parseChecklistItemTitles(event.clipboardData.getData('text'));
    if (parsedTitles.length <= 1) {
      return;
    }

    event.preventDefault();

    try {
      await onChecklistPasteItems(itemId, parsedTitles);
      cancelChecklistItemEdit();
    } catch {
      // Ignore paste handler errors and keep the current edit session active.
    }
  };

  useEffect(() => {
    const currentItemIds = checklistItems.map((item) => item.id);
    const hadChecklist = hadChecklistRef.current;

    if (!hadChecklist && checklist && editingChecklistItemId === null) {
      const firstItem = checklistItems[0];
      if (firstItem && firstItem.title.trim() === '') {
        queueMicrotask(() => {
          startChecklistItemEdit(firstItem.id, firstItem.title);
        });
      }
    }

    if (focusNewChecklistItem && checklist) {
      const previousItemIds = new Set(previousChecklistItemIdsRef.current);
      const newItem = checklistItems.find((item) => !previousItemIds.has(item.id));

      if (newItem) {
        startChecklistItemEdit(newItem.id, newItem.title);
        setFocusNewChecklistItem(false);
      }
    }

    previousChecklistItemIdsRef.current = currentItemIds;
    hadChecklistRef.current = Boolean(checklist);
  }, [checklist, checklistItems, editingChecklistItemId, focusNewChecklistItem]);

  const handleAddChecklistItem = async () => {
    if (!onChecklistAddItem) {
      return;
    }

    setFocusNewChecklistItem(true);

    try {
      await onChecklistAddItem();
    } catch {
      setFocusNewChecklistItem(false);
    }
  };

  if (!checklist) return null;

  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-slate-950/40 p-3" data-testid="todo-checklist-section">
      <div className="mb-2 flex items-center justify-between gap-2">
        {isEditingChecklistTitle ? (
          <Input
            type="text"
            value={checklistTitleDraft}
            onChange={(event) => setChecklistTitleDraft(event.target.value)}
            className="h-8 text-sm"
            autoFocus
            onBlur={() => {
              void saveChecklistTitle();
            }}
            onKeyDown={handleChecklistTitleKeyDown}
            data-testid="todo-checklist-title-input"
          />
        ) : (
          <button
            type="button"
            className="text-left text-xs font-semibold uppercase tracking-wide text-slate-300 hover:text-cyan-200"
            onClick={() => {
              setChecklistTitleDraft(checklist.title);
              setIsEditingChecklistTitle(true);
            }}
            data-testid="todo-checklist-title"
          >
            {checklist.title}
          </button>
        )}

        <IconButton
          variant="neutral"
          size="sm"
          label="Add checklist item"
          className="h-7! w-7! rounded-full! p-0!"
          onClick={() => {
            void handleAddChecklistItem();
          }}
          data-testid="todo-checklist-add-item"
        >
          <Plus size={14} />
        </IconButton>
      </div>

      <ul className="space-y-1.5">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2" data-testid={`todo-checklist-item-${item.id}`}>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(event) => {
                void onChecklistItemChange?.(item.id, { checked: event.target.checked });
              }}
              className="h-4 w-4 rounded border-white/30 bg-slate-900 text-cyan-300"
              data-testid={`todo-checklist-toggle-${item.id}`}
            />
            {editingChecklistItemId === item.id ? (
              <>
                <Input
                  type="text"
                  value={checklistItemTitleDraft}
                  onChange={(event) => setChecklistItemTitleDraft(event.target.value)}
                  className="h-8 flex-1"
                  autoFocus
                  onKeyDown={handleChecklistItemKeyDown}
                  onPaste={(event) => {
                    void handleChecklistItemPaste(event, item.id);
                  }}
                  data-testid={`todo-checklist-item-input-${item.id}`}
                />
                <IconButton
                  variant="primary"
                  size="sm"
                  label={`Save checklist item ${item.title}`}
                  className="h-6! w-6! rounded-full! p-0!"
                  onClick={() => {
                    void saveChecklistItemTitle();
                  }}
                  data-testid={`todo-checklist-item-save-${item.id}`}
                >
                  <Check size={12} />
                </IconButton>
                <IconButton
                  variant="neutral"
                  size="sm"
                  label={`Cancel checklist item edit ${item.title}`}
                  className="h-6! w-6! rounded-full! p-0!"
                  onClick={cancelChecklistItemEdit}
                  data-testid={`todo-checklist-item-cancel-${item.id}`}
                >
                  <X size={12} />
                </IconButton>
              </>
            ) : (
              <button
                type="button"
                className={`text-left text-sm hover:text-cyan-200 ${item.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                onClick={() => startChecklistItemEdit(item.id, item.title)}
                data-testid={`todo-checklist-item-title-${item.id}`}
              >
                {item.title}
              </button>
            )}
            <IconButton
              variant="danger"
              size="sm"
              label={`Delete checklist item ${item.title}`}
              className="ml-auto h-auto! w-auto! rounded-none! border-transparent! bg-transparent! p-0! text-rose-300 hover:bg-transparent! hover:text-rose-200"
              onClick={() => {
                void onChecklistDeleteItem?.(item.id);
              }}
              data-testid={`todo-checklist-delete-${item.id}`}
            >
              <X size={12} />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
};
