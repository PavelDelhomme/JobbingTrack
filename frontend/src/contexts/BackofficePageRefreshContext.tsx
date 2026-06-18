"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RefreshHandler = () => void | Promise<void>;

type BackofficePageRefreshContextValue = {
  register: (handler: RefreshHandler) => () => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  hasHandler: boolean;
};

const BackofficePageRefreshContext =
  createContext<BackofficePageRefreshContextValue | null>(null);

export function BackofficePageRefreshProvider({
  children,
}: {
  children: ReactNode;
}) {
  const handlerRef = useRef<RefreshHandler | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasHandler, setHasHandler] = useState(false);

  const register = useCallback((handler: RefreshHandler) => {
    handlerRef.current = handler;
    setHasHandler(true);
    return () => {
      if (handlerRef.current === handler) {
        handlerRef.current = null;
        setHasHandler(false);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    const handler = handlerRef.current;
    if (!handler || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await handler();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const value = useMemo(
    () => ({ register, refresh, isRefreshing, hasHandler }),
    [register, refresh, isRefreshing, hasHandler],
  );

  return (
    <BackofficePageRefreshContext.Provider value={value}>
      {children}
    </BackofficePageRefreshContext.Provider>
  );
}

export function useBackofficePageRefresh() {
  return useContext(BackofficePageRefreshContext);
}
