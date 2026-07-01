import { Archive, Copy, MessageCircle, Trash2 } from 'lucide-react';
import { FaFile, FaFileArchive, FaFileAudio, FaFileCode, FaFileExcel, FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileVideo, FaFileWord } from 'react-icons/fa';
import type { Todo } from '../../types/todo';
import type { DueDateState } from '../../utils/dueDate';
import { normalizeTodoChecklists } from '../../utils/todoChecklist';
import { RichTextEditor } from '../todo-modal/RichTextEditor';
import { Button } from '../ui/Button';
import { EllipsisMenu } from '../ui/EllipsisMenu';
import { Input } from '../ui/Input';
import { TodoCardDueDateBadge } from './TodoCardDueDateBadge';
import { getChecklistBadgePalette } from './checklistBadgePalette';

const extensionFromFileName = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === normalized.length - 1) return '';
  return normalized.slice(dotIndex + 1);
};

const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  const extension = extensionFromFileName(fileName);

  if (['pdf'].includes(extension)) return <FaFilePdf className="shrink-0 text-rose-300" aria-hidden="true" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(extension)) return <FaFileImage className="shrink-0 text-emerald-300" aria-hidden="true" />;
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(extension)) return <FaFileVideo className="shrink-0 text-cyan-300" aria-hidden="true" />;
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) return <FaFileAudio className="shrink-0 text-fuchsia-300" aria-hidden="true" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return <FaFileArchive className="shrink-0 text-amber-300" aria-hidden="true" />;
  if (['doc', 'docx', 'rtf', 'odt'].includes(extension)) return <FaFileWord className="shrink-0 text-sky-300" aria-hidden="true" />;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return <FaFileExcel className="shrink-0 text-green-300" aria-hidden="true" />;
  if (['ppt', 'pptx', 'odp'].includes(extension)) return <FaFilePowerpoint className="shrink-0 text-orange-300" aria-hidden="true" />;
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'md', 'xml', 'yml', 'yaml'].includes(extension)) return <FaFileCode className="shrink-0 text-violet-300" aria-hidden="true" />;

  return <FaFile className="shrink-0 text-slate-300" aria-hidden="true" />;
};

const normalizeSafeUrl = (rawUrl: string): string | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

const normalizeTags = (tags: string[] | undefined): string[] => {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalizedTags));
};

const getTagToneClassName = (tag: string): string => {
  const palette = [
    'border-cyan-300/35 bg-cyan-400/15 text-cyan-100',
    'border-emerald-300/35 bg-emerald-400/15 text-emerald-100',
    'border-amber-300/35 bg-amber-400/15 text-amber-100',
    'border-rose-300/35 bg-rose-400/15 text-rose-100',
    'border-indigo-300/35 bg-indigo-400/15 text-indigo-100',
    'border-fuchsia-300/35 bg-fuchsia-400/15 text-fuchsia-100',
    'border-lime-300/35 bg-lime-400/15 text-lime-100',
  ];

  const hash = Array.from(tag).reduce((acc, char) => (acc + char.charCodeAt(0)) % palette.length, 0);
  return palette[hash];
};

interface DashboardTodoCardContentProps {
  todo: Todo;
  editing: boolean;
  editingTitle: string;
  editingDescription: string;
  dueState: DueDateState;
  dueLabel: string | null;
  dueDateHint?: string;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, todoId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (todoId: string) => void;
  onMenuArchive: (todoId: string) => void;
  onMenuClone: (todoId: string) => void;
  onMenuDelete: (todoId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const DashboardTodoCardContent = ({
  todo,
  editing,
  editingTitle,
  editingDescription,
  dueState,
  dueLabel,
  dueDateHint,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditKeyDown,
  onCancelEdit,
  onSaveEdit,
  onMenuArchive,
  onMenuClone,
  onMenuDelete,
  onTagClick,
}: DashboardTodoCardContentProps) => {
  const tags = normalizeTags(todo.tags);

  if (editing) {
    return (
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Title</label>
        <Input
          type="text"
          value={editingTitle}
          onChange={(event) => onEditTitleChange(event.target.value)}
          onKeyDown={(event) => onEditKeyDown(event, todo.id)}
          data-testid={`edit-title-${todo.id}`}
          className="mb-3 rounded-md px-2 py-1.5 text-sm"
          autoFocus
        />

        <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Description</label>
        <RichTextEditor
          value={editingDescription}
          onChange={onEditDescriptionChange}
          className="mb-3"
          placeholder="Write a description with formatting..."
        />

        <div className="flex justify-end gap-2">
          <Button
            onClick={onCancelEdit}
            data-testid={`edit-cancel-${todo.id}`}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSaveEdit(todo.id)}
            data-testid={`edit-save-${todo.id}`}
            size="sm"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-1 flex-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-slate-100">{todo.title}</p>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid={`card-tags-${todo.id}`}>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTagToneClassName(tag)}`}
                  data-testid={`card-tag-pill-${todo.id}-${tag}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTagClick?.(tag);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {(() => {
            const checklists = normalizeTodoChecklists(todo.checklists, todo.checklist);
            if (checklists.length === 0) return null;

            return (
              <div className="mt-2 space-y-1.5">
                {checklists.map((checklist, checklistIndex) => {
                  const totalItems = checklist.items.length;
                  const closedItems = checklist.items.filter((item) => item.checked).length;
                  const checklistBadgePalette = getChecklistBadgePalette(closedItems, totalItems);
                  const suffix = checklistIndex === 0 ? '' : `-${checklistIndex}`;

                  return (
                    <div
                      key={`checklist-badge-${todo.id}-${checklistIndex}`}
                      className={`inline-flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] font-medium ${checklistBadgePalette}`}
                      data-testid={`card-checklist-badge-${todo.id}${suffix}`}
                    >
                      <span className="truncate" data-testid={`card-checklist-title-${todo.id}${suffix}`}>
                        {checklist.title}
                      </span>
                      <span className="shrink-0" data-testid={`card-checklist-progress-${todo.id}${suffix}`}>
                        {closedItems}/{totalItems}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {Array.isArray(todo.files) && todo.files.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {todo.files.map((file) => (
                <li key={file.id} className="text-xs text-slate-300">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <FileTypeIcon fileName={file.name} />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={(event) => event.stopPropagation()}
                      className="truncate text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                    >
                      {file.name}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {Array.isArray(todo.links) && todo.links.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {todo.links.map((link, i) => (
                (() => {
                  const safeUrl = normalizeSafeUrl(link.url);
                  if (!safeUrl) return null;

                  return (
                    <li key={safeUrl + i} className="flex items-center gap-1.5 text-xs text-cyan-200">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-cyan-300" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="truncate max-w-60 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                        title={safeUrl}
                      >
                        {link.name ? link.name : safeUrl}
                      </a>
                    </li>
                  );
                })()
              ))}
            </ul>
          )}
        </div>
        <EllipsisMenu
          trigger={{
            label: `Open actions for ${todo.title}`,
            testId: `card-menu-trigger-${todo.id}`,
          }}
          menu={{ testId: 'card-menu' }}
          stopPropagation
          classNames={{ root: 'shrink' }}
          items={[
            {
              id: 'archive',
              label: 'Archive',
              icon: <Archive size={14} aria-hidden="true" />,
              onSelect: () => onMenuArchive(todo.id),
              testId: 'card-menu-archive',
            },
            {
              id: 'clone',
              label: 'Clone',
              icon: <Copy size={14} aria-hidden="true" />,
              onSelect: () => onMenuClone(todo.id),
              testId: 'card-menu-clone',
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <Trash2 size={14} aria-hidden="true" />,
              onSelect: () => onMenuDelete(todo.id),
              testId: 'card-menu-delete',
              variant: 'danger' as const,
            },
          ]}
        />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 inline-flex pr-1 items-center justify-between gap-2 text-[11px] font-medium text-white">
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={12} className="text-white" aria-hidden="true" />
          <span>{todo.comments?.length ?? 0}</span>
        </span>
        <TodoCardDueDateBadge
          dueLabel={dueLabel}
          dueState={dueState}
          testId={`card-due-badge-${todo.id}`}
          title={dueDateHint}
        />
      </div>
    </div>
  );
};
