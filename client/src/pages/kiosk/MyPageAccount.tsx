import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function MyPageAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('이메일을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      await api.user.update({ email: trimmed });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!currentPassword || !newPassword) {
      setError('현재 비밀번호와 새 비밀번호를 입력하세요.');
      return;
    }
    if (newPassword.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await api.user.update({
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-3 -ml-2 text-kiosk-text text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="뒤로 가기">
          ‹
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">계정정보</h1>
        <span className="w-8" />
      </header>
      <main className="flex-1 overflow-auto p-4 space-y-6">
        <Card theme="kiosk" className="p-4">
          <h2 className="text-sm font-medium text-kiosk-text mb-3">이메일 변경</h2>
          <form onSubmit={handleUpdateEmail} className="space-y-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="새 이메일"
              disabled={loading}
            />
            <Button type="submit" theme="kiosk" disabled={loading}>
              이메일 변경
            </Button>
          </form>
        </Card>
        <Card theme="kiosk" className="p-4">
          <h2 className="text-sm font-medium text-kiosk-text mb-3">비밀번호 변경</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-2">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호"
              disabled={loading}
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              disabled={loading}
            />
            <Button type="submit" theme="kiosk" disabled={loading}>
              비밀번호 변경
            </Button>
          </form>
        </Card>
        {error && <p className="text-sm text-kiosk-error" role="alert">{error}</p>}
        {success && <p className="text-sm text-green-600" role="status">저장되었습니다.</p>}
      </main>
    </div>
  );
}
