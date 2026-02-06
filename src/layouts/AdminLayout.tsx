import { Outlet, NavLink } from 'react-router-dom';

const nav = [
  { to: '/admin/orders', label: '주문 현황' },
  { to: '/admin/menu', label: '상품 관리' },
  { to: '/admin/categories', label: '카테고리 설정' },
];

export function AdminLayout() {
  return (
    <div className="admin-view min-h-screen bg-admin-bg text-admin-text">
      <header className="sticky top-0 z-10 border-b border-admin-border bg-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">백오피스</h1>
        <nav className="flex gap-2">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-admin-primary text-white' : 'text-admin-textSecondary hover:bg-admin-surface'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
