import { useState } from 'react';

import BankCards from '../../sections/property/finance/BankCards';
import EmiCalculator from '../../sections/property/finance/EmiCalculator';
import { Container, NumberField, Section, SectionHeader } from '../../ui';
import { formatPrice } from '../../../utils/format';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';
import { useMasterData } from '../../../contexts/MasterDataContext';

import styles from './blocks.module.css';

/**
 * The lenders, with the EMI calculator above them (§6.10 `banks`).
 *
 * On a property page the calculator takes the listing's price; here there is no
 * listing, so the visitor types the figure they are working with. The sliders
 * still take their bounds from the lenders below them, so nobody can drag the
 * calculator to terms nobody on the page offers.
 *
 * "Check with this lender" opens the shared dialog under the canonical
 * `bank-eligibility` source, with the lender's name in `meta` (D56).
 */

/** What the price box opens on: a figure most of the seeded stock sits near. */
const DEFAULT_PRICE = 8000000;

export default function BanksBlock({ data = {}, page = {}, background = 'bg' }) {
  const { banks } = useMasterData();
  const { openLeadModal } = useLeadCapture();
  const [price, setPrice] = useState(DEFAULT_PRICE);

  const active = banks.filter((bank) => bank?.isActive !== false);
  if (active.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}

        {data.showEmiCalculator !== false ? (
          <div className={styles.emi}>
            <div className={styles.emiPrice}>
              <NumberField
                label="Property price"
                min={100000}
                step={100000}
                value={price}
                hint={`Currently ${formatPrice(price)}. Change it and the figures follow.`}
                onChange={(event) => setPrice(Number(event.target.value) || 0)}
              />
            </div>
            <EmiCalculator price={price} banks={active} />
          </div>
        ) : null}

        <BankCards
          banks={active}
          onCheckEligibility={(bank) =>
            openLeadModal({
              entry: 'bank-eligibility',
              pageSlug: page.slug ?? null,
              title: `Check with ${bank.name}`,
              meta: { bankName: bank.name },
            })
          }
        />
      </Container>
    </Section>
  );
}
