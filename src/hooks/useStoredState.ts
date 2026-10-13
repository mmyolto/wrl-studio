import { useCallback, useState } from 'react';

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

/** useState that remembers its value in this browser (best effort — storage may be unavailable). */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Private mode or storage disabled: keep the in-memory value.
      }
    },
    [key],
  );
  return [value, update] as const;
}
