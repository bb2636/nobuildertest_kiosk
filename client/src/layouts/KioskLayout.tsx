import { Outlet } from 'react-router-dom';

export function KioskLayout() {
  return (
    <div className="kiosk-view bg-kiosk-bg text-kiosk-text">
      <Outlet />
    </div>
  );
}
