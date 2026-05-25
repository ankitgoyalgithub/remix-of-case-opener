import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'insureauto.ui.';

/**
 * Persist a small piece of UI state across navigations and reloads.
 * Use for: sidebar collapsed, panel collapsed, view mode, etc. Don't use
 * for anything sensitive — values are stored in plain localStorage.
 */
export function useUiPref<T>(key: string, defaultValue: T): [T, (next: T | ((prev: T) => T)) => void] {
    const storageKey = PREFIX + key;
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const raw = window.localStorage.getItem(storageKey);
            return raw == null ? defaultValue : (JSON.parse(raw) as T);
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
            /* quota exceeded or disabled — silently noop */
        }
    }, [storageKey, value]);

    const update = useCallback((next: T | ((prev: T) => T)) => {
        setValue(prev => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
    }, []);

    return [value, update];
}
