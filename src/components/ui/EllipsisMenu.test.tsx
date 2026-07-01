import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EllipsisMenu } from './EllipsisMenu';

describe('EllipsisMenu', () => {
  it('applies custom classNames to root, trigger, menu, and items', () => {
    const onSelect = vi.fn();

    render(
      <EllipsisMenu
        trigger={{ label: 'More', testId: 'ellipsis-trigger' }}
        menu={{ testId: 'ellipsis-menu' }}
        classNames={{
          root: 'custom-root',
          trigger: 'custom-trigger',
          menu: 'custom-menu',
          item: 'custom-item',
        }}
        items={[
          {
            id: 'one',
            label: 'Item one',
            onSelect,
            testId: 'ellipsis-item-one',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('ellipsis-trigger'));

    expect(screen.getByTestId('ellipsis-trigger')).toHaveClass('custom-trigger');
    expect(screen.getByTestId('ellipsis-menu')).toHaveClass('custom-menu');
    expect(screen.getByTestId('ellipsis-item-one')).toHaveClass('custom-item');
    expect(screen.getByTestId('ellipsis-trigger').parentElement).toHaveClass('custom-root');
  });
});
