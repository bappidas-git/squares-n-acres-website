import React from 'react';

import { BRAND } from '../../config/site';
import { ERRORS } from '../../config/copy';
import Button from '../ui/Button';

import styles from './ErrorBoundary.module.css';

/**
 * The branded crash screen (§8.2).
 *
 * It is mounted three times.
 *
 * 1. The outer one wraps the whole app in `App.js` and is the last resort: it
 *    catches a failure in the router itself, so it can render nothing that
 *    needs a router — no `<Seo>`, no links.
 * 2. The route boundary sits inside the router (`routes/RouteBoundary.jsx`)
 *    and passes `head={<Seo type="error" />}`, which is what gives a crashed
 *    *page* a title and a `noindex` (§9.3). Its `resetKey` is the pathname, so
 *    navigating away from a page that threw clears the screen and the next
 *    page renders — recovery without a full reload, which is what a visitor
 *    who clicks the header after a crash expects.
 * 3. `variant="inline"` sits inside `AdminLayout`, below the topbar and beside
 *    the sidebar, so an admin screen that throws leaves the panel navigable and
 *    offers "Reload this page" rather than a full-viewport apology.
 *
 * There are two ways to clear the screen. A new **key** remounts the boundary,
 * and everything below it, with `hasError: false` — which is what the inline
 * boundary wants, since the screen below it is new on every navigation. A new
 * **`resetKey`** clears a screen that is showing and leaves the children alone
 * when nothing threw: the route boundary has the whole admin shell below it,
 * and remounting that on every navigation is what sent the sidebar back to its
 * top after each click.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.head] rendered beside the screen when it shows
 * @param {'page'|'inline'} [props.variant]
 * @param {string|number} [props.resetKey] a change clears the screen if it shows
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

  componentDidUpdate(previousProps, previousState) {
    // Only a screen that was already showing is cleared. The update that
    // caught the error may be the very one that moved `resetKey` — a page that
    // throws as it is navigated to — and clearing it there would render the
    // same page straight into the same error.
    if (
      this.state.hasError &&
      previousState.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const inline = this.props.variant === 'inline';

    return (
      <div
        className={[styles.boundary, inline ? styles.inline : ''].filter(Boolean).join(' ')}
        role="alert"
      >
        {this.props.head ?? null}
        <img src={BRAND.iconUrl} alt="" className={styles.mark} />
        <h1 className={styles.title}>{ERRORS.boundary.title}</h1>
        <p className={styles.text}>{ERRORS.boundary.text}</p>
        <div className={styles.actions}>
          {/* Plain click handlers only: the router may be the thing that failed. */}
          <Button onClick={() => window.location.reload()}>
            {inline ? ERRORS.boundary.reloadPage : ERRORS.boundary.reload}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            {ERRORS.boundary.goHome}
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
