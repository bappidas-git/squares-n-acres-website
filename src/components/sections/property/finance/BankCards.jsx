import { useState } from 'react';
import { Icon } from '@iconify/react';

import { Button } from '../../../ui';
import BankCard from './BankCard';
import copy from './financeCopy';

import styles from './finance.module.css';

/** How many lenders are shown before the visitor asks for the rest. */
export const INITIAL_BANKS = 3;

/**
 * The lenders we work with, in the order master data puts them (§6.6).
 *
 * There is no headline bar over the cards any more: "lowest rate", "48 hrs" and
 * "minimal documentation" were claims the records never made (ADD-13). What is
 * left is each lender's own figures and a sentence saying they are the lender's
 * and should be confirmed with them.
 *
 * @param {object} props
 * @param {Array<object>} props.banks the active lenders
 * @param {(bank: object) => void} props.onCheckEligibility
 * @param {object} [props.triggerProps] spread onto each button — `leadTriggerProps`
 *   of `LeadCaptureContext`, which warms the dialog's chunk before the click
 */
export default function BankCards({ banks = [], onCheckEligibility, triggerProps }) {
  const [showAll, setShowAll] = useState(false);

  if (banks.length === 0) return <p className={styles.empty}>{copy.BANK_EMPTY}</p>;

  const shown = showAll ? banks : banks.slice(0, INITIAL_BANKS);

  return (
    <div>
      <p className={styles.tabIntro}>{copy.BANKS_INTRO}</p>

      <div className={styles.bankGrid}>
        {shown.map((bank) => (
          <BankCard
            key={bank.id ?? bank.slug}
            bank={bank}
            onCheckEligibility={onCheckEligibility}
            triggerProps={triggerProps}
          />
        ))}
      </div>

      {banks.length > INITIAL_BANKS ? (
        <div className={styles.moreBanks}>
          <Button
            variant="outline"
            onClick={() => setShowAll((current) => !current)}
            icon={
              <Icon icon={showAll ? 'mdi:chevron-up' : 'mdi:chevron-down'} aria-hidden="true" />
            }
          >
            {showAll ? copy.BANK_LABELS.showFewer : `${copy.BANK_LABELS.showAll} (${banks.length})`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
