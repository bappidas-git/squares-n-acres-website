import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import PATHS from '../../../../routes/paths';
import styles from '../SettingsPage.module.css';
import { Link } from 'react-router-dom';
import { SwitchField, TextField, TextareaField } from '../../../../components/ui/FormField';

/**
 * Newsletter — the subscribe block above the footer (§6.13 `newsletter`).
 *
 * Two switches govern it and both have to be on: this one, and "Show the
 * newsletter block" on the Navigation & footer tab. This is the newsletter's
 * own switch — off means the site does not collect addresses at all.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function NewsletterTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const newsletter = values.newsletter ?? {};

  const set = (path, value) => setField(`newsletter.${path}`, value);
  const error = (path) => getError(`newsletter.${path}`);

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        Everyone who subscribes is listed under{' '}
        <Link to={PATHS.adminNewsletter}>Newsletter subscribers</Link>, where the list can be
        exported.
      </p>

      <FormSection title="The block">
        <FormColumn>
          <SwitchField
            label="Collect subscriptions"
            checked={newsletter.enabled !== false}
            onChange={(next) => set('enabled', next)}
            hint="Off hides the block everywhere and stops the endpoint being used."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Title"
            value={newsletter.title ?? ''}
            onChange={(event) => set('title', event.target.value)}
            error={error('title')}
            hint="What the block is called — “Property insight, once a month”."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Success message"
            value={newsletter.successMessage ?? ''}
            onChange={(event) => set('successMessage', event.target.value)}
            error={error('successMessage')}
            hint="Shown in place of the form once an address is accepted."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <TextareaField
            label="Subtitle"
            rows={2}
            value={newsletter.subtitle ?? ''}
            onChange={(event) => set('subtitle', event.target.value)}
            error={error('subtitle')}
            hint="What arrives, how often, and that unsubscribing is one click."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>
    </div>
  );
}
