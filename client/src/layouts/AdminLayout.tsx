import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const SIDEBAR_SECTIONS = [
  {
    label: '유저관리',
    items: [{ to: '/admin/users', label: '유저 리스트' }],
  },
  {
    label: '주문관리',
    items: [{ to: '/admin/orders', label: '주문 내역' }],
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    유저관리: true,
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
      {/* 모바일: 드로어 열릴 때 배경 오버레이 */}
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* 좌측 네비게이션: 모바일 고정 드로어, 데스크톱 정적 사이드바 */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-56 shrink-0 border-r border-admin-border bg-white flex flex-col transition-transform duration-200 ease-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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
                          onClick={() => setSidebarOpen(false)}
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

      {/* 메인 영역: 모바일 상단 바 + 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 전용 상단 바 (메뉴 열기) */}
        <header className="md:hidden flex items-center gap-2 p-3 border-b border-admin-border bg-white shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-admin-surface text-admin-text"
            aria-label="메뉴 열기"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold text-admin-text">백오피스</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-admin-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
