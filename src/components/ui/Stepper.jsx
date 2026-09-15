import styles from './Stepper.module.css';

/**
 * Progress through a multi-step flow (the property form, a lead wizard).
 *
 * @param {object} props
 * @param {{ label: React.ReactNode, id?: string }[]} props.steps
 * @param {number} props.active 0-based index of the current step
 * @param {'horizontal'|'vertical'} [props.orientation]
 */
export default function Stepper({
  steps = [],
  active = 0,
  orientation = 'horizontal',
  className = '',
  ...rest
}) {
  if (!steps.length) return null;

  return (
    <ol
      className={[styles.stepper, orientation === 'vertical' ? styles.vertical : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {steps.map((step, index) => {
        const done = index < active;
        const isActive = index === active;
        return (
          <li
            key={step.id ?? index}
            className={[styles.step, done ? styles.stepDone : '', isActive ? styles.stepActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {done ? '✓' : index + 1}
            </span>
            <span className={styles.label}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
