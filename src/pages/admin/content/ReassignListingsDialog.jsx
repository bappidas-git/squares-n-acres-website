import HandOverDialog from '../../../components/admin/HandOverDialog';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { firstFieldMessage } from '../../../services/apiError';
import { formatNumber } from '../../../utils/format';
import { team } from '../../../services/masterDataService';
import { useToast } from '../../../components/common/ToastProvider';

const sameId = (left, right) => String(left) === String(right);

const listingsWord = (count) => `${formatNumber(count)} ${count === 1 ? 'listing' : 'listings'}`;

/**
 * "Team Member 2 is the advisor on 7 listings" — before an advisor is switched
 * off (prompt 51).
 *
 * A listing whose advisor is switched off shows no advisor card on the site
 * (QA-61), so the listings of somebody who left went quiet one by one. The
 * dialog hands them to another advisor with the properties' `assignAgent` bulk
 * action, or keeps them as they are, and then switches the member off.
 *
 * @param {object} props
 * @param {{holding: Array<object>, count: number, proceed: () => Promise<unknown>}|null} props.request
 *   `holding` are the members switched off who answer for listings
 * @param {() => void} props.onClose
 */
export default function ReassignListingsDialog({ request, onClose }) {
  const toast = useToast();
  const open = Boolean(request);

  const { data } = useApi(
    (signal) => team.adminList({ perPage: 'all', isActive: true, sort: 'order' }, { signal }),
    [open],
    { enabled: open, initialData: [] }
  );

  const leaving = request?.holding ?? [];
  const candidates = (Array.isArray(data) ? data : []).filter(
    (member) => member.isActive !== false && !leaving.some((gone) => sameId(gone.id, member.id))
  );
  const one = request?.count === 1 ? leaving[0] : null;

  const confirm = async ({ handOver, target }) => {
    if (handOver) {
      const replacement = candidates.find((member) => sameId(member.id, target));
      try {
        const answers = await Promise.all(
          leaving.map((member) => propertyService.adminList({ agentId: member.id, perPage: 'all' }))
        );
        const ids = answers.flatMap((answer) =>
          (Array.isArray(answer?.data) ? answer.data : []).map((property) => property.id)
        );
        if (ids.length > 0) {
          await propertyService.bulk({
            ids,
            action: 'assignAgent',
            payload: { agentId: Number(target) },
          });
        }
        toast.success(
          `${listingsWord(ids.length)} now ${ids.length === 1 ? 'names' : 'name'} ${
            replacement?.name ?? 'the new advisor'
          }.`
        );
      } catch (thrown) {
        throw new Error(firstFieldMessage(thrown, 'The listings could not be handed over.'));
      }
    }
    await request.proceed();
    onClose?.();
  };

  return (
    <HandOverDialog
      open={open}
      title={
        one
          ? `Deactivate ${one.name}?`
          : `Deactivate ${formatNumber(request?.count ?? 0)} team members?`
      }
      summary={leaving.map((member) => ({
        key: String(member.id),
        line: (
          <>
            <strong>{member.name}</strong> is the advisor on{' '}
            {listingsWord(Number(member.listingCount) || 0)}.
          </>
        ),
      }))}
      candidates={candidates.map((member) => ({ value: String(member.id), label: member.name }))}
      handOverLabel="Hand the listings to another advisor"
      keepLabel="Keep them as they are"
      keepNote="While their advisor is switched off, the listings show no advisor card on the site."
      targetLabel="Advisor"
      footnote={`${one ? `${one.name} leaves` : 'They leave'} the About page and every block that names them. Switch them back on at any time.`}
      confirmLabels={{ handOver: 'Reassign and deactivate', keep: 'Deactivate' }}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}
