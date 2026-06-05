import { useCallback, useEffect, useRef } from 'react';

export interface UseHotkeyOptions {
  enabled?: boolean;
  target?: 'document' | 'window';
  skipIfDefaultPrevented?: boolean;
}

export type HotkeyEvent = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'defaultPrevented' | 'preventDefault' | 'stopPropagation'>;

interface UseHotkeyHandlerOptions {
  enabled?: boolean;
  skipIfDefaultPrevented?: boolean;
}

const normalizeKey = (rawKey: string): string => {
  const lowerRawKey = rawKey.toLowerCase();
  if (lowerRawKey === ' ') return ' ';

  const key = rawKey.trim().toLowerCase();

  if (key === 'esc') return 'escape';
  if (key === 'spacebar' || key === 'space' || key === ' ') return ' ';
  if (key === 'return') return 'enter';
  if (key === 'cmd' || key === 'command') return 'meta';
  if (key === 'option') return 'alt';

  return key;
};

const isModPressed = (event: HotkeyEvent) => event.metaKey || event.ctrlKey;

const matchesToken = (token: string, event: HotkeyEvent): boolean => {
  if (token === 'mod') return isModPressed(event);
  if (token === 'meta') return event.metaKey;
  if (token === 'ctrl') return event.ctrlKey;
  if (token === 'alt') return event.altKey;
  if (token === 'shift') return event.shiftKey;

  return normalizeKey(event.key) === token;
};

const matchesHotkey = (hotkey: string, event: HotkeyEvent): boolean => {
  const tokens = hotkey
    .split('+')
    .map((token) => normalizeKey(token))
    .filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  return tokens.every((token) => matchesToken(token, event));
};

export const isHotkeyPressed = (hotkey: string, event: HotkeyEvent): boolean => matchesHotkey(hotkey, event);

export const useHotkey = (
  hotkey: string,
  callback: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {}
) => {
  const { enabled = true, target = 'document', skipIfDefaultPrevented = false } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const eventTarget = target === 'window' ? window : document;

    const listener: EventListener = (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }

      if (skipIfDefaultPrevented && event.defaultPrevented) {
        return;
      }

      if (!matchesHotkey(hotkey, event)) {
        return;
      }

      callbackRef.current(event);
    };

    eventTarget.addEventListener('keydown', listener);

    return () => {
      eventTarget.removeEventListener('keydown', listener);
    };
  }, [enabled, hotkey, skipIfDefaultPrevented, target]);
};

export const useHotkeyHandler = <T extends HotkeyEvent>(
  hotkey: string,
  callback: (event: T) => void,
  options: UseHotkeyHandlerOptions = {}
) => {
  const { enabled = true, skipIfDefaultPrevented = false } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((event: T) => {
    if (!enabled) {
      return;
    }

    if (skipIfDefaultPrevented && event.defaultPrevented) {
      return;
    }

    if (!matchesHotkey(hotkey, event)) {
      return;
    }

    callbackRef.current(event);
  }, [enabled, hotkey, skipIfDefaultPrevented]);
};
