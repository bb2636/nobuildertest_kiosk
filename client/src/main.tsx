import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkErrorProvider } from './contexts/NetworkErrorContext';
import App from './App';
import './i18n';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
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
