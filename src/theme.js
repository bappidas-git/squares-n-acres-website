import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1B2A4A',
      light: '#2D4470',
      dark: '#111C33',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C9A86C',
      light: '#D4BC8E',
      dark: '#B08E4A',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
      surface: '#F8F6F3',
    },
    text: {
      primary: '#1B2A4A',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 700,
      fontSize: '3rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
    caption: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontFamily: '"DM Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.06), 0px 1px 2px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.04)',
    '0px 4px 6px rgba(0, 0, 0, 0.06), 0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 6px 8px rgba(0, 0, 0, 0.06), 0px 3px 6px rgba(0, 0, 0, 0.04)',
    '0px 8px 16px rgba(0, 0, 0, 0.08), 0px 4px 8px rgba(0, 0, 0, 0.04)',
    '0px 12px 24px rgba(0, 0, 0, 0.08), 0px 6px 12px rgba(0, 0, 0, 0.04)',
    '0px 16px 32px rgba(0, 0, 0, 0.08), 0px 8px 16px rgba(0, 0, 0, 0.04)',
    '0px 20px 40px rgba(0, 0, 0, 0.1), 0px 10px 20px rgba(0, 0, 0, 0.04)',
    '0px 24px 48px rgba(0, 0, 0, 0.1), 0px 12px 24px rgba(0, 0, 0, 0.04)',
    '0px 28px 56px rgba(0, 0, 0, 0.1), 0px 14px 28px rgba(0, 0, 0, 0.04)',
    '0px 32px 64px rgba(0, 0, 0, 0.12), 0px 16px 32px rgba(0, 0, 0, 0.06)',
    '0px 36px 72px rgba(0, 0, 0, 0.12), 0px 18px 36px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
    '0px 40px 80px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.06)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollBehavior: 'smooth',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: 'none',
          },
          '&:active': {
            transform: 'scale(0.97)',
          },
          '&:focus-visible': {
            outline: '2px solid #C9A86C',
            outlineOffset: 2,
          },
          '@media (max-width: 960px)': {
            minHeight: 44,
          },
        },
        containedPrimary: {
          background: '#1B2A4A',
          '&:hover': {
            background: '#2D4470',
          },
        },
        containedSecondary: {
          background: '#C9A86C',
          '&:hover': {
            background: '#B08E4A',
          },
        },
        outlinedPrimary: {
          borderColor: '#1B2A4A',
          '&:hover': {
            borderColor: '#2D4470',
            background: 'rgba(27, 42, 74, 0.04)',
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.04)',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          '&:hover': {
            boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.08), 0px 4px 8px rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover fieldset': {
              borderColor: '#C9A86C',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1B2A4A',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1B2A4A',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.06)',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '8px !important',
          boxShadow: 'none',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, margin 0.2s ease',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '8px 0',
            borderColor: '#C9A86C',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #C9A86C',
            outlineOffset: -2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'transform 0.15s ease, background 0.2s ease',
          '&:active': {
            transform: 'scale(0.9)',
          },
          '&:focus-visible': {
            outline: '2px solid #C9A86C',
            outlineOffset: 2,
          },
          '@media (max-width: 960px)': {
            minWidth: 44,
            minHeight: 44,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9rem',
        },
      },
    },
  },
});

export default theme;
