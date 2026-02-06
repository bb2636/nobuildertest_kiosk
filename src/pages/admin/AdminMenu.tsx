import { useEffect, useState } from 'react';
import { api, type MenuItem } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Toggle } from '../../components/ui/Toggle';

export function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.menu.list().then(setItems);
    api.categories.list().then(setCategories);
  }, []);

  const toggleSoldOut = async (id: string, isSoldOut: boolean) => {
    await api.menu.update(id, { isSoldOut });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isSoldOut } : i)));
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">상품 관리</h2>
      <div className="overflow-x-auto">
        <table className="w-full border border-admin-border rounded-lg overflow-hidden">
          <thead className="bg-admin-surface">
            <tr>
              <th className="text-left p-3 text-sm font-medium">상품명</th>
              <th className="text-left p-3 text-sm font-medium">카테고리</th>
              <th className="text-left p-3 text-sm font-medium">가격</th>
              <th className="text-left p-3 text-sm font-medium">판매 여부</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-admin-border">
                <td className="p-3 text-sm">{item.name}</td>
                <td className="p-3 text-sm text-admin-textSecondary">
                  {categoryName(item.categoryId)}
                </td>
                <td className="p-3 text-sm">{item.basePrice.toLocaleString()}원</td>
                <td className="p-3">
                  <Toggle
                    theme="admin"
                    checked={!item.isSoldOut}
                    onChange={(e) => toggleSoldOut(item.id, !e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <p className="text-admin-textSecondary text-center py-8">등록된 상품이 없습니다.</p>
      )}
    </div>
  );
}
