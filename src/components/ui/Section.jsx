import useInView from '../../hooks/useInView';

import Container from './Container';
import styles from './Section.module.css';

/**
 * A page section: an optional background band, an optional `Container`, and a
 * fade-up as it enters the viewport. Replaces the thirteen local `Section`
 * components the public pages each declared (D53).
 *
 * The defaults are deliberately neutral — no background, no padding, no
 * container — so it drops into pages that already style their own sections.
 * Design-system bands opt in: `<Section background="surface" spacing="lg"
 * container="default">`.
 *
 * The fade-up is skipped entirely under `prefers-reduced-motion`: `useInView`
 * reports `inView` immediately in that case, and the CSS neutralises the
 * transform.
 *
 * @param {object} props
 * @param {'none'|'bg'|'surface'|'charcoal'} [props.background]
 * @param {'none'|'sm'|'md'|'lg'} [props.spacing]
 * @param {'flush'|'default'|'narrow'|'wide'} [props.container]
 * @param {boolean} [props.animate]
 * @param {number} [props.delay] seconds to stagger the fade-up by
 */
export default function Section({
  background = 'none',
  spacing = 'none',
  container = 'flush',
  animate = true,
  delay = 0,
  as: Tag = 'section',
  id,
  className = '',
  style,
  children,
  ...rest
}) {
  const { ref, inView } = useInView({ threshold: 0.08, triggerOnce: true });

  return (
    <Tag
      id={id}
      ref={animate ? ref : undefined}
      className={[
        styles.section,
        styles[background] || styles.none,
        styles[`spacing-${spacing}`] || styles['spacing-none'],
        animate ? styles.fade : '',
        animate && inView ? styles.fadeIn : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={delay ? { transitionDelay: `${delay}s`, ...style } : style}
      {...rest}
    >
      {container === 'flush' ? children : <Container size={container}>{children}</Container>}
    </Tag>
  );
}
