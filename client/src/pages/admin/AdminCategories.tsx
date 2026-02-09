import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';

type Category = { id: string; name: string; isActive: boolean; sortOrder: number };

export function AdminCategories() {
  const [list, setList] = useState<Category[]>([]);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const load = () => api.categories.list().then((r) => setList(r as Category[]));

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setName('');
    setEditId(null);
    setModal('add');
  };

  const openEdit = (id: string, currentName: string) => {
    setEditId(id);
    setName(currentName);
    setModal('edit');
  };

  const saveAdd = async () => {
    if (!name.trim()) return;
    await api.categories.create({ name: name.trim() });
    load();
    setModal(null);
  };

  const saveEdit = async () => {
    if (!editId || !name.trim()) return;
    await api.categories.update(editId, { name: name.trim() });
    load();
    setModal(null);
  };

  const remove = async (id: string) => {
    if (!confirm('이 카테고리를 삭제할까요?')) return;
    await api.categories.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">카테고리 설정</h2>
        <Button theme="admin" variant="primary" onClick={openAdd}>
          카테고리 등록
        </Button>
      </div>
      <Card theme="admin" className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-admin-surface">
            <tr>
              <th className="text-left p-3 text-sm font-medium">카테고리명</th>
              <th className="text-right p-3 text-sm font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-admin-border">
                <td className="p-3 text-sm">{c.name}</td>
                <td className="p-3 text-right">
                  <Button
                    theme="admin"
                    variant="secondary"
                    className="mr-2"
                    onClick={() => openEdit(c.id, c.name)}
                  >
                    수정
                  </Button>
                  <Button theme="admin" variant="destructive" onClick={() => remove(c.id)}>
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {list.length === 0 && (
        <p className="text-admin-textSecondary text-center py-8">카테고리가 없습니다.</p>
      )}

      <Modal
        open={modal === 'add'}
        onClose={() => setModal(null)}
        title="카테고리 등록"
        theme="admin"
      >
        <Input theme="admin" label="카테고리 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2 mt-4">
          <Button theme="admin" variant="secondary" onClick={() => setModal(null)}>
            취소
          </Button>
          <Button theme="admin" variant="primary" onClick={saveAdd}>
            등록하기
          </Button>
        </div>
      </Modal>

      <Modal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        title="카테고리 수정"
        theme="admin"
      >
        <Input theme="admin" label="카테고리 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2 mt-4">
          <Button theme="admin" variant="secondary" onClick={() => setModal(null)}>
            취소
          </Button>
          <Button theme="admin" variant="primary" onClick={saveEdit}>
            수정하기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
