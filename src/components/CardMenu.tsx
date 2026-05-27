import React, { useRef, useEffect } from 'react';


interface CardMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<Record<string, HTMLButtonElement | null>>;
  anchorId: string;
}

export const CardMenu: React.FC<CardMenuProps> = ({ onEdit, onDelete, onClose, anchorRef, anchorId }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchorBtn = anchorRef.current[anchorId];
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorBtn &&
        !anchorBtn.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef, anchorId]);

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-8 z-50 w-32 rounded-lg border border-white/10 bg-slate-900 shadow-lg"
      data-testid="card-menu"
    >
      <button
        className="block w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-cyan-400/10"
        onClick={() => {
          onEdit();
          onClose();
        }}
        data-testid="card-menu-edit"
      >
        Edit
      </button>
      <button
        className="block w-full px-4 py-2 text-left text-sm text-rose-200 hover:bg-rose-400/10"
        onClick={() => {
          onDelete();
          onClose();
        }}
        data-testid="card-menu-delete"
      >
        Delete
      </button>
    </div>
  );
};
