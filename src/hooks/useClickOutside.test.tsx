import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { useClickOutside } from './useClickOutside';

interface TestComponentProps {
  onOutside: () => void;
  enabled?: boolean;
}

const TestComponent = ({ onOutside, enabled = true }: TestComponentProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(rootRef, onOutside, { enabled });

  return (
    <div>
      <div ref={rootRef} data-testid="inside">Inside</div>
      <button type="button" data-testid="outside">Outside</button>
    </div>
  );
};

describe('useClickOutside', () => {
  it('calls handler when clicking outside referenced element', () => {
    const onOutside = vi.fn();

    render(<TestComponent onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not call handler when clicking inside referenced element', () => {
    const onOutside = vi.fn();

    render(<TestComponent onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByTestId('inside'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does not call handler when disabled', () => {
    const onOutside = vi.fn();

    render(<TestComponent onOutside={onOutside} enabled={false} />);

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', () => {
    const onOutside = vi.fn();

    const { unmount } = render(<TestComponent onOutside={onOutside} />);

    unmount();
    fireEvent.mouseDown(document.body);

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does not call handler when composedPath contains referenced element', () => {
    const onOutside = vi.fn();

    render(<TestComponent onOutside={onOutside} />);

    const inside = screen.getByTestId('inside');
    const event = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(event, 'composedPath', {
      value: () => [inside, document.body, document, window],
      configurable: true,
    });

    document.dispatchEvent(event);
    expect(onOutside).not.toHaveBeenCalled();
  });
});