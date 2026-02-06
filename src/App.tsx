import { Routes, Route, Navigate } from 'react-router-dom';
import { KioskLayout } from './layouts/KioskLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { KioskHome } from './pages/kiosk/KioskHome';
import { KioskMenuDetail } from './pages/kiosk/KioskMenuDetail';
import { KioskCart } from './pages/kiosk/KioskCart';
import { OrderDone } from './pages/kiosk/OrderDone';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminMenu } from './pages/admin/AdminMenu';
import { AdminCategories } from './pages/admin/AdminCategories';

function App() {
  return (
    <Routes>
      {/* 키오스크 (모바일) */}
      <Route path="/" element={<KioskLayout />}>
        <Route index element={<KioskHome />} />
        <Route path="menu/:itemId" element={<KioskMenuDetail />} />
        <Route path="cart" element={<KioskCart />} />
        <Route path="order-done" element={<OrderDone />} />
      </Route>
      {/* 백오피스 (웹) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="categories" element={<AdminCategories />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
