// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import InactivityGuard from './components/InactivityGuard.jsx';
import MaintenanceProvider from './components/MaintenanceProvider.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MaintenanceProvider>
        <InactivityGuard />
        <App />

      {/* Globaler Toaster (muss im Root gemountet sein, sonst erscheinen keine Toasts) */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={10}
        containerStyle={{ zIndex: 999999 }}
      />
      </MaintenanceProvider>
    </BrowserRouter>
  </React.StrictMode>
);
