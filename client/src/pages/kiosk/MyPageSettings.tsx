import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { Card } from '../../components/ui/Card';

export function MyPageSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    api.user.me().then((data) => {
      setNotificationEnabled(data.notificationEnabled);
      setMarketingConsent(data.marketingConsent);
    }).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await api.user.settings({ notificationEnabled, marketingConsent });
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-kiosk-text">
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">설정</h1>
        <span className="w-8" />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <Card theme="kiosk" className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-kiosk-text">알림 받기</span>
            <Toggle
              theme="kiosk"
              label=""
              onLabel=""
              offLabel=""
              checked={notificationEnabled}
              onChange={(e) => setNotificationEnabled((e.target as HTMLInputElement).checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-kiosk-text">마케팅 수신 동의</span>
            <Toggle
              theme="kiosk"
              label=""
              onLabel=""
              offLabel=""
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent((e.target as HTMLInputElement).checked)}
            />
          </div>
          <Button theme="kiosk" onClick={handleSave} disabled={loading}>
            {loading ? '저장 중…' : '저장'}
          </Button>
          {saved && <p className="text-sm text-green-600">저장되었습니다.</p>}
        </Card>
      </main>
    </div>
  );
}
