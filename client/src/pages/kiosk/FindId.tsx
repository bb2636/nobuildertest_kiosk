import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function FindId() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [foundUsername, setFoundUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFoundUsername(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError('이름과 이메일을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.findId({ name: trimmedName, email: trimmedEmail });
      setFoundUsername(res.username);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '조회 실패';
      if (msg.includes('no user found')) setError('일치하는 회원 정보가 없습니다.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kiosk-view min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-kiosk-bg">
      <Card theme="kiosk" className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-center text-kiosk-text mb-6">아이디 찾기</h1>
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
          {foundUsername !== null && (
            <p className="text-sm text-kiosk-text" role="status">
              아이디: <strong>{foundUsername}</strong>
            </p>
          )}
          <Button type="submit" theme="kiosk" className="w-full" disabled={loading}>
            {loading ? '조회 중…' : '찾기'}
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
