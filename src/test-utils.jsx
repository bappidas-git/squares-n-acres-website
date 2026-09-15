import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import theme from './theme';

/** Render with the providers every UI-kit component may reach for. */
export default function renderWith(ui, options) {
  return render(ui, {
    wrapper: ({ children }) => (
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <MemoryRouter>{children}</MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>
    ),
    ...options,
  });
}
