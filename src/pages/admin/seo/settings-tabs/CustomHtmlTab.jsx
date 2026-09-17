import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import styles from '../SeoSettingsPage.module.css';
import { TextareaField } from '../../../../components/ui/FormField';

/**
 * Custom head and body HTML (§6.14, §9.3, §7).
 *
 * Whatever is in these two fields is rendered **verbatim** into every page of
 * the public site: the first into `<head>`, the second immediately before
 * `</body>`. That is what makes them useful — a verification tag a product does
 * not offer a field for, a consent banner, a chat widget — and what makes them
 * the most dangerous fields in the admin. A script here runs in every visitor's
 * browser with the site's own origin.
 *
 * So they are **administrator-only**, enforced twice: the tab is not in the
 * strip for a manager (§7 of prompt 37 — "Custom HTML tab hidden for manager"),
 * and `PUT /admin/seo/settings` answers 403 to a manager whose body changes
 * either field. A manager saving any other tab succeeds.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function CustomHtmlTab({ form, disabled = false }) {
  const { values, setField, getError } = form;

  return (
    <div className={styles.tab}>
      <p className={styles.warning}>
        Trusted administrators only — whatever is here is rendered verbatim on every page of the
        public site, scripts included. Paste nothing you have not read.
      </p>

      <FormSection
        title="Head HTML"
        description="Rendered inside <head> on every page — meta tags, link tags, verification snippets, analytics that Site settings cannot express."
      >
        <FormColumn>
          <TextareaField
            label="Custom head HTML"
            rows={10}
            className={styles.mono}
            value={values.customHeadHtml ?? ''}
            onChange={(event) => setField('customHeadHtml', event.target.value)}
            error={getError('customHeadHtml')}
            disabled={disabled}
            hint="Leave empty unless something specific needs it."
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Body end HTML"
        description="Rendered immediately before </body> — chat widgets and anything that must load after the page."
      >
        <FormColumn>
          <TextareaField
            label="Custom body HTML"
            rows={10}
            className={styles.mono}
            value={values.customBodyEndHtml ?? ''}
            onChange={(event) => setField('customBodyEndHtml', event.target.value)}
            error={getError('customBodyEndHtml')}
            disabled={disabled}
            hint="A widget here costs page speed on every page. Measure after adding one."
          />
        </FormColumn>
      </FormSection>

      <p className={styles.notice}>
        Removing a snippet is as important as adding one: a tag for a tool nobody uses any more is a
        request on every page load, for nothing.
      </p>
    </div>
  );
}
