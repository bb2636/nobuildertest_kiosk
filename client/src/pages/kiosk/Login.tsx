import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { getApiBaseUrl, getApiRoot, isCapacitorApp, setMobileApiBaseUrl } from '../../api/client';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<'ok' | 'fail' | null>(null);
  const [mobileUrl, setMobileUrl] = useState('');
  const isMobile = isCapacitorApp();

  useEffect(() => {
    if (!isMobile) return;
    const base = getApiBaseUrl();
    if (base && base !== window.location.origin) setMobileUrl(base);
    let cancelled = false;
    const apiRoot = getApiRoot();
    if (apiRoot === '/api') {
      setHealth(null);
      return;
    }
    fetch(`${apiRoot}/health`)
      .then((res) => res.json().catch(() => ({})))
      .then((data: { ok?: boolean }) => {
        if (!cancelled) setHealth(data?.ok ? 'ok' : 'fail');
      })
      .catch(() => {
        if (!cancelled) setHealth('fail');
      });
    return () => { cancelled = true; };
  }, [isMobile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error === 'invalid username or password' ? '아이디 또는 비밀번호가 일치하지 않습니다.' : result.error);
    }
  };

  return (
    <div className="kiosk-view min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-kiosk-bg">
      <Card theme="kiosk" className="w-full max-w-sm p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-center text-kiosk-text mb-6">로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="아이디"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디"
            autoComplete="username"
            disabled={loading}
          />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-kiosk-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" theme="kiosk" className="w-full" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <Link to="/signup" className="text-kiosk-primary font-medium">
            회원가입
          </Link>
          <Link to="/find-id" className="text-kiosk-textSecondary">
            아이디 찾기
          </Link>
          <Link to="/find-password" className="text-kiosk-textSecondary">
            비밀번호 찾기
          </Link>
        </div>

        {isMobile && (
          <div className="mt-6 pt-4 border-t border-kiosk-border">
            <p className="text-xs text-kiosk-textSecondary mb-2">모바일 앱 연결</p>
            {getApiRoot() === '/api' ? (
              <p className="text-sm text-amber-700 mb-2">
                서버 주소가 없습니다. 아래에 PC 주소를 입력하세요. (예: http://10.140.140.147:3001)
              </p>
            ) : (
              <p className="text-sm text-kiosk-textSecondary mb-2 break-all">
                현재: {getApiBaseUrl()}
                {health === 'ok' && <span className="text-green-600 ml-1">· 연결됨</span>}
                {health === 'fail' && <span className="text-red-600 ml-1">· 연결 실패</span>}
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={mobileUrl}
                onChange={(e) => setMobileUrl(e.target.value)}
                placeholder="http://PC_IP:3001"
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-kiosk-border rounded-lg bg-white"
              />
              <Button
                type="button"
                theme="kiosk"
                className="shrink-0"
                onClick={() => {
                  setMobileApiBaseUrl(mobileUrl);
                  window.location.reload();
                }}
              >
                저장 후 재시작
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
