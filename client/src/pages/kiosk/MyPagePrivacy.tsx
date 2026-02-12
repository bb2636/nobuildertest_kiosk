import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export function MyPagePrivacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    api.site
      .privacy()
      .then((data) => setContent(data.content ?? ''))
      .catch(() => setContent(''))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-3 -ml-2 text-kiosk-text text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="뒤로 가기">
          ‹
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">개인정보 처리방침</h1>
        <span className="w-8" />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="rounded-xl bg-white border border-kiosk-border p-4 text-sm text-kiosk-text whitespace-pre-wrap">
          {loading ? '불러오는 중...' : content || '등록된 내용이 없습니다.'}
        </div>
      </main>
    </div>
  );
}
