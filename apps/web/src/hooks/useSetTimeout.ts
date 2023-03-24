import { useCallback, useEffect, useRef, useMemo } from "react";

type CallbackFunction = (...args: any[]) => void;

function useTimeout(
  callback: CallbackFunction,
  delay: number
): [CallbackFunction] {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef<CallbackFunction>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const memoizedCallback = useCallback(
    (args: any[]) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        callbackRef.current?.(args);
      }, delay);
    },
    [delay, timeoutRef, callbackRef]
  );

  return useMemo(() => [memoizedCallback], [memoizedCallback]);
}

export default useTimeout;
