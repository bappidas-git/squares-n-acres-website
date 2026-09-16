import { useId } from 'react';

import { sectionElementId } from './SectionNav';

import styles from './SectionShell.module.css';

/**
 * The wrapper every section of a property page is printed in.
 *
 * It owns the three things the sections must agree about and nothing else: the
 * element id the sub-navigation scrolls to, the H2 that names the section (and
 * labels the landmark), and the vertical rhythm between them. A section that
 * has nothing to show never reaches this component — `getVisibleSections`
 * decides that, once, for the page and its navigation alike (BUG-06).
 *
 * `background="surface"` paints the band behind a section; the page alternates
 * it so two long lists of facts do not run into one another.
 *
 * @param {object} props
 * @param {string} props.id the `sectionVisibility` key — the element becomes `section-<key>`
 * @param {React.ReactNode} props.title the H2
 * @param {React.ReactNode} [props.subtitle] one line under it
 * @param {React.ReactNode} [props.action] a control on the heading row
 * @param {'bg'|'surface'} [props.background]
 * @param {React.ReactNode} props.children
 */
export default function SectionShell({
  id,
  title,
  subtitle,
  action,
  background = 'bg',
  className = '',
  children,
  ...rest
}) {
  const headingId = `${useId()}-heading`;

  return (
    <section
      id={sectionElementId(id)}
      aria-labelledby={headingId}
      className={[styles.section, background === 'surface' ? styles.surface : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title} id={headingId}>
            {title}
          </h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>

      {children}
    </section>
  );
}
