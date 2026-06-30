import { useEffect, type RefObject } from 'react';

interface UseClickOutsideOptions {
  enabled?: boolean;
  eventType?: 'mousedown' | 'pointerdown' | 'click';
}

export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClickOutside: () => void,
  { enabled = true, eventType = 'mousedown' }: UseClickOutsideOptions = {}
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOutsidePointer = (event: MouseEvent | PointerEvent) => {
      const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : null;
      if (eventPath && ref.current && eventPath.includes(ref.current)) {
        return;
      }

      if (!(event.target instanceof Node)) {
        return;
      }

      if (!ref.current?.contains(event.target)) {
        onClickOutside();
      }
    };

    document.addEventListener(eventType, handleOutsidePointer);

    return () => {
      document.removeEventListener(eventType, handleOutsidePointer);
    };
  }, [enabled, eventType, onClickOutside, ref]);
};