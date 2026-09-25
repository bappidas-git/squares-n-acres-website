import { Link } from 'react-router-dom';

import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import PATHS from '../../../routes/paths';

import styles from './PropertiesListPage.module.css';

/**
 * "2 of the 3 selected properties are not ready to go live" — each one named,
 * with what it lacks and a link to finish it; and, when some of the batch is
 * ready, the button that activates those (QA-62).
 *
 * The list's eye toggle, its row menu and its bulk bar never go through the
 * form, so they used to publish a listing with no photograph, no description
 * and no price. They ask the form's own rules first (`config/propertyRules`),
 * and the API refuses what slips past (a row changed in another tab) with the
 * same list, which lands here too. The articles list does the same for its
 * bulk "Publish" (QA-55).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {{total: number, notReady: Array<{id: number, title: string, gaps: string[]}>,
 *   readyIds: Array<number|string>}|null} props.check
 * @param {() => void} props.onClose
 * @param {() => void} [props.onExited]
 * @param {() => void} props.onActivateReady
 */
export default function ActivationCheckDialog({ open, check, onClose, onExited, onActivateReady }) {
  const notReady = check?.notReady ?? [];
  const ready = check?.readyIds?.length ?? 0;
  const total = check?.total ?? 0;
  const noun = (count) => (count === 1 ? 'property' : 'properties');

  const title =
    notReady.length === 1 && total <= 1
      ? `“${notReady[0].title}” is not ready to go live`
      : `${notReady.length} of the ${total} selected ${noun(total)} ${
          notReady.length === 1 ? 'is' : 'are'
        } not ready to go live`;

  return (
    <ConfirmDialog
      open={open}
      variant={ready > 0 ? 'confirm' : 'alert'}
      title={title}
      message={
        ready > 0
          ? `${ready === 1 ? 'One other is' : `${ready} others are`} ready, and can be activated now; the rest stay as they are.`
          : 'A published listing needs a photograph with a description, a one-line summary, 300 characters of description and a price. Open it to finish it.'
      }
      confirmLabel={`Activate ${ready} ${noun(ready)}`}
      cancelLabel="Cancel"
      okLabel="Got it"
      onClose={onClose}
      onConfirm={onActivateReady}
      onExited={onExited}
    >
      <ul className={styles.gapList}>
        {notReady.map((entry) => (
          <li key={entry.id}>
            <Link className={styles.gapTitle} to={PATHS.adminPropertyEdit(entry.id)}>
              {entry.title}
            </Link>
            <span className={styles.meta}>{entry.gaps.join(' · ')}</span>
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  );
}
