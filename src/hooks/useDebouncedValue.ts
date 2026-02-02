/**
 * Debounced Value Hook
 *
 * Returns a debounced version of the input value that only updates
 * after the specified delay has passed without changes.
 *
 * Useful for search inputs, auto-save, and other scenarios where
 * you want to wait for the user to stop typing before taking action.
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearch = useDebouncedValue(searchTerm, 300);
 *
 *   // API call only triggers when user stops typing for 300ms
 *   const { data } = useSearchResults(debouncedSearch);
 *
 *   return <TextInput value={searchTerm} onChangeText={setSearchTerm} />;
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Default debounce delay in milliseconds
 */
export const DEFAULT_DEBOUNCE_DELAY = 300;

/**
 * Debounces a value by the specified delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = DEFAULT_DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounces a callback function
 *
 * Unlike useDebouncedValue which debounces a value, this hook
 * debounces a function that can be called imperatively.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * function AutoSaveComponent() {
 *   const [content, setContent] = useState('');
 *
 *   const debouncedSave = useDebouncedCallback(
 *     (text: string) => saveToServer(text),
 *     500
 *   );
 *
 *   const handleChange = (text: string) => {
 *     setContent(text);
 *     debouncedSave(text);
 *   };
 *
 *   return <TextInput value={content} onChangeText={handleChange} />;
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = DEFAULT_DEBOUNCE_DELAY
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
}

/**
 * Returns the current debounced value and a flag indicating if debouncing is pending
 *
 * Useful when you need to show a loading indicator while debouncing.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Object with debounced value and isPending flag
 *
 * @example
 * ```tsx
 * function SearchWithPending() {
 *   const [query, setQuery] = useState('');
 *   const { value: debouncedQuery, isPending } = useDebouncedValueWithPending(query);
 *
 *   return (
 *     <>
 *       <TextInput value={query} onChangeText={setQuery} />
 *       {isPending && <ActivityIndicator />}
 *       <SearchResults query={debouncedQuery} />
 *     </>
 *   );
 * }
 * ```
 */
export function useDebouncedValueWithPending<T>(
  value: T,
  delay: number = DEFAULT_DEBOUNCE_DELAY
): { value: T; isPending: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true);
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, debouncedValue]);

  return { value: debouncedValue, isPending };
}
