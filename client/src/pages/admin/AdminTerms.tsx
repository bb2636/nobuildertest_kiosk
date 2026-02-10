import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';

function formatLastUpdated(iso: string | null): string {
  if (!iso) return '0년 0월 0일';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function AdminTerms() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.terms
      .get()
      .then((data) => {
        setContent(data.content);
        setUpdatedAt(data.updatedAt);
        setLoadError(null);
      })
      .catch(() => setLoadError('약관을 불러오지 못했습니다.'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await api.admin.terms.update(content);
      setUpdatedAt(data.updatedAt);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">서비스 이용약관</h2>
        <Button
          theme="admin"
          variant="primary"
          onClick={handleSave}
          disabled={saving}
        >
          업데이트 하기
        </Button>
      </div>
      <p className="text-sm text-admin-textSecondary mb-4">
        마지막으로 업데이트한 일자는 {formatLastUpdated(updatedAt)} 입니다.
      </p>
      {loadError && (
        <p className="text-admin-error text-sm mb-3" role="alert">
          {loadError}
        </p>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[400px] p-4 rounded-lg border border-admin-border bg-white text-admin-text text-sm resize-y focus:outline-none focus:ring-2 focus:ring-admin-primary"
        placeholder="서비스 이용약관 내용을 입력하세요."
      />
    </div>
  );
}
