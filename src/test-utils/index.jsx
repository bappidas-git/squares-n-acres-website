import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import theme from '../theme';
import ToastProvider from '../components/common/ToastProvider';
import { ShortlistProvider } from '../contexts/ShortlistContext';

/**
 * Render with the providers every UI-kit component may reach for.
 *
 * `initialEntries` is handed to the `MemoryRouter`, so a screen that reads a
 * route parameter can be rendered at the URL it belongs to:
 *
 *   renderWith(<Routes><Route path="/localities/:slug" … /></Routes>,
 *     { initialEntries: ['/localities/whitefield'] });
 *
 * @param {React.ReactElement} ui
 * @param {{initialEntries?: string[]}} [options] also accepts RTL's own options
 */
export default function renderWith(ui, { initialEntries, ...options } = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={initialEntries}>
            <ToastProvider>
              <ShortlistProvider>{children}</ShortlistProvider>
            </ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>
    ),
    ...options,
  });
}
