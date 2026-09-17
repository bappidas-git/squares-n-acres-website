import { useState } from 'react';
import { Icon } from '@iconify/react';

import { DEFAULT_ASSESSMENT_RATE } from '../../../../utils/finance';
import { Tabs } from '../../../ui';
import BankCards from './BankCards';
import EligibilityAssessment from './EligibilityAssessment';
import EligibilityModal from './EligibilityModal';
import EmiCalculator from './EmiCalculator';
import SectionShell from '../SectionShell';
import copy from './financeCopy';
import { useBanks } from '../../../../hooks/useMasterData';

import styles from './finance.module.css';

/** The price the calculator works from: the price, or the bottom of its range. */
export const financePrice = (property) => {
  const pricing = property?.pricing ?? {};
  const price = Number(pricing.price);
  if (Number.isFinite(price) && price > 0) return price;
  const min = Number(pricing.priceRangeMin);
  return Number.isFinite(min) && min > 0 ? min : 0;
};

/**
 * The home-loan section: where you stand, who lends, and what it costs a month.
 *
 * It replaces the boilerplate's 1 808-line `FinanceGuide`, which asserted a
 * rate, a turnaround, a funding share and a processing fee that no record
 * carried, over six real bank brands, and showed an assessment score whether or
 * not the lead had been stored (ADD-13). Everything printed here now comes from
 * the lender records of §6.6, from `utils/finance.js` or from `financeCopy.js`.
 *
 * `getVisibleSections` decides whether this section exists at all — a sale
 * listing, with a price, and at least one active lender — so the component does
 * not second-guess it beyond the one thing it can see that the rule cannot: a
 * price of zero leaves it nothing to calculate.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function FinanceSection({ property, background = 'bg' }) {
  const banks = useBanks();
  const [tab, setTab] = useState('eligibility');
  const [bankInQuestion, setBankInQuestion] = useState(null);

  const price = financePrice(property);
  const propertyId = property?.id ?? null;

  if (price <= 0 || banks.length === 0) return null;

  const rates = banks.map((bank) => Number(bank.interestRateMin)).filter((rate) => rate > 0);
  const rate = rates.length > 0 ? Math.min(...rates) : DEFAULT_ASSESSMENT_RATE;

  const items = copy.TABS.map((entry) => ({
    value: entry.value,
    label: (
      <>
        <Icon icon={entry.icon} aria-hidden="true" /> {entry.label}
      </>
    ),
  }));

  return (
    <SectionShell
      id="finance"
      title={copy.SECTION_TITLE}
      subtitle={copy.SECTION_SUBTITLE}
      background={background}
    >
      <Tabs
        items={items}
        value={tab}
        onChange={setTab}
        variant="pills"
        label="Home loan tools"
        className={styles.tabs}
      >
        <div className={styles.panel}>
          {tab === 'eligibility' ? (
            <EligibilityAssessment propertyId={propertyId} propertyPrice={price} rate={rate} />
          ) : null}

          {tab === 'banks' ? (
            <BankCards banks={banks} onCheckEligibility={setBankInQuestion} />
          ) : null}

          {tab === 'emi' ? <EmiCalculator price={price} banks={banks} /> : null}
        </div>
      </Tabs>

      <EligibilityModal
        open={Boolean(bankInQuestion)}
        onClose={() => setBankInQuestion(null)}
        bank={bankInQuestion}
        propertyId={propertyId}
        propertyPrice={price}
      />
    </SectionShell>
  );
}
