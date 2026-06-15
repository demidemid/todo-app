import { Pencil } from 'lucide-react';
import { IconButton } from './IconButton';

interface InlineEditableHeadingProps {
  text: string;
  onStartEdit: () => void;
  editLabel: string;
  editButtonTestId?: string;
}

export const InlineEditableHeading = ({ text, onStartEdit, editLabel, editButtonTestId }: InlineEditableHeadingProps) => {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) {
    return null;
  }

  const editButton = (
    <IconButton
      variant="neutral"
      size="md"
      label={editLabel}
      onClick={onStartEdit}
      className="ml-2 align-middle"
      data-testid={editButtonTestId}
    >
      <Pencil size={14} />
    </IconButton>
  );

  if (words.length === 1) {
    return (
      <span className="inline-flex items-center whitespace-nowrap">
        {words[0]}
        {editButton}
      </span>
    );
  }

  return (
    <>
      {words.slice(0, -1).join(' ') + ' '}
      <span className="inline-flex items-center whitespace-nowrap">
        {words[words.length - 1]}
        {editButton}
      </span>
    </>
  );
};