import { Icon } from '@iconify/react';

import Breadcrumbs from '../ui/Breadcrumbs';
import Button from '../ui/Button';
import Container from '../ui/Container';

import styles from './PageHero.module.css';

/**
 * The band at the top of a CMS page: an `<h1>`, a sentence, breadcrumbs and at
 * most one button, over an optional photograph.
 *
 * The image is a background rather than an `<img>` because it is decoration —
 * it carries no information a reader would miss — and it always sits under a
 * scrim, because white text over an unknown photograph is a contrast accident
 * waiting to happen (§8.3). With no image the band is the charcoal surface, so
 * the text is on a colour we chose rather than one an editor uploaded.
 *
 * @param {object} props
 * @param {string} props.title the page's `<h1>`
 * @param {string} [props.subtitle]
 * @param {string} [props.imageUrl]
 * @param {Array<{label: string, to?: string}>} [props.breadcrumbs]
 * @param {{label: string, href?: string, onClick?: () => void}|null} [props.action]
 */
export default function PageHero({ title, subtitle, imageUrl, breadcrumbs = [], action = null }) {
  const hasImage = Boolean(imageUrl);

  return (
    <header
      className={[styles.hero, hasImage ? styles.withImage : ''].filter(Boolean).join(' ')}
      style={hasImage ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      <div className={styles.scrim} aria-hidden="true" />
      <Container className={styles.inner}>
        {breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} onDark className={styles.crumbs} />
        ) : null}

        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

        {action?.label ? (
          <div className={styles.action}>
            <Button
              variant="primary"
              size="lg"
              href={action.href}
              onClick={action.onClick}
              iconRight={<Icon icon="mdi:arrow-right" width="18" height="18" />}
            >
              {action.label}
            </Button>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
