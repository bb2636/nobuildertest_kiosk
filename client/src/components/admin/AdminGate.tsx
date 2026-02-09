import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * /admin 하위 라우트 보호: /admin/login 은 누구나 접근, 그 외는 ADMIN만 접근 가능.
 * 로그인하지 않았거나 role 이 ADMIN 이 아니면 /admin/login 으로 리다이렉트.
 */
export function AdminGate() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/admin/login';

  if (!ready) {
    return (
      <div className="admin-view min-h-screen bg-admin-bg flex items-center justify-center">
        <p className="text-admin-textSecondary">로딩 중…</p>
      </div>
    );
  }

  if (isLoginPage) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Outlet />;
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
