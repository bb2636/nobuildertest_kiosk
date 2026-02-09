import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toggle } from '../../components/ui/Toggle';

type AdminProduct = {
  id: string;
  name: string;
  categoryId: string;
  basePrice: number;
  isAvailable?: boolean;
  category?: { id: string; name: string };
};

type CategoryItem = { id: string; name: string; sortOrder: number };

export function AdminMenu() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEnglishName, setFormEnglishName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBasePrice, setFormBasePrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadItems = () => api.admin.products.list().then(setItems);
  const loadCategories = () => api.admin.categories.list().then(setCategories);

  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  useEffect(() => {
    if (modalOpen && categories.length > 0 && !formCategoryId) {
      setFormCategoryId(categories[0]?.id ?? '');
    }
  }, [modalOpen, categories, formCategoryId]);

  const toggleSoldOut = async (id: string, isSoldOut: boolean) => {
    await api.admin.products.update(id, { isAvailable: !isSoldOut });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable: !isSoldOut } : i)));
  };

  const openCreateModal = () => {
    setFormName('');
    setFormEnglishName('');
    setFormBasePrice('');
    setFormDescription('');
    setFormImageUrl('');
    setFormIngredients('');
    setFormError('');
    setFormCategoryId(categories[0]?.id ?? '');
    setModalOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const name = formName.trim();
    const price = Number(formBasePrice);
    if (!name) {
      setFormError('상품명을 입력하세요.');
      return;
    }
    if (!formCategoryId) {
      setFormError('카테고리를 선택하세요.');
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      setFormError('가격을 0 이상의 숫자로 입력하세요.');
      return;
    }
    setSubmitting(true);
    try {
      await api.admin.products.create({
        categoryId: formCategoryId,
        name,
        englishName: formEnglishName.trim() || undefined,
        description: formDescription.trim() || undefined,
        basePrice: price,
        imageUrl: formImageUrl.trim() || undefined,
        ingredients: formIngredients.trim() || undefined,
      });
      setModalOpen(false);
      loadItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    setDeleteError(null);
    if (!window.confirm(`"${name}" 메뉴를 삭제하시겠습니까?`)) return;
    try {
      await api.admin.products.delete(id);
      loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '삭제에 실패했습니다.';
      if (msg.includes('product_has_orders') || msg.includes('주문')) {
        setDeleteError('이 메뉴로 주문 내역이 있어 삭제할 수 없습니다.');
      } else {
        setDeleteError(msg);
      }
    }
  };

  const categoryName = (item: AdminProduct) => item.category?.name ?? item.categoryId;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">상품 관리</h2>
        <Button theme="admin" variant="primary" onClick={openCreateModal} disabled={categories.length === 0}>
          메뉴 등록
        </Button>
      </div>
      {categories.length === 0 && (
        <p className="text-admin-textSecondary text-sm mb-4">먼저 카테고리를 등록해 주세요.</p>
      )}
      {deleteError && (
        <p className="text-admin-error text-sm mb-2" role="alert">
          {deleteError}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border border-admin-border rounded-lg overflow-hidden">
          <thead className="bg-admin-surface">
            <tr>
              <th className="text-left p-3 text-sm font-medium">상품명</th>
              <th className="text-left p-3 text-sm font-medium">카테고리</th>
              <th className="text-left p-3 text-sm font-medium">가격</th>
              <th className="text-left p-3 text-sm font-medium">판매 여부</th>
              <th className="text-left p-3 text-sm font-medium w-24">삭제</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-admin-border">
                <td className="p-3 text-sm">{item.name}</td>
                <td className="p-3 text-sm text-admin-textSecondary">
                  {categoryName(item)}
                </td>
                <td className="p-3 text-sm">{item.basePrice.toLocaleString()}원</td>
                <td className="p-3">
                  <Toggle
                    theme="admin"
                    checked={item.isAvailable !== false}
                    onChange={(e) => toggleSoldOut(item.id, !e.target.checked)}
                  />
                </td>
                <td className="p-3">
                  <Button
                    theme="admin"
                    variant="destructive"
                    onClick={() => deleteProduct(item.id, item.name)}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !deleteError && (
        <p className="text-admin-textSecondary text-center py-8">등록된 상품이 없습니다.</p>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="메뉴 등록" theme="admin">
        <form onSubmit={submitCreate} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <label className="block">
            <span className="block text-sm font-medium text-admin-text mb-1">카테고리 *</span>
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            theme="admin"
            label="상품명 *"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="예: 아메리카노"
          />
          <Input
            theme="admin"
            label="상품명(영문)"
            value={formEnglishName}
            onChange={(e) => setFormEnglishName(e.target.value)}
            placeholder="Americano"
          />
          <Input
            theme="admin"
            label="가격 (원) *"
            type="number"
            min={0}
            value={formBasePrice}
            onChange={(e) => setFormBasePrice(e.target.value)}
            placeholder="4500"
          />
          <label className="block">
            <span className="block text-sm font-medium text-admin-text mb-1">상품 설명</span>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="상품 상세 설명을 입력해 주세요."
              rows={3}
              className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text resize-y"
            />
          </label>
          <Input
            theme="admin"
            label="이미지 URL"
            value={formImageUrl}
            onChange={(e) => setFormImageUrl(e.target.value)}
            placeholder="https://... 또는 /images/파일명.png"
          />
          <label className="block">
            <span className="block text-sm font-medium text-admin-text mb-1">원재료명 및 함량</span>
            <textarea
              value={formIngredients}
              onChange={(e) => setFormIngredients(e.target.value)}
              placeholder="원재료명 및 함량을 입력해 주세요."
              rows={2}
              className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text resize-y"
            />
          </label>
          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button theme="admin" variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button theme="admin" variant="primary" type="submit" disabled={submitting}>
              {submitting ? '등록 중…' : '등록'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
