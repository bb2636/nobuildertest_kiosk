import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const SIDEBAR_SECTIONS = [
  {
    label: '주문관리',
    items: [{ to: '/admin/orders', label: '주문 현황' }],
  },
  {
    label: '메뉴관리',
    items: [
      { to: '/admin/menu', label: '상품 관리' },
      { to: '/admin/categories', label: '카테고리 설정' },
    ],
  },
  {
    label: '약관관리',
    items: [
      { to: '/admin/terms', label: '서비스 이용약관' },
      { to: '/admin/privacy', label: '개인정보 처리방침' },
    ],
  },
] as const;

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    주문관리: true,
    메뉴관리: true,
    약관관리: true,
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-view min-h-screen bg-admin-bg text-admin-text flex">
      {/* 좌측 네비게이션 */}
      <aside className="w-56 shrink-0 border-r border-admin-border bg-white flex flex-col">
        <div className="p-4 border-b border-admin-border">
          <h1 className="text-lg font-semibold text-admin-text">백오피스</h1>
          <p className="text-sm text-admin-textSecondary mt-1">
            {user?.name ?? user?.username}님, 안녕하세요.
          </p>
        </div>
        <nav className="flex-1 overflow-auto py-2">
          {SIDEBAR_SECTIONS.map(({ label, items }) => {
            const isOpen = openSections[label] ?? true;
            return (
              <div key={label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleSection(label)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-admin-text hover:bg-admin-surface"
                >
                  {label}
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-admin-textSecondary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-admin-textSecondary" />
                  )}
                </button>
                {isOpen && (
                  <ul className="pl-2">
                    {items.map(({ to, label: itemLabel }) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm rounded-l-md ${
                              isActive
                                ? 'bg-admin-primary text-white font-medium'
                                : 'text-admin-textSecondary hover:bg-admin-surface hover:text-admin-text'
                            }`
                          }
                        >
                          {itemLabel}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-admin-border">
          <Button
            theme="admin"
            variant="secondary"
            onClick={handleLogout}
            className="w-full text-sm"
          >
            로그아웃
          </Button>
        </div>
      </aside>
      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto p-6 bg-admin-bg">
        <Outlet />
      </main>
    </div>
  );
}
