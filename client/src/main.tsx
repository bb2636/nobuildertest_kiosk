import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkErrorProvider } from './contexts/NetworkErrorContext';
import App from './App';
import './i18n';
import './index.css';

// Capacitor WebView에서는 서비스 워커 미등록(등록 시 흰 화면 등 원인 될 수 있음)
const isCapacitor = typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === 'function';
if ('serviceWorker' in navigator && !isCapacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

function mount() {
  const el = document.getElementById('root');
  if (!el) return;
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <NetworkErrorProvider>
            <App />
          </NetworkErrorProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

try {
  mount();
} catch (e) {
  console.error('[mount]', e);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;font-family:sans-serif;padding:2rem;text-align:center;"><div><p>앱을 시작할 수 없습니다.</p><button type="button" onclick="window.location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;font-size:1rem;cursor:pointer;">새로고침</button></div></div>';
  }
}
