import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkErrorProvider } from './contexts/NetworkErrorContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NetworkErrorProvider>
          <App />
        </NetworkErrorProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
