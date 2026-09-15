import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import theme from './theme';
import AppRoutes from './routes';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import ToastProvider from './components/common/ToastProvider';
import './assets/styles/global.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', fontFamily: 'DM Sans, sans-serif', textAlign: 'center' }}>
          <h1 style={{ color: '#1B2A4A', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#6B7280', marginBottom: '2rem' }}>We apologize for the inconvenience. Please try refreshing the page.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            style={{ padding: '12px 32px', backgroundColor: '#1B2A4A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <ToastProvider>
              <AdminAuthProvider>
                <AppRoutes />
              </AdminAuthProvider>
            </ToastProvider>
          </BrowserRouter>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
