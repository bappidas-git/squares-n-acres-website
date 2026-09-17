import { Icon } from '@iconify/react';

import Card from '../../../components/ui/Card';
import PATHS from '../../../routes/paths';
import { Button } from '../../../components/ui';

import styles from './DashboardPage.module.css';

/** The four things an editor opens the panel to do, and what each one needs. */
const LINKS = [
  {
    key: 'property',
    label: 'Add property',
    icon: 'mdi:home-plus-outline',
    to: PATHS.adminPropertyNew,
    permission: ['properties', 'create'],
  },
  {
    key: 'article',
    label: 'Write article',
    icon: 'mdi:pencil-plus-outline',
    to: PATHS.adminArticleNew,
    permission: ['articles', 'create'],
  },
  {
    key: 'seo',
    label: 'SEO issues',
    icon: 'mdi:magnify-scan',
    to: PATHS.adminSeo,
    permission: ['seo', 'view'],
  },
  {
    key: 'media',
    label: 'Media library',
    icon: 'mdi:image-multiple-outline',
    to: PATHS.adminMedia,
    permission: ['media', 'view'],
  },
];

/**
 * The shortcuts, filtered by what the signed-in role may actually do (§7).
 *
 * A link a role cannot follow is not dimmed here, it is absent: the panel
 * never offers a door that answers 403.
 *
 * @param {object} props
 * @param {(area: string, action: string) => boolean} props.can
 * @returns {React.ReactNode|null} `null` when the role may do none of them
 */
export default function QuickLinks({ can }) {
  const allowed = LINKS.filter((link) => can(link.permission[0], link.permission[1]));
  if (allowed.length === 0) return null;

  return (
    <Card as="section" className={styles.card} aria-labelledby="quick-links-heading">
      <h2 className={styles.cardTitle} id="quick-links-heading">
        Quick links
      </h2>
      <div className={styles.quickLinks}>
        {allowed.map((link) => (
          <Button
            key={link.key}
            variant="outline"
            size="sm"
            to={link.to}
            icon={<Icon icon={link.icon} width="18" height="18" />}
          >
            {link.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
