import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

/**
 * The single mobile/tablet/desktop switch of the app (§8.1): `md` = 900px.
 * Every component that needs to branch on width uses this instead of its own
 * media query, so JS and CSS agree at every width.
 *
 * @returns {{ isMobile: boolean, isTablet: boolean, isDesktop: boolean, width: 'xs'|'sm'|'md'|'lg' }}
 */
export default function useBreakpoint() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'), { noSsr: true });
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile,
    width: isLarge ? 'lg' : isMobile ? (isTablet ? 'sm' : 'xs') : 'md',
  };
}
