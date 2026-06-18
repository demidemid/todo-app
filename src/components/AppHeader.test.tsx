import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { AppHeader } from './AppHeader';

const createUser = (email: string): User => ({
  uid: 'user-1',
  email,
} as User);

describe('AppHeader tag filters', () => {
  it('opens tag filter popover, toggles tag and removes selected tag from filtering by x', () => {
    const onSectionModeChange = vi.fn();
    const onToggleTagFilter = vi.fn();
    const onRemoveTagFilter = vi.fn();

    render(
      <AppHeader
        user={createUser('user@example.com')}
        sectionMode="dashboards"
        onSectionModeChange={onSectionModeChange}
        availableTags={['backend', 'urgent']}
        selectedTags={['backend']}
        onToggleTagFilter={onToggleTagFilter}
        onRemoveTagFilter={onRemoveTagFilter}
        onLogout={vi.fn()}
        logoutLoading={false}
      />,
    );

    fireEvent.click(screen.getByTestId('header-tag-filter-trigger'));

    expect(screen.getByTestId('header-tag-filter-popover')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('header-tag-option-urgent'));
    expect(onToggleTagFilter).toHaveBeenCalledWith('urgent');

    fireEvent.click(screen.getByTestId('header-tag-remove-backend'));
    expect(onRemoveTagFilter).toHaveBeenCalledWith('backend');
  });

  it('shows empty message when there are no available tags', () => {
    render(
      <AppHeader
        user={createUser('user@example.com')}
        sectionMode="dashboards"
        onSectionModeChange={vi.fn()}
        availableTags={[]}
        selectedTags={[]}
        onToggleTagFilter={vi.fn()}
        onRemoveTagFilter={vi.fn()}
        onLogout={vi.fn()}
        logoutLoading={false}
      />,
    );

    fireEvent.click(screen.getByTestId('header-tag-filter-trigger'));
    expect(screen.getByTestId('header-tag-filter-empty')).toHaveTextContent('No tags yet');
  });

  it('closes tag filter popover on outside click', () => {
    render(
      <AppHeader
        user={createUser('user@example.com')}
        sectionMode="dashboards"
        onSectionModeChange={vi.fn()}
        availableTags={['backend']}
        selectedTags={[]}
        onToggleTagFilter={vi.fn()}
        onRemoveTagFilter={vi.fn()}
        onLogout={vi.fn()}
        logoutLoading={false}
      />,
    );

    fireEvent.click(screen.getByTestId('header-tag-filter-trigger'));
    expect(screen.getByTestId('header-tag-filter-popover')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('header-tag-filter-popover')).not.toBeInTheDocument();
  });
});
