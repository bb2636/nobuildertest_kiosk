import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export function MyPagePoint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [info, setInfo] = useState<{ point: number; mileage: number } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    api.user.me().then((data) => setInfo({ point: data.point, mileage: data.mileage })).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-kiosk-text">
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">포인트</h1>
        <span className="w-8" />
      </header>
      <main className="flex-1 overflow-auto p-4">
        {info != null ? (
          <div className="rounded-xl bg-white border border-kiosk-border p-6 space-y-4">
            <div>
              <p className="text-sm text-kiosk-textSecondary">보유 포인트</p>
              <p className="text-2xl font-semibold text-kiosk-text">{info.point.toLocaleString()}P</p>
            </div>
            <div>
              <p className="text-sm text-kiosk-textSecondary">마일리지</p>
              <p className="text-lg font-medium text-kiosk-text">{info.mileage.toLocaleString()}</p>
            </div>
            <p className="text-xs text-kiosk-textSecondary pt-2">
              주문 결제 시 10% 포인트가 적립되며, 결제 시 매장 포인트로 사용할 수 있습니다.
            </p>
          </div>
        ) : (
          <p className="text-kiosk-textSecondary text-center py-8">로딩 중…</p>
        )}
      </main>
    </div>
  );
}
