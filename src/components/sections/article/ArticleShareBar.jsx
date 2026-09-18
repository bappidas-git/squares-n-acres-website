import { useCallback } from 'react';
import { Icon } from '@iconify/react';

import { EVENTS, track } from '../../../utils/analytics';
import { useToast } from '../../common/ToastProvider';

import styles from './ArticleShareBar.module.css';
import { BLOG, PROPERTY, fill } from '../../../config/copy';

/**
 * The four networks a Bengaluru reader actually forwards an article on, plus
 * the link itself.
 *
 * They are ordinary links rather than a share sheet: `navigator.share` exists
 * on a phone and on Safari, and nowhere else, so a bar that depended on it
 * would be a dead row of icons on most desktops (§7 of prompt 34). The
 * operating system's own sheet is still one tap away from the browser's menu.
 */
const NETWORKS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: 'mdi:whatsapp',
    href: ({ title, url }) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    key: 'x',
    label: 'X',
    icon: 'mdi:alpha-x-box-outline',
    href: ({ title, url }) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: 'mdi:linkedin',
    href: ({ url }) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: 'mdi:facebook',
    href: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
];

/**
 * "Share this article" — four networks and a copy button.
 *
 * Every click sends `share_click` with the network it went to, which is the
 * event name `utils/analytics` registers and `ShareButton` already uses, so
 * one GA4 report covers the whole site rather than two.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.url] defaults to the address in the bar
 * @param {string} [props.label]
 */
export default function ArticleShareBar({
  title = '',
  url,
  label = 'Share this article',
  className = '',
}) {
  const toast = useToast();
  const href = url || (typeof window === 'undefined' ? '' : window.location.href);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(href);
      toast.success(PROPERTY.linkCopied);
    } catch {
      toast.error('Could not copy the link. Please copy it from the address bar.');
    }
    track(EVENTS.shareClick, { method: 'copy', context: 'article' });
  }, [href, toast]);

  return (
    <div className={[styles.bar, className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>

      <ul className={styles.list}>
        {NETWORKS.map((network) => (
          <li key={network.key}>
            <a
              href={network.href({ title, url: href })}
              target="_blank"
              rel="noopener noreferrer"
              className={[styles.button, styles[network.key]].filter(Boolean).join(' ')}
              onClick={() => track(EVENTS.shareClick, { method: network.key, context: 'article' })}
            >
              <Icon icon={network.icon} width="20" height="20" aria-hidden="true" />
              <span className={styles.srOnly}>
                {fill(BLOG.shareOn, { network: network.label })}
              </span>
            </a>
          </li>
        ))}
        <li>
          <button type="button" className={styles.button} onClick={copy}>
            <Icon icon="mdi:link-variant" width="20" height="20" aria-hidden="true" />
            <span className={styles.srOnly}>Copy the link to this article</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
