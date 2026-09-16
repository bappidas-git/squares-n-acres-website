import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import theme from './theme';
import AppRoutes from './routes';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { MasterDataProvider } from './contexts/MasterDataContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import ToastProvider from './components/common/ToastProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import './assets/styles/global.css';

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <ToastProvider>
              <SiteSettingsProvider>
                <MasterDataProvider>
                  <AdminAuthProvider>
                    <AppRoutes />
                  </AdminAuthProvider>
                </MasterDataProvider>
              </SiteSettingsProvider>
            </ToastProvider>
          </BrowserRouter>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
