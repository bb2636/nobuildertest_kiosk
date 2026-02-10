import { Routes, Route, Navigate } from 'react-router-dom';
import { KioskLayout } from './layouts/KioskLayout';
import { KioskCartProvider } from './contexts/KioskCartContext';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminGate } from './components/admin/AdminGate';
import { KioskHome } from './pages/kiosk/KioskHome';
import { KioskMenuDetail } from './pages/kiosk/KioskMenuDetail';
import { KioskCart } from './pages/kiosk/KioskCart';
import { Checkout } from './pages/kiosk/Checkout';
import { OrderDone } from './pages/kiosk/OrderDone';
import { PaymentSuccess } from './pages/kiosk/PaymentSuccess';
import { Login } from './pages/kiosk/Login';
import { Signup } from './pages/kiosk/Signup';
import { FindId } from './pages/kiosk/FindId';
import { FindPassword } from './pages/kiosk/FindPassword';
import { MyPage } from './pages/kiosk/MyPage';
import { MyPageOrders } from './pages/kiosk/MyPageOrders';
import { MyPagePoint } from './pages/kiosk/MyPagePoint';
import { MyPageAccount } from './pages/kiosk/MyPageAccount';
import { MyPageSettings } from './pages/kiosk/MyPageSettings';
import { MyPageTerms } from './pages/kiosk/MyPageTerms';
import { OrderStatusView } from './pages/kiosk/OrderStatusView';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminMenu } from './pages/admin/AdminMenu';
import { AdminCategories } from './pages/admin/AdminCategories';
import {
  NotFoundPage,
  ForbiddenPage,
  ServerErrorPage,
  UnauthorizedPage,
} from './pages/errors';

function App() {
  return (
    <Routes>
      {/* 예외 처리 페이지 (공통 레이아웃 없음) */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/401" element={<UnauthorizedPage />} />
      {/* 고객 로그인/회원 (레이아웃 없음) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/find-id" element={<FindId />} />
      <Route path="/find-password" element={<FindPassword />} />
      {/* 키오스크: 홈 → 메뉴 → 장바구니 → 결제 */}
      <Route path="/" element={<KioskCartProvider><KioskLayout /></KioskCartProvider>}>
        <Route index element={<KioskHome />} />
        <Route path="menu/:itemId" element={<KioskMenuDetail />} />
        <Route path="cart" element={<KioskCart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="payment/success" element={<PaymentSuccess />} />
        <Route path="order-done" element={<OrderDone />} />
        <Route path="mypage" element={<MyPage />} />
        <Route path="mypage/orders/:orderId" element={<OrderStatusView />} />
        <Route path="mypage/orders" element={<MyPageOrders />} />
        <Route path="mypage/point" element={<MyPagePoint />} />
        <Route path="mypage/account" element={<MyPageAccount />} />
        <Route path="mypage/settings" element={<MyPageSettings />} />
        <Route path="mypage/terms" element={<MyPageTerms />} />
      </Route>
      {/* 백오피스: /admin/login 은 공개, 나머지 /admin/* 는 ADMIN 전용 */}
      <Route path="/admin" element={<AdminGate />}>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="categories" element={<AdminCategories />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
