import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import styles from '../SeoSettingsPage.module.css';
import { TextField } from '../../../../components/ui/FormField';

/** The four webmaster tools §6.14 stores a token for. */
export const VERIFICATION_FIELDS = [
  {
    key: 'google',
    label: 'Google Search Console',
    hint: 'The content of the google-site-verification meta tag — the token only, not the whole tag.',
  },
  {
    key: 'bing',
    label: 'Bing Webmaster Tools',
    hint: 'The content of the msvalidate.01 meta tag.',
  },
  { key: 'pinterest', label: 'Pinterest', hint: 'The content of the p:domain_verify meta tag.' },
  {
    key: 'yandex',
    label: 'Yandex Webmaster',
    hint: 'The content of the yandex-verification meta tag.',
  },
];

/**
 * Site verification (§6.14, §9.3).
 *
 * Each value is rendered as one meta tag in the head of every page, which is
 * how a webmaster tool confirms we own the domain. Verification is what unlocks
 * the reports the SEO playbook's "Measuring" topic depends on — without Search
 * Console there is no impressions data, and nothing else supplies it.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function VerificationTab({ form, disabled = false }) {
  const { values, setField, getError } = form;

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        Paste the token each tool gives you, not the whole meta tag. The site renders the tag.
      </p>

      <FormSection title="Verification tokens">
        {VERIFICATION_FIELDS.map((field) => (
          <FormColumn key={field.key} half>
            <TextField
              label={field.label}
              value={values.verification?.[field.key] ?? ''}
              onChange={(event) => setField(`verification.${field.key}`, event.target.value)}
              error={getError(`verification.${field.key}`)}
              hint={field.hint}
              disabled={disabled}
              className={styles.mono}
            />
          </FormColumn>
        ))}
      </FormSection>
    </div>
  );
}
