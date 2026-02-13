import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';

type AdminProduct = {
  id: string;
  name: string;
  categoryId: string;
  basePrice: number;
  sortOrder?: number;
  isAvailable?: boolean;
  category?: { id: string; name: string };
};

type CategoryItem = { id: string; name: string; sortOrder: number };

function mergeProductsInto(cache: AdminProduct[], delta: AdminProduct[]): AdminProduct[] {
  const byId = new Map(cache.map((i) => [i.id, i]));
  for (const i of delta) byId.set(i.id, i);
  return Array.from(byId.values()).sort(
    (a, b) =>
      a.categoryId === b.categoryId
        ? (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        : a.categoryId.localeCompare(b.categoryId)
  );
}

function mergeCategoriesInto(cache: CategoryItem[], delta: CategoryItem[]): CategoryItem[] {
  const byId = new Map(cache.map((c) => [c.id, c]));
  for (const c of delta) byId.set(c.id, c);
  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function AdminMenu() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const lastProductsFetchRef = useRef<string | null>(null);
  const lastCategoriesFetchRef = useRef<string | null>(null);

  const loadItems = useCallback(() => {
    api.admin.products.list().then((list) => {
      setItems(list as AdminProduct[]);
      lastProductsFetchRef.current = new Date().toISOString();
    });
  }, []);
  const loadCategories = useCallback(() => {
    api.admin.categories.list().then((list) => {
      setCategories(list);
      lastCategoriesFetchRef.current = new Date().toISOString();
    });
  }, []);

  const revalidate = useCallback(() => {
    const sinceProducts = lastProductsFetchRef.current;
    const sinceCategories = lastCategoriesFetchRef.current;
    const promises: Promise<void>[] = [];
    if (sinceProducts) {
      promises.push(
        api.admin.products.list({ updatedAfter: sinceProducts }).then((delta) => {
          setItems((prev) => mergeProductsInto(prev, delta as AdminProduct[]));
          lastProductsFetchRef.current = new Date().toISOString();
        })
      );
    }
    if (sinceCategories) {
      promises.push(
        api.admin.categories.list({ updatedAfter: sinceCategories }).then((delta) => {
          setCategories((prev) => mergeCategoriesInto(prev, delta));
          lastCategoriesFetchRef.current = new Date().toISOString();
        })
      );
    }
    Promise.all(promises).catch(() => {});
  }, []);

  useEffect(() => {
    loadItems();
    loadCategories();
  }, [loadItems, loadCategories]);

  useEffect(() => {
    const interval = setInterval(revalidate, 30_000);
    const onFocus = () => revalidate();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [revalidate]);

  const toggleSoldOut = async (id: string, isSoldOut: boolean) => {
    await api.admin.products.update(id, { isAvailable: !isSoldOut });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable: !isSoldOut } : i)));
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
      <div className="mb-4">
        <h2 className="text-lg font-semibold">상품 관리</h2>
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
    </div>
  );
}
