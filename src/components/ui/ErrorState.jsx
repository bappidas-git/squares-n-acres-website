import Button from './Button';
import EmptyState from './EmptyState';
import { ERRORS } from '../../config/copy';

/**
 * The failure twin of `EmptyState`: same layout, error tone, and a retry button
 * wired to the view's `refetch` (§8.2).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.text]
 * @param {() => void} [props.onRetry]
 * @param {string} [props.retryLabel]
 */
export default function ErrorState({
  icon = '!',
  title = ERRORS.title,
  text = ERRORS.text,
  onRetry,
  retryLabel = ERRORS.retry,
  action,
  ...rest
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      text={text}
      action={
        action ??
        (onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null)
      }
      role="alert"
      {...rest}
    />
  );
}
