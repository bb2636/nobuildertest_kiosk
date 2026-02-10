import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function FindPassword() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedUsername || !trimmedEmail) {
      setError('이름, 아이디, 이메일을 모두 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.findPassword({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
      });
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '처리 실패';
      if (msg.includes('no user found')) setError('일치하는 회원 정보가 없습니다.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kiosk-view min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-kiosk-bg">
      <Card theme="kiosk" className="w-full max-w-sm p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-center text-kiosk-text mb-6">비밀번호 찾기</h1>
        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-kiosk-text" role="status">
              임시 비밀번호가 발급되었습니다. 로그인 후 비밀번호를 변경해 주세요.
            </p>
            <Link to="/login" className="block">
              <Button theme="kiosk" className="w-full">
                로그인
              </Button>
            </Link>
          </div>
        ) : (
          <>
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
                placeholder="가입 시 사용한 이메일"
                autoComplete="email"
                disabled={loading}
              />
              {error && (
                <p className="text-sm text-kiosk-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" theme="kiosk" className="w-full" disabled={loading}>
                {loading ? '처리 중…' : '임시 비밀번호 발급'}
              </Button>
            </form>
            <div className="flex justify-center mt-4 text-sm">
              <Link to="/login" className="text-kiosk-primary font-medium">
                로그인
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
