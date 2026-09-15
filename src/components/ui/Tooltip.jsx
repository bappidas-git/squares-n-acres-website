import MuiTooltip from '@mui/material/Tooltip';

/**
 * A charcoal tooltip. The styling lives in the theme (`MuiTooltip`), so this
 * wrapper only fixes the defaults: an arrow, and a touch-friendly delay.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {'top'|'bottom'|'left'|'right'} [props.placement]
 */
export default function Tooltip({ title, placement = 'top', children, ...rest }) {
  if (!title) return children;
  return (
    <MuiTooltip
      title={title}
      placement={placement}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={3000}
      {...rest}
    >
      {children}
    </MuiTooltip>
  );
}
