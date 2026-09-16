import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import ImageField from '../../../../../components/admin/ImageField';
import PATHS from '../../../../../routes/paths';
import {
  Alert,
  Avatar,
  Button,
  ConfirmDialog,
  PhoneField,
  RadioGroup,
  SelectField,
  SwitchField,
  TextField,
} from '../../../../../components/ui';
import { useTeamMembers } from '../../../../../hooks/useMasterData';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The display fields a team member lends a listing (§6.9 → §6.1 `agent`). */
const COPIED = ['name', 'phone', 'whatsapp', 'email', 'photoUrl'];

/**
 * What a chosen team member writes into the agent branch, as the dotted paths
 * `setFields` takes — one dispatch, so the six fields move together.
 */
const fromMember = (member) => ({
  'agent.teamMemberId': member?.id ?? null,
  'agent.name': member?.name ?? '',
  'agent.phone': member?.phone ?? '',
  'agent.whatsapp': member?.whatsapp ?? '',
  'agent.email': member?.email ?? '',
  'agent.photoUrl': member?.photoUrl ?? '',
});

const filled = (value) => String(value ?? '').trim() !== '';

/**
 * Tab 15 — Agent.
 *
 * Who a visitor reaches about this listing. Usually a member of the team, in
 * which case the record keeps `teamMemberId` and a **copy** of the display
 * fields — the copy is what makes an old listing keep the name it was published
 * with when somebody leaves, and what lets one listing carry a different
 * number from the rest (§6.1).
 *
 * The contact details are public only while `showOnListing` is on: the API
 * strips `phone`, `whatsapp` and `email` from a public read otherwise (§5.10).
 */
export default function AgentTab() {
  const { values, errors, setField, setFields, disabled } = usePropertyFormContext();
  const agent = values.agent ?? {};

  const mode = agent.teamMemberId ? 'team' : 'manual';
  const { members, loading, error } = useTeamMembers();
  const [pending, setPending] = useState(null);

  const options = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.designation ? `${member.name} — ${member.designation}` : member.name,
      })),
    [members]
  );

  const chosen = members.find((member) => String(member.id) === String(agent.teamMemberId)) ?? null;

  /** The fields that would be overwritten and no longer match the member. */
  const conflicts = (member) =>
    COPIED.filter((field) => filled(agent[field]) && agent[field] !== (member?.[field] ?? ''));

  const applyMember = (member) => setFields(fromMember(member));

  const chooseMember = (id) => {
    const member = members.find((row) => String(row.id) === String(id)) ?? null;
    if (!member) return;
    if (conflicts(member).length > 0) {
      setPending(member);
      return;
    }
    applyMember(member);
  };

  const chooseMode = (next) => {
    if (next === 'manual') {
      // The details stay; only the link to the team record goes, so switching
      // to "Manual" is how an editor starts from what the member lent them.
      setField('agent.teamMemberId', null);
      return;
    }
    if (members.length === 1) chooseMember(members[0].id);
  };

  const hasContact = filled(agent.phone) || filled(agent.whatsapp) || filled(agent.email);

  return (
    <>
      <FormSection
        title="Who answers this listing"
        description="A member of the team, or a name and number typed in for this listing alone."
      >
        <FormColumn>
          <RadioGroup
            label="Contact"
            value={mode}
            disabled={disabled}
            options={[
              { value: 'team', label: 'Team member' },
              { value: 'manual', label: 'Manual' },
            ]}
            onChange={chooseMode}
          />
        </FormColumn>

        {mode === 'team' ? (
          <FormColumn half>
            <SelectField
              label="Team member"
              placeholder={loading ? 'Loading the team…' : 'Choose a team member'}
              options={options}
              value={agent.teamMemberId ?? ''}
              disabled={disabled || loading || options.length === 0}
              error={errors['agent.teamMemberId']}
              hint="Their name, number and photo are copied here and stay with this listing."
              onChange={(event) => chooseMember(event.target.value)}
            />
          </FormColumn>
        ) : null}

        {mode === 'team' && chosen ? (
          <FormColumn half>
            <div className={styles.summary}>
              <p className={styles.summaryText}>
                Editing the fields below changes this listing only. {chosen.name}’s own record stays
                as it is.
              </p>
              <Button
                variant="outline"
                size="sm"
                href={PATHS.adminTeam}
                icon={<Icon icon="mdi:account-group-outline" width="16" height="16" />}
              >
                Open the team
              </Button>
            </div>
          </FormColumn>
        ) : null}

        {mode === 'team' && chosen && COPIED.every((field) => !filled(agent[field])) ? (
          <FormColumn>
            <Alert
              tone="warning"
              title="This listing names a team member but carries none of their details"
              icon={<Icon icon="mdi:account-alert-outline" width="20" height="20" />}
            >
              <p className={styles.agentPreviewNote}>
                Copy them in so the listing keeps the name and number it was published with,
                whatever happens to the team record later.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                icon={<Icon icon="mdi:content-copy" width="16" height="16" />}
                onClick={() => applyMember(chosen)}
              >
                Copy {chosen.name}’s details
              </Button>
            </Alert>
          </FormColumn>
        ) : null}

        {error && mode === 'team' ? (
          <FormColumn>
            <Alert tone="warning" title="The team could not be loaded">
              Choose “Manual” and type the details in, or reload the page to try again.
            </Alert>
          </FormColumn>
        ) : null}

        {!loading && !error && mode === 'team' && options.length === 0 ? (
          <FormColumn>
            <Alert tone="info" title="No team members yet">
              Add them under Content → Team, or choose “Manual” and type the details in.
            </Alert>
          </FormColumn>
        ) : null}
      </FormSection>

      <FormSection
        title="Contact details"
        description="What a visitor sees when the switch below is on."
      >
        <FormColumn half>
          <TextField
            label="Name"
            value={agent.name ?? ''}
            error={errors['agent.name']}
            disabled={disabled}
            maxLength={120}
            placeholder="e.g. Priya Nair"
            onChange={(event) => setField('agent.name', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <TextField
            label="E-mail"
            type="email"
            value={agent.email ?? ''}
            error={errors['agent.email']}
            disabled={disabled}
            placeholder="name@squaresnacres.com"
            onChange={(event) => setField('agent.email', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <PhoneField
            label="Phone"
            value={agent.phone ?? ''}
            error={errors['agent.phone']}
            disabled={disabled}
            hint="Ten digits, starting 6–9."
            onChange={(event) => setField('agent.phone', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <PhoneField
            label="WhatsApp"
            value={agent.whatsapp ?? ''}
            error={errors['agent.whatsapp']}
            disabled={disabled}
            hint="Leave empty to use the phone number."
            onChange={(event) => setField('agent.whatsapp', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <ImageField
            label="Photo"
            hint="avatar"
            preview
            value={agent.photoUrl ?? ''}
            error={errors['agent.photoUrl']}
            disabled={disabled}
            alt={agent.name ? `${agent.name}` : 'Agent photo'}
            onChange={(next) => setField('agent.photoUrl', next)}
          />
        </FormColumn>

        <FormColumn half>
          <SwitchField
            label="Show the contact details on the listing"
            checked={agent.showOnListing === true}
            disabled={disabled}
            hint="Contact details appear on the public page only when on."
            onChange={(next) => setField('agent.showOnListing', next === true)}
          />

          <div className={styles.agentPreview} aria-label="How the card reads on the page">
            <Avatar
              src={agent.photoUrl || undefined}
              name={agent.name || 'Squares N Acres'}
              size={56}
            />
            <div className={styles.agentPreviewBody}>
              <p className={styles.agentPreviewName}>{agent.name || 'Squares N Acres'}</p>
              {agent.showOnListing && hasContact ? (
                <ul className={styles.agentPreviewList}>
                  {filled(agent.phone) ? (
                    <li>
                      <Icon icon="mdi:phone-outline" width="14" height="14" aria-hidden="true" />
                      +91 {agent.phone}
                    </li>
                  ) : null}
                  {filled(agent.whatsapp) ? (
                    <li>
                      <Icon icon="mdi:whatsapp" width="14" height="14" aria-hidden="true" />
                      +91 {agent.whatsapp}
                    </li>
                  ) : null}
                  {filled(agent.email) ? (
                    <li>
                      <Icon icon="mdi:email-outline" width="14" height="14" aria-hidden="true" />
                      {agent.email}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className={styles.agentPreviewNote}>
                  {agent.showOnListing
                    ? 'No contact details yet — the page falls back to the office number.'
                    : 'Hidden — the page shows the office number and the enquiry form.'}
                </p>
              )}
            </div>
          </div>
        </FormColumn>
      </FormSection>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Replace the details you typed?"
        confirmLabel="Use the team member’s details"
        message={
          pending
            ? `${pending.name}’s name, number, WhatsApp, e-mail and photo will replace what is on this tab. What you typed is not kept.`
            : ''
        }
        onClose={() => setPending(null)}
        onConfirm={() => {
          applyMember(pending);
          setPending(null);
        }}
      />
    </>
  );
}
