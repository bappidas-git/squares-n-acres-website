import LeadForm from '../../common/LeadForm';
import PATHS from '../../../routes/paths';
import { SITE } from '../../../config/site';

import styles from './DeveloperSections.module.css';

/**
 * "Interested in a project by Aurelia Estates?" — the enquiry form at the foot
 * of a builder page.
 *
 * The lead is filed with the source `developer-page`, the page it was sent
 * from and a message that already names the builder, so the sales desk opens
 * it knowing what the visitor was reading. The page is carried in both fields
 * §6.7 has for it: `pageSlug` is a slug and not a path, so it holds the
 * builder's own slug — `/builders/aurelia-estates` is a 422 — and `pageUrl`
 * holds the address the seed's own developer-page leads carry.
 *
 * Prompt 28 unifies every form on the site behind one component.
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 */
export default function DeveloperCta({ developer }) {
  const { name, slug } = developer;

  const fields = [
    { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Full name *' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone number *' },
    { name: 'email', label: 'Email', type: 'email', required: false, placeholder: 'Email address' },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: false,
      defaultValue: `Interested in projects by ${name}`,
      placeholder: `What are you looking for from ${name}?`,
    },
  ];

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
          title=""
          source="developer-page"
          fields={fields}
          hiddenFields={{ pageSlug: slug, pageUrl: `${SITE.url}${PATHS.builder(slug)}` }}
        />
      </div>
    </section>
  );
}
