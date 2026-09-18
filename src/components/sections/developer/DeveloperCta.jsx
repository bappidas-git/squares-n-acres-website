import LeadForm from '../../common/LeadForm';
import PATHS from '../../../routes/paths';
import { SITE } from '../../../config/site';
import { leadFormProps } from '../../../utils/leadSources';

import styles from './DeveloperSections.module.css';

/**
 * "Interested in a project by Aurelia Estates?" — the enquiry form at the foot
 * of a builder page.
 *
 * The lead is filed with the canonical source `developer-page`, the page it was
 * sent from and a message that already names the builder, so the sales desk
 * opens it knowing what the visitor was reading. The page is carried in both
 * fields §6.7 has for it: `pageSlug` holds the builder's own slug — it is a
 * slug or a slug path, never a URL, so a leading `/` is still a 422 — and
 * `pageUrl` holds the address the seed's own developer-page leads carry.
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 */
export default function DeveloperCta({ developer }) {
  const { name, slug } = developer;

  const entry = leadFormProps('developer-page', {
    title: '',
    subtitle: '',
    prefill: { message: `Interested in projects by ${name}` },
  });

  return (
    <section className={styles.cta} aria-labelledby="developer-cta">
      <div className={styles.ctaCopy}>
        <h2 className={styles.ctaTitle} id="developer-cta">
          Interested in a project by {name}?
        </h2>
        <p className={styles.ctaText}>
          Tell us what you need and an advisor will send you the current availability, the
          configurations and the payment plans across their projects.
        </p>
      </div>

      <div className={styles.ctaForm}>
        <LeadForm
          {...entry}
          fields={entry.fields.map((field) =>
            field.name === 'message'
              ? { ...field, placeholder: `What are you looking for from ${name}?` }
              : field
          )}
          pageSlug={slug}
          hiddenFields={{ pageUrl: `${SITE.url}${PATHS.builder(slug)}` }}
          submitLabel="Send enquiry"
        />
      </div>
    </section>
  );
}
