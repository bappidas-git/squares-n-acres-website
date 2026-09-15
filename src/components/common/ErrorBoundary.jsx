import React from 'react';

import { BRAND } from '../../config/site';
import Button from '../ui/Button';

import styles from './ErrorBoundary.module.css';

/**
 * The branded crash screen (§8.2). It wraps the whole app in `App.js`, so a
 * render error shows this instead of a blank page — with a way back for the
 * visitor and the stack on the console for whoever is debugging.
 */
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
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.boundary} role="alert">
        <img src={BRAND.iconUrl} alt="" className={styles.mark} />
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>
          The page could not be displayed. Reloading usually fixes it; if it does not, head back to
          the home page.
        </p>
        <div className={styles.actions}>
          {/* Plain click handlers only: the router may be the thing that failed. */}
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Go home
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
