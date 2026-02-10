import { useEffect, useState, useMemo } from 'react';
import { api, type AdminUserListItem, type AdminOrderListItem } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Search } from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<string, string> = {
  WAITING: '접수대기',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '완료',
  CANCELED: '취소',
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [orderDetailUser, setOrderDetailUser] = useState<AdminUserListItem | null>(null);
  const [userOrders, setUserOrders] = useState<AdminOrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.admin.users
      .list()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const openOrderDetail = (user: AdminUserListItem) => {
    setOrderDetailUser(user);
    setUserOrders([]);
    setOrdersLoading(true);
    api.admin.users
      .getOrders(user.id)
      .then(setUserOrders)
      .catch(() => setUserOrders([]))
      .finally(() => setOrdersLoading(false));
  };

  const handleDelete = async (user: AdminUserListItem) => {
    if (!window.confirm(`"${user.name}" 회원을 탈퇴(계정 삭제) 처리하시겠습니까?`)) return;
    setDeleteError(null);
    setDeletingId(user.id);
    try {
      await api.admin.users.delete(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (orderDetailUser?.id === user.id) setOrderDetailUser(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '탈퇴 처리에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-admin-textSecondary mb-1">유저관리 &gt; 유저 리스트</p>
      <h2 className="text-lg font-semibold mb-2">유저 리스트</h2>
      <p className="text-sm text-admin-textSecondary mb-4">총 {filtered.length}명의 유저가 있습니다.</p>

      <div className="relative mb-4 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setPage(1)}
          placeholder="회원명, 회원번호 혹은 이메일로 검색해주세요."
          className="w-full rounded-lg border border-admin-border bg-white pl-3 pr-10 py-2.5 text-sm text-admin-text placeholder:text-admin-textSecondary focus:outline-none focus:ring-2 focus:ring-admin-primary"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-admin-textSecondary pointer-events-none" />
      </div>

      {deleteError && (
        <p className="text-admin-error text-sm mb-3" role="alert">
          {deleteError}
        </p>
      )}

      {loading ? (
        <p className="text-admin-textSecondary py-8">로딩 중…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-admin-border bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-admin-surface text-admin-textSecondary font-medium">
                <tr>
                  <th className="px-4 py-3">회원번호</th>
                  <th className="px-4 py-3">회원명</th>
                  <th className="px-4 py-3">이메일 주소</th>
                  <th className="px-4 py-3">주문내역</th>
                  <th className="px-4 py-3">유저 권한</th>
                </tr>
              </thead>
              <tbody className="text-admin-text divide-y divide-admin-border">
                {paginated.map((u) => (
                  <tr key={u.id} className="hover:bg-admin-surface/50">
                    <td className="px-4 py-3">{u.id.slice(-6)}</td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(u)}
                        className="text-admin-primary hover:underline font-medium"
                      >
                        상세 확인
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="text-admin-error hover:underline font-medium disabled:opacity-50"
                      >
                        {deletingId === u.id ? '처리 중…' : '계정 삭제'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1 rounded border border-admin-border text-admin-text disabled:opacity-50"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-[2rem] py-1 rounded border text-sm ${
                    n === currentPage
                      ? 'bg-admin-primary text-white border-admin-primary'
                      : 'border-admin-border text-admin-text hover:bg-admin-surface'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2 py-1 rounded border border-admin-border text-admin-text disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        theme="admin"
        open={!!orderDetailUser}
        onClose={() => setOrderDetailUser(null)}
        title={orderDetailUser ? `${orderDetailUser.name} 주문내역` : ''}
      >
        {ordersLoading ? (
          <p className="text-admin-textSecondary py-4">로딩 중…</p>
        ) : userOrders.length === 0 ? (
          <p className="text-admin-textSecondary py-4">주문 내역이 없습니다.</p>
        ) : (
          <ul className="space-y-3 max-h-[60vh] overflow-auto">
            {userOrders.map((o) => (
              <li key={o.id} className="border border-admin-border rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">#{o.orderNo}</span>
                  <span className="text-admin-textSecondary">{STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
                <p className="text-admin-textSecondary text-xs mb-1">
                  {new Date(o.createdAt).toLocaleString('ko-KR')} · {o.totalAmount.toLocaleString()}원
                </p>
                <ul className="text-admin-textSecondary">
                  {o.items.map((i, idx) => (
                    <li key={idx}>
                      {i.productName}
                      {i.optionNames?.length ? ` (${i.optionNames.join(', ')})` : ''} x{i.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
