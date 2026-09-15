import MuiSkeleton from '@mui/material/Skeleton';

/**
 * A loading placeholder. Wraps MUI's `Skeleton` so every skeleton in the app
 * shares the same surface tint and wave animation.
 *
 * @param {object} props
 * @param {'text'|'rectangular'|'rounded'|'circular'} [props.variant]
 * @param {number|string} [props.width]
 * @param {number|string} [props.height]
 */
export default function Skeleton({ variant = 'rounded', sx, ...rest }) {
  return (
    <MuiSkeleton
      variant={variant}
      animation="wave"
      sx={{ bgcolor: 'var(--color-surface-2)', ...sx }}
      {...rest}
    />
  );
}
