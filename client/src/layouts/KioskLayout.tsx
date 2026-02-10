import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const IDLE_SEC = 60;
const MESSAGE_COUNTDOWN_SEC = 5;

/** 결제·주문완료 화면에서는 비활성 타이머 미적용 */
function isIdleExcludedPath(pathname: string): boolean {
  return (
    pathname === '/checkout' ||
    pathname === '/order-done' ||
    pathname.startsWith('/payment/')
  );
}

export function KioskLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showIdleMessage, setShowIdleMessage] = useState(false);
  const [countdown, setCountdown] = useState(MESSAGE_COUNTDOWN_SEC);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowIdleMessage(false);
    setCountdown(MESSAGE_COUNTDOWN_SEC);
  }, []);

  const startIdleTimer = useCallback(() => {
    if (isIdleExcludedPath(location.pathname)) return;
    resetIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      setShowIdleMessage(true);
      setCountdown(MESSAGE_COUNTDOWN_SEC);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            navigate('/', { replace: true });
            setShowIdleMessage(false);
            return MESSAGE_COUNTDOWN_SEC;
          }
          return c - 1;
        });
      }, 1000);
    }, IDLE_SEC * 1000);
  }, [location.pathname, navigate, resetIdleTimer]);

  useEffect(() => {
    startIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [startIdleTimer]);

  useEffect(() => {
    if (isIdleExcludedPath(location.pathname)) return;
    const events = ['mousedown', 'touchstart', 'keydown'] as const;
    const handleActivity = () => {
      resetIdleTimer();
      startIdleTimer();
    };
    events.forEach((e) => window.addEventListener(e, handleActivity));
    return () => events.forEach((e) => window.removeEventListener(e, handleActivity));
  }, [location.pathname, resetIdleTimer, startIdleTimer]);

  return (
    <div className="kiosk-view bg-kiosk-bg text-kiosk-text">
      <Outlet />
      {showIdleMessage && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 p-6 text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
            <p id="idle-title" className="text-lg font-semibold text-kiosk-text mb-2">
              화면이 비활성 상태입니다
            </p>
            <p className="text-kiosk-textSecondary mb-6">
              {countdown}초 후 홈으로 이동합니다.
            </p>
            <button
              type="button"
              onClick={() => {
                resetIdleTimer();
                navigate('/', { replace: true });
              }}
              className="w-full py-3 rounded-xl bg-kiosk-primary text-kiosk-text font-medium"
            >
              지금 홈으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
