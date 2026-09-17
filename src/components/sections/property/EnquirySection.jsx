import LeadForm from '../../common/LeadForm';
import SectionShell from './SectionShell';
import { leadFormProps } from '../../../utils/leadSources';

import styles from './EnquirySection.module.css';

/**
 * The one enquiry form on the page.
 *
 * The boilerplate mounted `EnquiryForm` three times — in the sidebar, in the
 * page and inside a mobile drawer — so a visitor met the same four boxes three
 * times over and the page carried three copies of their state (ADD-12). There
 * is one form here; the price card, the sticky bar and the gated sections all
 * open the shared dialog instead.
 *
 * Filing this lead identifies the visitor for the whole listing, so
 * `leadStorage` opens every gated kind on it — the brochure and the papers are
 * one click away from the success panel rather than one form (prompt 24 §7).
 *
 * Switching the section off hides this block only: the sticky bar and the
 * enquire buttons stay, because a listing must always be enquirable (D86).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function EnquirySection({ property, background = 'bg' }) {
  const title = property?.title ?? 'this property';
  const agent = property?.agent?.showOnListing ? property.agent : null;

  const entry = leadFormProps('property-enquiry', {
    prefill: { message: `I'm interested in ${title}` },
  });

  return (
    <SectionShell
      id="enquiry"
      title={`Interested in ${title}?`}
      subtitle="Tell us how to reach you and an advisor will call with the price sheet, the availability and a site visit slot."
      background={background}
    >
      <div className={styles.panel}>
        <LeadForm
          {...entry}
          title=""
          subtitle=""
          variant="inline"
          propertyId={property?.id ?? null}
          propertyTitle={property?.title ?? ''}
          agent={agent}
          submitLabel="Send enquiry"
          successMessage="An advisor will get back to you as soon as possible. Everything on this page is open to you now, including the brochure and the papers."
          className={styles.form}
        />
      </div>
    </SectionShell>
  );
}
