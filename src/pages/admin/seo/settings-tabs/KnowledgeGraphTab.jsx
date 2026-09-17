import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import ImageField from '../../../../components/admin/ImageField';
import MultiSelect from '../../../../components/admin/MultiSelect';
import styles from '../SeoSettingsPage.module.css';
import {
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from '../../../../components/ui/FormField';

/** The three types §6.14 allows, and what each one claims. */
export const ORGANISATION_TYPES = [
  { value: 'RealEstateAgent', label: 'RealEstateAgent — a firm that transacts property' },
  { value: 'LocalBusiness', label: 'LocalBusiness — a business with a walk-in address' },
  { value: 'Organization', label: 'Organization — the neutral option' },
];

/** Schema.org opening-hours strings, in the shape the specification wants. */
export const OPENING_HOURS_SUGGESTIONS = [
  'Mo-Sa 10:00-19:00',
  'Mo-Fr 09:30-18:30',
  'Mo-Su 09:00-20:00',
  'Sa 10:00-14:00',
  'Su 11:00-16:00',
];

/**
 * The knowledge graph (§6.14, §9.3).
 *
 * This is the one place the site says, in machine-readable form, **who** is
 * publishing it: the name, the logo, the address, the phone number and the
 * profiles that corroborate all of it. Every page carries it as JSON-LD, and
 * Google reconciles it with the Business Profile.
 *
 * Which is why the warning matters more than the fields: these values have to
 * match the Business Profile character for character. "Squares N Acres" and
 * "Squares and Acres" are two businesses as far as the reconciliation is
 * concerned, and it silently believes neither.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {{localities?: Array<object>, cities?: Array<object>}} [props.context] master data,
 *   so “areas served” offers the localities the site already covers
 * @param {boolean} [props.disabled]
 */
export default function KnowledgeGraphTab({ form, context = {}, disabled = false }) {
  const { values, setField, getError } = form;
  const graph = values.knowledgeGraph ?? {};

  const set = (path, value) => setField(`knowledgeGraph.${path}`, value);
  const error = (path) => getError(`knowledgeGraph.${path}`);

  // The localities the site already covers, offered rather than imposed: an
  // area served is a claim about the firm, not a mirror of the master data.
  const areaOptions = [
    ...(context.cities ?? []).map((city) => city.name),
    ...(context.localities ?? []).map((locality) => locality.name),
  ].map((name) => ({ value: name, label: name }));

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        These values are published on every page as structured data. They must match the Google
        Business Profile exactly — the same name, the same address, the same phone number.
      </p>

      <FormSection title="The organisation">
        <FormColumn half>
          <SelectField
            label="Type"
            value={graph.type ?? 'RealEstateAgent'}
            onChange={(event) => set('type', event.target.value)}
            options={ORGANISATION_TYPES}
            error={error('type')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Name"
            value={graph.name ?? ''}
            onChange={(event) => set('name', event.target.value)}
            error={error('name')}
            hint="Exactly as it is written everywhere else."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Legal name"
            value={graph.legalName ?? ''}
            onChange={(event) => set('legalName', event.target.value)}
            error={error('legalName')}
            hint="The registered entity, when it differs from the trading name."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Price range"
            value={graph.priceRange ?? ''}
            onChange={(event) => set('priceRange', event.target.value)}
            error={error('priceRange')}
            hint="A coarse indication, e.g. ₹₹ or ₹50L–₹5Cr."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <ImageField
            label="Logo"
            hint="logo"
            value={graph.logoUrl ?? ''}
            onChange={(next) => set('logoUrl', next)}
            error={error('logoUrl')}
            alt="The organisation logo"
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <TextareaField
            label="Description"
            rows={3}
            value={graph.description ?? ''}
            onChange={(event) => set('description', event.target.value)}
            error={error('description')}
            hint="One paragraph about the firm — what it does and where."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="Contact">
        <FormColumn half>
          <TextField
            label="Phone"
            value={graph.phone ?? ''}
            onChange={(event) => set('phone', event.target.value)}
            error={error('phone')}
            hint="The number a visitor would dial, including the country code."
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="E-mail"
            type="email"
            value={graph.email ?? ''}
            onChange={(event) => set('email', event.target.value)}
            error={error('email')}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="Address">
        <FormColumn>
          <TextField
            label="Street address"
            value={graph.address?.streetAddress ?? ''}
            onChange={(event) => set('address.streetAddress', event.target.value)}
            error={error('address.streetAddress')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Locality"
            value={graph.address?.addressLocality ?? ''}
            onChange={(event) => set('address.addressLocality', event.target.value)}
            error={error('address.addressLocality')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="State"
            value={graph.address?.addressRegion ?? ''}
            onChange={(event) => set('address.addressRegion', event.target.value)}
            error={error('address.addressRegion')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="PIN code"
            value={graph.address?.postalCode ?? ''}
            onChange={(event) => set('address.postalCode', event.target.value)}
            error={error('address.postalCode')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <TextField
            label="Country"
            value={graph.address?.addressCountry ?? 'IN'}
            onChange={(event) => set('address.addressCountry', event.target.value.toUpperCase())}
            error={error('address.addressCountry')}
            hint="Two letters, e.g. IN."
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Map position"
        description="Where the office is, for the map pack. Leave both empty until the address is confirmed."
      >
        <FormColumn half>
          <NumberField
            label="Latitude"
            step={0.000001}
            value={graph.geo?.latitude ?? ''}
            onChange={(event) =>
              set('geo.latitude', event.target.value === '' ? null : Number(event.target.value))
            }
            error={error('geo.latitude')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn half>
          <NumberField
            label="Longitude"
            step={0.000001}
            value={graph.geo?.longitude ?? ''}
            onChange={(event) =>
              set('geo.longitude', event.target.value === '' ? null : Number(event.target.value))
            }
            error={error('geo.longitude')}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="Opening hours and coverage">
        <FormColumn>
          <MultiSelect
            label="Opening hours"
            options={OPENING_HOURS_SUGGESTIONS.map((value) => ({ value, label: value }))}
            value={graph.openingHours ?? []}
            onChange={(next) => set('openingHours', next)}
            creatable
            onCreate={(label) => ({ value: label.trim(), label: label.trim() })}
            hint="Schema.org format: two-letter days, 24-hour times — “Mo-Sa 10:00-19:00”."
            error={error('openingHours')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <MultiSelect
            label="Areas served"
            options={areaOptions}
            value={graph.areaServed ?? []}
            onChange={(next) => set('areaServed', next)}
            creatable
            onCreate={(label) => ({ value: label.trim(), label: label.trim() })}
            hint="The cities and localities the firm transacts in."
            error={error('areaServed')}
            disabled={disabled}
          />
        </FormColumn>
        <FormColumn>
          <MultiSelect
            label="Profiles (sameAs)"
            options={(graph.sameAs ?? []).map((value) => ({ value, label: value }))}
            value={graph.sameAs ?? []}
            onChange={(next) => set('sameAs', next)}
            creatable
            onCreate={(label) => ({ value: label.trim(), label: label.trim() })}
            hint="Full https:// addresses of the firm’s own profiles — they are what corroborate the name."
            error={error('sameAs')}
            disabled={disabled}
          />
        </FormColumn>
      </FormSection>
    </div>
  );
}
