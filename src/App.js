import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import theme from './theme';
import AppRoutes from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';
import './assets/styles/global.css';
import './assets/styles/prose.css';

/**
 * The providers that know nothing about routing sit here; the ones that do —
 * settings, master data, auth, the navigation guard — are mounted by the data
 * router's root route in `src/routes/index.js` (D97).
 */
const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppRoutes />
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
