import LeadForm from '../../common/LeadForm';

import styles from './LocalitySections.module.css';

/** The requirement fields a locality enquiry carries (§6.7). */
const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Full name *' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: 'Phone number *' },
  { name: 'email', label: 'Email', type: 'email', required: false, placeholder: 'Email address' },
  { name: 'message', label: 'Message', type: 'textarea', required: false },
];

/**
 * "Looking for a home in Whitefield?" — the enquiry form at the foot of a
 * locality guide.
 *
 * The lead is filed with the source `locality-page` and the locality already in
 * its requirement, so the sales desk opens it knowing where the visitor was
 * reading. Prompt 28 unifies every form on the site behind one component; the
 * `hiddenFields` prop is the part of that unification this page needs now.
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 */
export default function LocalityCta({ locality }) {
  const { id, name } = locality;

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
          title=""
          source="locality-page"
          fields={FIELDS.map((field) =>
            field.name === 'message'
              ? { ...field, placeholder: `What are you looking for in ${name}?` }
              : field
          )}
          hiddenFields={{ requirement: { localityId: id } }}
        />
      </div>
    </section>
  );
}
