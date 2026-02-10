import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export const NETWORK_ERROR_EVENT = 'app:network-error';

type NetworkErrorContextValue = {
  showBanner: boolean;
  dismiss: () => void;
};

const Context = createContext<NetworkErrorContextValue | null>(null);

export function NetworkErrorProvider({ children }: { children: ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);

  const dismiss = useCallback(() => setShowBanner(false), []);

  useEffect(() => {
    const onNetworkError = () => setShowBanner(true);
    const onOffline = () => setShowBanner(true);
    const onOnline = () => setShowBanner(false);

    window.addEventListener(NETWORK_ERROR_EVENT, onNetworkError);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    if (!navigator.onLine) setShowBanner(true);

    return () => {
      window.removeEventListener(NETWORK_ERROR_EVENT, onNetworkError);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const value: NetworkErrorContextValue = { showBanner, dismiss };

  return (
    <Context.Provider value={value}>
      {children}
      {showBanner && (
        <div
          className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between gap-4 px-4 py-3 bg-red-600 text-white shadow-md"
          role="alert"
        >
          <p className="text-sm font-medium flex-1">
            연결이 끊겼습니다. 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
          >
            재시도
          </button>
        </div>
      )}
    </Context.Provider>
  );
}

export function useNetworkError() {
  const ctx = useContext(Context);
  if (!ctx) return null;
  return ctx;
}
