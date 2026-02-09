import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function AdminLogin() {
  const { login, clearAuth } = useAuth();
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
      if (result.user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        clearAuth();
        setError('관리자 권한이 없습니다. 관리자 계정으로 로그인하세요.');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="admin-view min-h-screen bg-admin-bg flex items-center justify-center p-4">
      <Card theme="admin" className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-center mb-6">백오피스 로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-textSecondary mb-1">
              아이디
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디"
              className="w-full"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-textSecondary mb-1">
              비밀번호
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            theme="admin"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
        <p className="text-admin-textSecondary text-xs text-center mt-4">
          관리자 권한이 있는 계정으로만 접속할 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
