import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import MultiSelect from '../../../../components/admin/MultiSelect';
import PATHS from '../../../../routes/paths';
import styles from '../SettingsPage.module.css';
import { EMAIL_PATTERN } from '../../../../utils/validation';
import { LEAD_PRIORITY } from '../../../../config/enums';
import { Link } from 'react-router-dom';
import { SelectField } from '../../../../components/ui/FormField';

/** What each rotation does to a lead the moment it arrives. */
export const AUTO_ASSIGN_OPTIONS = [
  { value: 'none', label: 'Nobody — leads arrive unassigned' },
  { value: 'round-robin', label: 'Round robin between the sales users' },
];

/**
 * Lead notifications — what happens to an enquiry the moment it is made
 * (§6.13 `leads`).
 *
 * This is the one branch of the record the public API never serves: `GET
 * /settings` is everything except `leads` (§5.10), so a visitor cannot read who
 * is told about their enquiry.
 *
 * Round robin hands each new lead to the next active sales user in id order;
 * the turn is derived from the leads themselves, so nothing has to be reset
 * when somebody joins or leaves (D15, D89).
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function LeadNotificationsTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const leads = values.leads ?? {};
  const emails = Array.isArray(leads.notificationEmails) ? leads.notificationEmails : [];

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        Admin-only: none of this is part of the public settings the site reads. Every lead is in{' '}
        <Link to={PATHS.adminLeads}>Leads</Link> whatever is set here.
      </p>

      <FormSection
        title="Who is told"
        description="The addresses a new enquiry is sent to. Type an address and press Enter."
      >
        <FormColumn>
          <MultiSelect
            label="Notification e-mails"
            options={emails.map((email) => ({ value: email, label: email }))}
            value={emails}
            onChange={(next) => setField('leads.notificationEmails', next)}
            creatable
            onCreate={(label) => {
              const email = String(label).trim().toLowerCase();
              // A malformed address is refused here rather than saved and then
              // reported: the chip would look exactly like a working one.
              return EMAIL_PATTERN.test(email) ? { value: email, label: email } : undefined;
            }}
            hint="Leave it empty and nobody is e-mailed; the leads screen still records everything."
            error={getError('leads.notificationEmails')}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="What happens to a new lead">
        <FormColumn half>
          <SelectField
            label="Assign automatically to"
            value={leads.autoAssign ?? 'none'}
            onChange={(event) => setField('leads.autoAssign', event.target.value)}
            options={AUTO_ASSIGN_OPTIONS}
            error={getError('leads.autoAssign')}
            hint="Round robin uses the active sales users, in id order."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="Default priority"
            value={leads.defaultPriority ?? 'medium'}
            onChange={(event) => setField('leads.defaultPriority', event.target.value)}
            options={LEAD_PRIORITY.options}
            error={getError('leads.defaultPriority')}
            hint="What a lead is worth before anyone has read it."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>
    </div>
  );
}
