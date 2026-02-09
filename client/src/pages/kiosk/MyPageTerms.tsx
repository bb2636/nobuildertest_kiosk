import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export function MyPageTerms() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-kiosk-text">
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">약관</h1>
        <span className="w-8" />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="rounded-xl bg-white border border-kiosk-border p-4 text-sm text-kiosk-text whitespace-pre-wrap">
          {`제1조 (목적)
본 약관은 FELN 키오스크 서비스 이용에 관한 사항을 정합니다.

제2조 (이용)
회원은 서비스 이용 시 본 약관에 동의한 것으로 간주됩니다.

제3조 (개인정보)
개인정보는 관련 법령에 따라 보호됩니다.

(추가 약관은 관리자에서 등록할 수 있습니다.)`}
        </div>
      </main>
    </div>
  );
}
