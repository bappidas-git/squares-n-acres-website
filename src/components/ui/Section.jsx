import { forwardRef, useCallback } from 'react';

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
 * A forwarded ref lands on the same element the fade-up observes, which is
 * what lets a band defer its own request until it is near the viewport:
 * `<Section ref={ref}>` beside a `useInView({ rootMargin: '200px' })` of its
 * own (§8.6, prompt 41). Both observers watch one element and neither knows
 * about the other.
 *
 * @param {object} props
 * @param {'none'|'bg'|'surface'|'charcoal'} [props.background]
 * @param {'none'|'sm'|'md'|'lg'} [props.spacing]
 * @param {'flush'|'default'|'narrow'|'wide'} [props.container]
 * @param {boolean} [props.animate]
 * @param {number} [props.delay] seconds to stagger the fade-up by
 */
const Section = forwardRef(function Section(
  {
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
  },
  forwardedRef
) {
  const { ref, inView } = useInView({ threshold: 0.08, triggerOnce: true });

  const setRefs = useCallback(
    (node) => {
      if (animate) ref(node);
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [animate, ref, forwardedRef]
  );

  return (
    <Tag
      id={id}
      ref={setRefs}
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
});

export default Section;
