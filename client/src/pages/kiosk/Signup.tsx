import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedUsername || !trimmedEmail || !password) {
      setError('이름, 아이디, 이메일, 비밀번호를 모두 입력하세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.register({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '회원가입 실패';
      if (msg.includes('username already exists')) setError('이미 사용 중인 아이디입니다.');
      else if (msg.includes('email already exists')) setError('이미 사용 중인 이메일입니다.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kiosk-view min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-kiosk-bg">
      <Card theme="kiosk" className="w-full max-w-sm p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-center text-kiosk-text mb-6">회원가입</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="이름"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            autoComplete="name"
            disabled={loading}
          />
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
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            disabled={loading}
          />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            autoComplete="new-password"
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-kiosk-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" theme="kiosk" className="w-full" disabled={loading}>
            {loading ? '가입 중…' : '가입하기'}
          </Button>
        </form>
        <div className="flex justify-center mt-4 text-sm">
          <Link to="/login" className="text-kiosk-primary font-medium">
            로그인
          </Link>
        </div>
      </Card>
    </div>
  );
}
