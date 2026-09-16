import { Icon } from '@iconify/react';

import { Button } from '../../ui';

import styles from './GatedOverlay.module.css';

/**
 * The lock over content a visitor has not identified themselves for yet.
 *
 * The content underneath stays in the document — it is blurred, not removed —
 * so the box keeps its size and the page does not jump when the gate opens
 * (§6, no layout shift). The blur is decorative: the overlay carries the words,
 * and the button is a real button, so a keyboard and a screen reader meet the
 * same offer a mouse does.
 *
 * @param {object} props
 * @param {string} [props.title] what is behind the gate
 * @param {string} [props.text] why we are asking
 * @param {string} [props.actionLabel]
 * @param {() => void} props.onAction opens the lead form
 * @param {React.ReactNode} props.children the content being covered
 */
export default function GatedOverlay({
  title = 'Share your details to view this',
  text,
  actionLabel = 'Unlock',
  onAction,
  className = '',
  children,
}) {
  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <div className={styles.blurred} aria-hidden="true">
        {children}
      </div>

      <div className={styles.overlay}>
        <span className={styles.lock}>
          <Icon icon="mdi:lock-outline" width="24" height="24" aria-hidden="true" />
        </span>
        <p className={styles.title}>{title}</p>
        {text ? <p className={styles.text}>{text}</p> : null}
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          icon={<Icon icon="mdi:lock-open-variant-outline" aria-hidden="true" />}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
