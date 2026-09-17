import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import styles from '../SeoSettingsPage.module.css';
import { TextareaField } from '../../../../components/ui/FormField';
import { buildUrl } from '../../../../services/http';
import { endpoints } from '../../../../services/endpoints';

/**
 * The recommended document of §9.8, verbatim.
 *
 * It allows every search engine and every named assistant crawler — blocking
 * those removes us from their answers without improving anything — and
 * disallows the four kinds of URL that have nothing to index. `%siteurl%` is
 * replaced by the API when the file is served, and the per-type sitemap lines
 * are appended there too, so this is the whole document an editor owns.
 */
export const RECOMMENDED_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /shortlist
Disallow: /*?preview=
Disallow: /*?q=

User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: DuckDuckBot
Allow: /
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Applebot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Bytespider
Allow: /

Sitemap: %siteurl%/sitemap.xml`;

/**
 * robots.txt (§9.8).
 *
 * One text file that every crawler reads first, and the only place on this
 * admin where a single character can remove the whole site from search — which
 * is why "Restore recommended" is one click and why it asks first.
 *
 * The recommended document allows every search engine and every named assistant
 * crawler, and disallows only the four kinds of URL that have nothing to index:
 * the admin, the shortlist, preview links and search results.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function RobotsTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const [confirming, setConfirming] = useState(false);

  const current = values.robotsTxt ?? '';
  const isRecommended = current.trim() === RECOMMENDED_ROBOTS_TXT.trim();

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        Disallowing a page stops it being <em>read</em>, not indexed. To keep a page out of search,
        switch indexing off on the record itself.
      </p>

      <FormSection
        title="robots.txt"
        description="Served at /robots.txt, with %siteurl% replaced and the sitemap lines appended."
        action={
          <div className={styles.linkRow}>
            <Button
              variant="ghost"
              size="sm"
              href={buildUrl(endpoints.sitemap.robots)}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={disabled || isRecommended}
              icon={<Icon icon="mdi:restore" width="16" height="16" />}
            >
              Restore recommended
            </Button>
          </div>
        }
      >
        <FormColumn>
          <TextareaField
            label="Document"
            rows={22}
            className={styles.mono}
            value={current}
            onChange={(event) => setField('robotsTxt', event.target.value)}
            error={getError('robotsTxt')}
            hint={
              isRecommended
                ? 'This is the recommended document, unchanged.'
                : 'This document differs from the recommended one.'
            }
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <ConfirmDialog
        open={confirming}
        title="Restore the recommended robots.txt?"
        message="Everything currently in the field is replaced. The change is applied when you save."
        confirmLabel="Restore"
        onConfirm={() => {
          setField('robotsTxt', RECOMMENDED_ROBOTS_TXT);
          setConfirming(false);
        }}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
