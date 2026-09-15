import { createTheme } from '@mui/material/styles';

/**
 * MUI theme — the JS mirror of the design tokens in
 * `src/assets/styles/global.css`. These two files are the only ones in `src/`
 * allowed to hold colour or font-family literals; `src/theme.test.js` asserts
 * that every value here matches its token.
 *
 * Component overrides read `theme.palette` rather than repeating literals, so a
 * palette change propagates on its own.
 */

// --color-* (§2.4)
const PRIMARY = '#CF3F38';
const PRIMARY_DARK = '#B2332D';
const PRIMARY_LIGHT = '#FBE9E8';
const CHARCOAL = '#2B2B2B';
const TEXT = '#1F1F1F';
const TEXT_MUTED = '#5F6368';
const TEXT_INVERSE = '#FFFFFF';
const BG = '#FFFFFF';
const SURFACE = '#F7F7F8';
const SURFACE_2 = '#EFEFF1';
const BORDER = '#E5E7EB';
const BORDER_STRONG = '#D1D5DB';

const SUCCESS = '#1E8E5A';
const SUCCESS_DARK = '#166B45';
const SUCCESS_BG = '#E6F4EC';
const WARNING = '#D98E04';
const WARNING_DARK = '#8A5A00';
const WARNING_BG = '#FFF4DE';
const ERROR = '#C62828';
const ERROR_DARK = '#A31F1F';
const ERROR_BG = '#FDECEC';
const INFO = '#2563EB';
const INFO_DARK = '#1D4ED8';
const INFO_BG = '#E8EFFD';

// --font-* (§2.5)
const FONT_HEADING = "'Manrope', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_BODY = "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// --shadow-* (§2.4)
const SHADOW_SM = '0 1px 2px rgba(31,31,31,.06), 0 1px 3px rgba(31,31,31,.04)';
const SHADOW_MD = '0 4px 12px rgba(31,31,31,.08), 0 2px 4px rgba(31,31,31,.04)';
const SHADOW_LG = '0 12px 32px rgba(31,31,31,.10), 0 4px 8px rgba(31,31,31,.04)';

const base = createTheme({
  breakpoints: {
    // MUI defaults, restated so the 900px mobile/desktop switch is explicit.
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  palette: {
    primary: {
      main: PRIMARY,
      dark: PRIMARY_DARK,
      light: PRIMARY_LIGHT,
      contrastText: TEXT_INVERSE,
    },
    secondary: {
      main: CHARCOAL,
      dark: TEXT,
      light: TEXT_MUTED,
      contrastText: TEXT_INVERSE,
    },
    error: { main: ERROR, dark: ERROR_DARK, light: ERROR_BG, contrastText: TEXT_INVERSE },
    warning: { main: WARNING, dark: WARNING_DARK, light: WARNING_BG, contrastText: TEXT_INVERSE },
    info: { main: INFO, dark: INFO_DARK, light: INFO_BG, contrastText: TEXT_INVERSE },
    success: { main: SUCCESS, dark: SUCCESS_DARK, light: SUCCESS_BG, contrastText: TEXT_INVERSE },
    text: { primary: TEXT, secondary: TEXT_MUTED, disabled: TEXT_MUTED },
    background: { default: BG, paper: BG },
    // Custom slot: the section/card tint that MUI has no home for.
    surface: { main: SURFACE, dark: SURFACE_2, contrastText: TEXT },
    divider: BORDER,
    grey: {
      50: BG,
      100: SURFACE,
      200: SURFACE_2,
      300: BORDER,
      400: BORDER_STRONG,
      500: TEXT_MUTED,
      600: TEXT_MUTED,
      700: CHARCOAL,
      800: CHARCOAL,
      900: TEXT,
    },
  },
  typography: {
    fontFamily: FONT_BODY,
    h1: {
      fontFamily: FONT_HEADING,
      fontWeight: 800,
      fontSize: 'clamp(2rem, 1.5rem + 2vw, 3rem)',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: FONT_HEADING,
      fontWeight: 700,
      fontSize: 'clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem)',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: FONT_HEADING,
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.35,
    },
    h4: {
      fontFamily: FONT_HEADING,
      fontWeight: 700,
      fontSize: '1.125rem',
      lineHeight: 1.35,
    },
    h5: {
      fontFamily: FONT_HEADING,
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.35,
    },
    h6: {
      fontFamily: FONT_HEADING,
      fontWeight: 600,
      fontSize: '0.875rem',
      lineHeight: 1.35,
    },
    subtitle1: { fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
    body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.6 },
    button: { fontWeight: 600, fontSize: '0.875rem', textTransform: 'none', letterSpacing: 0 },
    caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.5 },
    overline: {
      fontFamily: FONT_HEADING,
      fontWeight: 600,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
  shape: { borderRadius: 8 },
  spacing: 8,
});

const theme = createTheme(base, {
  // shadows[1..3] are the three soft tokens; the rest of the scale keeps the
  // same three so no component can reach for a heavier shadow than the system.
  shadows: base.shadows.map((value, index) => {
    if (index === 0) return 'none';
    if (index === 1) return SHADOW_SM;
    if (index === 2) return SHADOW_MD;
    return SHADOW_LG;
  }),
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { scrollBehavior: 'smooth' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
          '&:hover': { boxShadow: 'none' },
          '&:focus-visible': {
            outline: `2px solid ${base.palette.info.dark}`,
            outlineOffset: 2,
          },
          [base.breakpoints.down('md')]: { minHeight: 44 },
        },
        containedPrimary: {
          backgroundColor: base.palette.primary.main,
          '&:hover': { backgroundColor: base.palette.primary.dark },
        },
        outlinedPrimary: {
          borderColor: base.palette.primary.main,
          color: base.palette.primary.dark,
          '&:hover': {
            borderColor: base.palette.primary.dark,
            backgroundColor: base.palette.primary.light,
          },
        },
        textPrimary: { color: base.palette.primary.dark },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${base.palette.divider}`,
          boxShadow: SHADOW_SM,
          transition: 'box-shadow 250ms ease',
          '&:hover': { boxShadow: SHADOW_MD },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 12 } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover fieldset': { borderColor: base.palette.primary.main },
            '&.Mui-focused fieldset': {
              borderColor: base.palette.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: base.palette.background.default,
          color: base.palette.text.primary,
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '8px !important',
          boxShadow: 'none',
          border: `1px solid ${base.palette.divider}`,
          overflow: 'hidden',
          transition: 'border-color 200ms ease, margin 200ms ease',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: '8px 0', borderColor: base.palette.primary.light },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `2px solid ${base.palette.info.dark}`,
            outlineOffset: -2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background 200ms ease',
          '&:focus-visible': {
            outline: `2px solid ${base.palette.info.dark}`,
            outlineOffset: 2,
          },
          [base.breakpoints.down('md')]: { minWidth: 44, minHeight: 44 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { borderRadius: 0, backgroundImage: 'none' } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: base.palette.secondary.main,
          color: base.palette.secondary.contrastText,
          borderRadius: 6,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
        },
        arrow: { color: base.palette.secondary.main },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 44,
        },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: { root: { color: base.palette.primary.dark } },
    },
  },
});

export default theme;
