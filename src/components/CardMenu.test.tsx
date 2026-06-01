import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { CardMenu } from './CardMenu';

describe('CardMenu', () => {
  const onEdit = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const anchorId = 'todo-1';
  const anchorRef = createRef<Record<string, HTMLButtonElement | null>>();

  beforeEach(() => {
    vi.clearAllMocks();
    const button = document.createElement('button');
    button.setAttribute('data-testid', 'anchor-button');
    document.body.appendChild(button);
    anchorRef.current = { [anchorId]: button };
  });

  it('calls edit and closes when Edit is clicked', () => {
    render(
      <CardMenu
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        onClose={onClose}
        anchorRef={anchorRef}
        anchorId={anchorId}
      />,
    );

    fireEvent.click(screen.getByTestId('card-menu-edit'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls delete and closes when Delete is clicked', () => {
    render(
      <CardMenu
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        onClose={onClose}
        anchorRef={anchorRef}
        anchorId={anchorId}
      />,
    );

    fireEvent.click(screen.getByTestId('card-menu-delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls archive and closes when Archive is clicked', () => {
    render(
      <CardMenu
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        onClose={onClose}
        anchorRef={anchorRef}
        anchorId={anchorId}
      />,
    );

    fireEvent.click(screen.getByTestId('card-menu-archive'));

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows hint on delete action', () => {
    render(
      <CardMenu
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        onClose={onClose}
        anchorRef={anchorRef}
        anchorId={anchorId}
      />,
    );

    expect(screen.getByTestId('card-menu-delete')).toHaveAttribute('title', 'Delete card');
  });

  it('closes on outside mousedown but not when clicking inside the menu or on the anchor', () => {
    render(
      <CardMenu
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        onClose={onClose}
        anchorRef={anchorRef}
        anchorId={anchorId}
      />,
    );

    fireEvent.mouseDown(screen.getByTestId('card-menu'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(anchorRef.current?.[anchorId] as HTMLButtonElement);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on outside mousedown when anchor button is missing', () => {
    anchorRef.current = { [anchorId]: null };

    render(
      <CardMenu
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
        onClose={onClose}
        anchorRef={anchorRef}
        anchorId={anchorId}
      />,
    );

    fireEvent.mouseDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops click propagation so parent card click is not triggered', () => {
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <CardMenu
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={onClose}
          anchorRef={anchorRef}
          anchorId={anchorId}
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId('card-menu-archive'));

    expect(parentClick).not.toHaveBeenCalled();
  });
});
