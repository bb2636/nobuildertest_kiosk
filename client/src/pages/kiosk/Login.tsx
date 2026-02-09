import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="kiosk-view min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-kiosk-bg">
      <Card theme="kiosk" className="w-full max-w-sm p-6">
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
      </Card>
    </div>
  );
}
