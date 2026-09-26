import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import Button from '../../../../components/ui/Button';
import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import MultiSelect from '../../../../components/admin/MultiSelect';
import PATHS from '../../../../routes/paths';
import settingsService from '../../../../services/settingsService';
import styles from '../SettingsPage.module.css';
import { EMAIL_PATTERN } from '../../../../utils/validation';
import { LEAD_AUTO_ASSIGN, LEAD_PRIORITY } from '../../../../config/enums';
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  WHATSAPP_PLACEHOLDERS,
  fillWhatsappTemplate,
} from '../../../../config/leadWhatsapp';
import { SelectField, TextareaField } from '../../../../components/ui/FormField';
import { firstFieldMessage } from '../../../../services/apiError';
import { formatDateTime } from '../../../../utils/format';
import { listError } from '../settingsSchema';
import { useToast } from '../../../../components/common/ToastProvider';

/** What each rotation does to a lead the moment it arrives. */
export const AUTO_ASSIGN_OPTIONS = LEAD_AUTO_ASSIGN.options;

/** What the rule of each rotation is, under the select. */
const AUTO_ASSIGN_HINTS = {
  none: 'Every new lead waits in Leads until somebody takes it.',
  'round-robin': 'Round robin uses the active sales users, in id order.',
  'listing-advisor':
    'A lead about a listing goes to the listing’s advisor when their Team card is linked to an active account; any other lead follows round robin.',
};

/** The longest message the template may be, as the API allows. */
export const WHATSAPP_TEMPLATE_MAX = 500;

const sameList = (left = [], right = []) =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

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
 * when somebody joins or leaves (D15, D89). "The listing's advisor" (prompt 51)
 * routes a lead about a listing to the colleague whose Team card is the
 * listing's agent.
 *
 * The WhatsApp message is the one the desk's buttons open with, worded once
 * here; and "Send a test alert" proves the addresses before a real enquiry
 * depends on them (prompt 51).
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function LeadNotificationsTab({ form, disabled = false }) {
  const { values, errors, setField, getError } = form;
  const toast = useToast();
  const leads = values.leads ?? {};
  const emails = Array.isArray(leads.notificationEmails) ? leads.notificationEmails : [];
  const savedEmails = Array.isArray(form.baseline?.leads?.notificationEmails)
    ? form.baseline.leads.notificationEmails
    : [];
  const autoAssign = leads.autoAssign ?? 'none';
  const template =
    typeof leads.whatsappTemplate === 'string' ? leads.whatsappTemplate : DEFAULT_WHATSAPP_TEMPLATE;
  const siteUrl = String(values.general?.siteUrl ?? '').replace(/\/+$/, '');

  const preview = fillWhatsappTemplate(template, {
    name: 'Ananya',
    property: 'Lakeview Heights',
    agent: 'Ravi',
    link: siteUrl ? `${siteUrl}/properties/lakeview-heights` : '',
    brand: values.general?.siteName ?? '',
  });

  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState(null);

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data, message } = await settingsService.testLeadAlert();
      const sentTo = Array.isArray(data?.sentTo) ? data.sentTo : [];
      setLastTest({ ok: true, sentTo, at: data?.sentAt ?? new Date().toISOString() });
      toast.success(message || `A test alert was sent to ${sentTo.join(', ')}.`);
    } catch (thrown) {
      const reason = firstFieldMessage(thrown, 'The test alert could not be sent.');
      setLastTest({ ok: false, reason, at: new Date().toISOString() });
      toast.error(reason);
    } finally {
      setTesting(false);
    }
  };

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
            // …and the list says so as it is typed. Refused silently, the
            // address vanished from the box and nothing said why (QA-64).
            checkNew={(label) =>
              EMAIL_PATTERN.test(String(label).trim())
                ? null
                : `“${String(label).trim()}” is not an e-mail address`
            }
            // An address typed and followed by a click on Save was dropped,
            // and the settings saved without it (QA-64).
            commitOnBlur
            hint="Leave it empty and nobody is e-mailed; the leads screen still records everything."
            error={listError(errors, 'leads.notificationEmails')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <div className={styles.testAlert}>
            <Button
              variant="outline"
              size="sm"
              loading={testing}
              disabled={disabled}
              icon={<Icon icon="mdi:email-fast-outline" width="16" height="16" />}
              onClick={sendTest}
            >
              Send a test alert
            </Button>
            <p className={styles.hint}>
              {sameList(emails, savedEmails)
                ? 'Sends a sample lead alert to the saved addresses.'
                : 'The test goes to the saved addresses — save first to include your changes.'}
            </p>
          </div>
          {lastTest ? (
            <p
              className={lastTest.ok ? styles.testOk : styles.testFailed}
              role="status"
              aria-live="polite"
            >
              <Icon
                icon={lastTest.ok ? 'mdi:check-circle-outline' : 'mdi:alert-circle-outline'}
                width="18"
                height="18"
                aria-hidden="true"
              />
              <span>
                {lastTest.ok
                  ? `Last test: sent to ${lastTest.sentTo.join(', ')} at ${formatDateTime(
                      lastTest.at
                    )}.`
                  : `Last test failed: ${lastTest.reason}`}
              </span>
            </p>
          ) : null}
        </FormColumn>
      </FormSection>

      <FormSection title="What happens to a new lead">
        <FormColumn half>
          <SelectField
            label="Assign automatically to"
            value={autoAssign}
            onChange={(event) => setField('leads.autoAssign', event.target.value)}
            options={AUTO_ASSIGN_OPTIONS}
            error={getError('leads.autoAssign')}
            hint={AUTO_ASSIGN_HINTS[autoAssign] ?? AUTO_ASSIGN_HINTS.none}
            disabled={disabled}
          />
          {autoAssign === 'listing-advisor' ? (
            <p className={styles.hint}>
              Link a card to an account in <Link to={PATHS.adminTeam}>Team</Link> (“Admin account”).
            </p>
          ) : null}
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

      <FormSection
        title="WhatsApp message"
        description="What the WhatsApp buttons on a lead open with — the list, the lead’s page and “Send listing on WhatsApp”."
      >
        <FormColumn>
          <TextareaField
            label="Message"
            rows={3}
            maxLength={WHATSAPP_TEMPLATE_MAX}
            value={template}
            onChange={(event) => setField('leads.whatsappTemplate', event.target.value)}
            error={getError('leads.whatsappTemplate')}
            hint={`Up to ${WHATSAPP_TEMPLATE_MAX} characters. A placeholder with nothing behind it — a lead with no listing — is left out.`}
            disabled={disabled}
          />
          <ul className={styles.placeholders} aria-label="Placeholders">
            {WHATSAPP_PLACEHOLDERS.map((placeholder) => (
              <li key={placeholder.key}>
                <code>{`{${placeholder.key}}`}</code> {placeholder.label}
              </li>
            ))}
          </ul>
          <div className={styles.actionRow}>
            <p className={styles.templatePreview}>
              <span className={styles.hint}>Preview</span>
              <span>{preview}</span>
            </p>
            {template !== DEFAULT_WHATSAPP_TEMPLATE ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setField('leads.whatsappTemplate', DEFAULT_WHATSAPP_TEMPLATE)}
              >
                Use the default
              </Button>
            ) : null}
          </div>
        </FormColumn>
      </FormSection>
    </div>
  );
}
