import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import styles from '../SeoSettingsPage.module.css';
import { SwitchField, TextField } from '../../../../components/ui/FormField';

/**
 * Breadcrumbs (§6.14, §9.3).
 *
 * Two fields, and one of them decides whether Google prints
 * "squaresnacres.com › Properties › Whitefield" instead of the raw URL under a
 * result. The trail is rendered as a `BreadcrumbList` on every page that has
 * one, from the same items the visible breadcrumb shows — so what the result
 * prints and what the page shows cannot disagree.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function BreadcrumbsTab({ form, disabled = false }) {
  const { values, setField, getError } = form;

  return (
    <div className={styles.tab}>
      <FormSection
        title="Breadcrumbs"
        description="The trail above a page, and the BreadcrumbList a search result prints from it."
      >
        <FormColumn half>
          <SwitchField
            label="Publish breadcrumb structured data"
            checked={values.breadcrumbs?.enabled !== false}
            onChange={(next) => setField('breadcrumbs.enabled', next)}
            hint="Off removes the trail from search results as well as from the page."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Label for the home step"
            value={values.breadcrumbs?.homeLabel ?? 'Home'}
            onChange={(event) => setField('breadcrumbs.homeLabel', event.target.value)}
            error={getError('breadcrumbs.homeLabel')}
            hint="The first step of every trail."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <p className={styles.notice}>
        A record can override its own step with the “Breadcrumb title” field on the SEO panel’s
        Advanced tab — useful when a listing’s full title is too long for a trail.
      </p>
    </div>
  );
}
