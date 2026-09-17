import LeadForm from '../../common/LeadForm';
import { leadFormProps } from '../../../utils/leadSources';

import styles from './LocalitySections.module.css';

/**
 * "Looking for a home in Whitefield?" — the enquiry form at the foot of a
 * locality guide.
 *
 * The lead is filed with the canonical source `locality-page` and the locality
 * already in its requirement, so the sales desk opens it knowing where the
 * visitor was reading (§6.7).
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 */
export default function LocalityCta({ locality }) {
  const { id, name } = locality;

  const entry = leadFormProps('locality-page', { title: '', subtitle: '' });

  return (
    <section className={styles.cta} aria-labelledby="locality-cta">
      <div className={styles.ctaCopy}>
        <h2 className={styles.ctaTitle} id="locality-cta">
          Looking for a home in {name}?
        </h2>
        <p className={styles.ctaText}>
          Tell us what you need and an advisor will send you the current shortlist in {name} —
          including the listings that never reach a portal.
        </p>
      </div>

      <div className={styles.ctaForm}>
        <LeadForm
          {...entry}
          fields={entry.fields.map((field) =>
            field.name === 'message'
              ? { ...field, placeholder: `What are you looking for in ${name}?` }
              : field
          )}
          hiddenFields={{ requirement: { localityId: id } }}
          submitLabel="Send enquiry"
        />
      </div>
    </section>
  );
}
