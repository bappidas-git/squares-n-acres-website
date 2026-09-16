import styles from './SectionPlaceholder.module.css';

/**
 * TEMPORARY — the marker that stands where a property section's content will
 * be written.
 *
 * Prompt 23 rebuilt the property page's shell on the contract shape of §6.1;
 * prompts 24 and 25 fill the eighteen sections in. Until then the page still
 * renders a wrapper per visible section — that is what the section navigation
 * scrolls to and what its scroll-spy observes — and this is what goes inside
 * one.
 *
 * It renders **only in development**. A production build gets `null`, because
 * a visitor must never be shown an empty card with a note to the developers
 * in it (§2 of prompt 23, §8.2 of the master context).
 *
 * Deleted by prompts 24/25; registered in `docs/PROJECT_STATE.md` →
 * "Pending rewrites".
 *
 * @param {object} props
 * @param {string} props.label the section's name
 * @param {number} [props.prompt] which prompt writes it
 */
export default function SectionPlaceholder({ label, prompt = 24 }) {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className={styles.placeholder}>
      <h2 className={styles.title}>{label}</h2>
      <p className={styles.text}>Section content arrives in prompt {prompt}.</p>
    </div>
  );
}
