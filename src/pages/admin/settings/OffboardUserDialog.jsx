import HandOverDialog from '../../../components/admin/HandOverDialog';
import leadService from '../../../services/leadService';
import useApi from '../../../hooks/useApi';
import userService from '../../../services/userService';
import { LEAD_OPEN_STATUSES } from '../../../config/enums';
import { firstFieldMessage } from '../../../services/apiError';
import { formatNumber } from '../../../utils/format';
import { useToast } from '../../../components/common/ToastProvider';

const sameId = (left, right) => String(left) === String(right);

const leadsWord = (count) => `${formatNumber(count)} open ${count === 1 ? 'lead' : 'leads'}`;

/**
 * The open leads each account holds, for the accounts that hold any.
 *
 * @param {Array<object>} users
 * @returns {Promise<Array<{user: object, ids: Array<number>}>>}
 */
export async function openLeadsOf(users) {
  const answers = await Promise.all(
    users.map((user) =>
      leadService.adminList({
        assignedTo: String(user.id),
        status: LEAD_OPEN_STATUSES,
        perPage: 'all',
      })
    )
  );
  return users
    .map((user, index) => ({
      user,
      ids: (Array.isArray(answers[index]?.data) ? answers[index].data : []).map((lead) => lead.id),
    }))
    .filter((entry) => entry.ids.length > 0);
}

/**
 * "Ravi has 9 open leads" — before an account is switched off or deleted
 * (prompt 51).
 *
 * Deactivating somebody left their leads with a person who could no longer
 * sign in to work them; nobody else saw them in "Mine". The dialog hands them
 * to a colleague with the leads' own bulk assign, or leaves them unassigned for
 * the desk to take — and then does what was asked. Deleting an account already
 * unassigns its leads, so "Leave them unassigned" there is the delete as it
 * always was.
 *
 * @param {object} props
 * @param {{action: 'deactivate'|'delete', holding: Array<{user: object, ids: Array<number>}>,
 *   count: number, proceed: () => Promise<unknown>}|null} props.request
 * @param {() => void} props.onClose
 */
export default function OffboardUserDialog({ request, onClose }) {
  const toast = useToast();
  const open = Boolean(request);

  const { data } = useApi(
    (signal) => userService.list({ perPage: 'all', isActive: true }, { signal }),
    [open],
    { enabled: open, initialData: [] }
  );

  // The sales desk takes them over — the people who work leads for a living.
  // With nobody else on it, "Leave them unassigned" is the only way.
  const leaving = request?.holding.map((entry) => entry.user) ?? [];
  const candidates = (Array.isArray(data) ? data : []).filter(
    (user) =>
      user.role === 'sales' &&
      user.isActive !== false &&
      !leaving.some((gone) => sameId(gone.id, user.id))
  );

  const deleting = request?.action === 'delete';
  const one = request?.count === 1 ? request.holding[0]?.user : null;
  const verb = deleting ? 'Delete' : 'Deactivate';
  const title = one
    ? `${verb} ${one.name}?`
    : `${verb} ${formatNumber(request?.count ?? 0)} users?`;

  const confirm = async ({ handOver, target }) => {
    const ids = request.holding.flatMap((entry) => entry.ids);
    try {
      if (handOver) {
        const owner = candidates.find((user) => sameId(user.id, target));
        await leadService.bulk({ ids, action: 'assign', payload: { assignedTo: Number(target) } });
        toast.success(
          `${formatNumber(ids.length)} ${ids.length === 1 ? 'lead is' : 'leads are'} now ${
            owner ? `${owner.name}’s` : 'handed over'
          }.`
        );
      } else if (!deleting) {
        await leadService.bulk({ ids, action: 'assign', payload: { assignedTo: null } });
      }
      // Deleting an account unassigns whatever it still holds, as it always has.
    } catch (thrown) {
      throw new Error(firstFieldMessage(thrown, 'The leads could not be handed over.'));
    }
    await request.proceed();
    onClose?.();
  };

  return (
    <HandOverDialog
      open={open}
      title={title}
      summary={(request?.holding ?? []).map((entry) => ({
        key: String(entry.user.id),
        line: (
          <>
            <strong>{entry.user.name}</strong> has {leadsWord(entry.ids.length)}.
          </>
        ),
      }))}
      candidates={candidates.map((user) => ({ value: String(user.id), label: user.name }))}
      handOverLabel="Hand them to another salesperson"
      keepLabel="Leave them unassigned"
      keepNote={
        candidates.length === 0
          ? 'Nobody else in sales is active to take them: they wait in Leads, unassigned, until somebody takes them or is given them.'
          : 'They wait in Leads, unassigned, until somebody takes them or is given them.'
      }
      targetLabel="Salesperson"
      footnote={
        deleting
          ? `${one ? `${one.name} is` : 'The accounts are'} removed for good. This cannot be undone.`
          : `${one ? `${one.name} can` : 'They can'} no longer sign in. Switch the account back on at any time.`
      }
      confirmLabels={
        deleting
          ? { handOver: 'Hand over and delete', keep: 'Delete' }
          : { handOver: 'Hand over and deactivate', keep: 'Unassign and deactivate' }
      }
      danger={deleting}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}
