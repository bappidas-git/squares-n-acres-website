/**
 * Every CMS block type renders (prompt 45).
 *
 * `PageRenderer.test.jsx` proves the *renderer* with the block components
 * stubbed out. This suite is the other half: each of the twenty-five real
 * components, rendered twice —
 *
 *   - with the `defaultData()` that `BLOCK_TYPES` hands a block the moment an
 *     editor inserts it, which is the state a page is in between "add block"
 *     and "fill it in", and the state a saved-but-empty block is in forever;
 *   - with every field of its own schema filled, so "renders nothing when
 *     empty" is not the only thing a component is ever asked to do.
 *
 * Both renders must be quiet: a `console.error` or `console.warn` — React's key
 * and prop warnings included — fails the test, which is §12.1 applied where it
 * can be automated.
 *
 * The filled data is derived from `blockSchemas.js` rather than written out by
 * hand. Twenty-five hand-made shapes would be twenty-five chances to describe a
 * block the editor does not actually produce, and they would keep passing after
 * the schema moved on.
 *
 * The blocks that fetch their own rows are given the **seed's** records
 * (`blockFixtures.js`), so what they draw is what the site draws, and the ones
 * that read Site settings are given the seed's settings through the real
 * context. `contactInfo` is asked both questions, because it has no data of its
 * own: with the settings it draws the office, and without them — the state
 * every block is in while they are still loading — it must draw nothing rather
 * than an empty band.
 *
 * The mock factories answer with **plain functions rather than `jest.fn`**:
 * `create-react-app` sets `resetMocks: true`, which strips the implementation
 * off every `jest.fn` before each test — and a module mocked at import time
 * would then answer `undefined` to every call, which is a very quiet way for a
 * suite like this one to stop testing anything.
 */

import { act, screen } from '@testing-library/react';

import { SiteSettingsContext } from '../../../contexts/SiteSettingsContext';
import { BLOCK_COMPONENTS } from '../blocks';
import { BLOCK_TYPES } from '../../../config/enums';
import { blockSchema } from '../BlockEditor/blockSchemas';
import renderWith from '../../../test-utils';

jest.mock('../../../services/articleService', () => {
  const fixtures = require('../__fixtures__/blocks');
  return { __esModule: true, default: { list: () => fixtures.ok(fixtures.articles) } };
});

jest.mock('../../../services/careerService', () => {
  const fixtures = require('../__fixtures__/blocks');
  return { __esModule: true, default: { jobs: () => fixtures.ok(fixtures.jobs) } };
});

jest.mock('../../../services/masterDataService', () => {
  const fixtures = require('../__fixtures__/blocks');
  const from = (rows) => ({ list: () => fixtures.ok(rows) });
  return {
    __esModule: true,
    default: {
      faqs: from(fixtures.faqs),
      team: from(fixtures.team),
      testimonials: from(fixtures.testimonials),
      partners: from(fixtures.partners),
      banks: from(fixtures.banks),
    },
  };
});

jest.mock('../../../services/propertyService', () => {
  const fixtures = require('../__fixtures__/blocks');
  return {
    __esModule: true,
    default: {
      list: () => fixtures.ok(fixtures.properties),
      featured: () => fixtures.ok(fixtures.properties),
    },
  };
});

jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => require('../__fixtures__/blocks').masterData,
  MasterDataProvider: ({ children }) => children,
}));

jest.mock('../../../contexts/LeadCaptureContext', () => ({
  __esModule: true,
  useLeadCapture: () => ({ openLeadModal: () => {}, closeLeadModal: () => {} }),
  LeadCaptureProvider: ({ children }) => children,
}));

const fixtures = require('../__fixtures__/blocks');

const PAGE = { id: 1, slug: 'qa-page', title: 'QA page', leadSource: null };

const SENTENCE = 'A sentence an editor typed into the block.';

/** A plausible value for one schema field, by the field's own type. */
function fillField(field, depth = 0) {
  switch (field.type) {
    case 'richtext':
      return `<p>${SENTENCE}</p>`;
    case 'image':
      return 'https://example.com/block-image.jpg';
    case 'icon':
      return 'mdi:home-city-outline';
    case 'number':
      return 1;
    case 'bool':
      return true;
    case 'leadSource':
      return 'contact-page';
    case 'stringList':
      return [`${SENTENCE} One.`, `${SENTENCE} Two.`];
    case 'items':
      // Two rows, so a list that keys its children is exercised rather than
      // being a one-element array whose keys cannot collide.
      return depth > 1
        ? []
        : [1, 2].map((n) => ({
            ...(field.newItem?.() ?? {}),
            ...Object.fromEntries(
              (field.itemFields ?? []).map((sub) => [sub.name, fillField(sub, depth + 1)])
            ),
            id: n,
          }));
    case 'select':
      return field.options?.[0]?.value ?? '';
    case 'entities':
    case 'ids':
      return [];
    default:
      return field.maxLength && field.maxLength < SENTENCE.length
        ? SENTENCE.slice(0, field.maxLength)
        : SENTENCE;
  }
}

/** Every block type's `defaultData()`, with each of its own fields filled in. */
const FILLED = Object.fromEntries(
  BLOCK_TYPES.values.map((type) => {
    const schema = blockSchema(type);
    const data = { ...BLOCK_TYPES.defaultDataOf(type) };
    for (const field of schema?.fields ?? []) {
      if (field.name in data || field.type === 'items') data[field.name] = fillField(field);
    }
    return [type, data];
  })
);

/** Console noise is a failure here, exactly as §12.1 says it is in a browser. */
let consoleError;
let consoleWarn;
const noise = [];

beforeEach(() => {
  noise.length = 0;
  consoleError = jest.spyOn(console, 'error').mockImplementation((...args) => {
    noise.push(`error: ${args.join(' ')}`);
  });
  consoleWarn = jest.spyOn(console, 'warn').mockImplementation((...args) => {
    noise.push(`warn: ${args.join(' ')}`);
  });
});

afterEach(() => {
  consoleError.mockRestore();
  consoleWarn.mockRestore();
});

/** What `useSiteSettings()` answers, built from the seed (§6.13). */
const general = fixtures.seed.siteSettings.general;
const SETTINGS = {
  settings: fixtures.seed.siteSettings,
  seoSettings: fixtures.seed.seoSettings,
  loading: false,
  error: null,
  refresh: () => Promise.resolve(null),
  updateLocal: () => {},
  siteName: general.siteName,
  tagline: general.tagline,
  getContact: () => ({
    email: general.contactEmail ?? '',
    phone: general.contactPhone ?? '',
    phoneHref: `tel:${String(general.contactPhone ?? '').replace(/[^+\d]/g, '')}`,
    alternatePhone: general.alternatePhone ?? '',
    whatsappNumber: general.whatsappNumber ?? '',
    address: general.address ?? null,
    workingHours: general.workingHours ?? [],
  }),
  getLogoUrl: () => general.logoUrl,
  getWhatsappLink: () => `https://wa.me/${general.whatsappNumber ?? ''}`,
};

/** Renders one block and lets every effect and fetch settle. */
async function renderBlock(type, data, { settings = SETTINGS } = {}) {
  const Block = BLOCK_COMPONENTS[type];
  const tree = settings ? (
    <SiteSettingsContext.Provider value={settings}>
      <Block data={data} page={PAGE} background="bg" index={0} />
    </SiteSettingsContext.Provider>
  ) : (
    <Block data={data} page={PAGE} background="bg" index={0} />
  );
  const view = renderWith(tree);
  // `render` is wrapped in `act` by Testing Library; what still has to settle
  // is the fetch each data-driven block starts in its first effect.
  await act(async () => {
    await new Promise((settle) => setTimeout(settle, 0));
  });
  return view;
}

describe('the block table', () => {
  it('has a component for every `BLOCK_TYPES` value (§6.10)', () => {
    expect(Object.keys(BLOCK_COMPONENTS).sort()).toEqual([...BLOCK_TYPES.values].sort());
  });

  it('has an editing schema and filled data for every type', () => {
    expect(Object.keys(FILLED).sort()).toEqual([...BLOCK_TYPES.values].sort());
    for (const type of BLOCK_TYPES.values) expect(blockSchema(type)).not.toBeNull();
  });

  it('gives every type a `defaultData()`', () => {
    for (const type of BLOCK_TYPES.values) {
      expect(BLOCK_TYPES.defaultDataOf(type)).toEqual(expect.any(Object));
    }
  });

  it('reads real listings out of the seed for the blocks that need them', () => {
    expect(fixtures.properties).toHaveLength(3);
    for (const property of fixtures.properties) {
      expect(property.slug).toEqual(expect.any(String));
    }
  });
});

describe.each(BLOCK_TYPES.values)('%s', (type) => {
  it('renders its default data quietly', async () => {
    const data = BLOCK_TYPES.defaultDataOf(type);
    const { container } = await renderBlock(type, data);

    expect(noise).toEqual([]);

    // A component that says it is empty for this data must render nothing, so
    // `PageRenderer` neither draws a band nor costs the next block its
    // background (§7 of prompt 30). The implication is asserted as one value
    // rather than as a branch, so the expectation runs for every type.
    const Block = BLOCK_COMPONENTS[type];
    const declaresEmpty = typeof Block.isEmpty === 'function' && Block.isEmpty(data);
    const rendered = container.innerHTML !== '';
    expect(declaresEmpty && rendered).toBe(false);
  });

  it('renders data an editor filled in quietly', async () => {
    const { container } = await renderBlock(type, FILLED[type]);
    expect(noise).toEqual([]);
    expect(container).not.toBeEmptyDOMElement();
  });
});

describe.each(BLOCK_TYPES.values)('%s, with the settings unreachable', (type) => {
  it('still renders quietly', async () => {
    await renderBlock(type, FILLED[type], { settings: null });
    expect(noise).toEqual([]);
  });
});

describe('contactInfo, which has no data of its own', () => {
  it('draws the office when the settings are there', async () => {
    const { container } = await renderBlock('contactInfo', FILLED.contactInfo);
    expect(noise).toEqual([]);
    expect(container).not.toBeEmptyDOMElement();
    expect(container.textContent).toContain(fixtures.seed.siteSettings.general.contactEmail);
  });

  it('draws nothing at all while they are unreachable', async () => {
    const { container } = await renderBlock('contactInfo', FILLED.contactInfo, { settings: null });
    expect(noise).toEqual([]);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('a page of every block at once', () => {
  it('renders all twenty-five in one tree without a console message', async () => {
    const blocks = BLOCK_TYPES.values.map((type, index) => ({
      id: index + 1,
      type,
      order: index + 1,
      data: FILLED[type],
    }));

    const PageRenderer = require('../PageRenderer').default;
    renderWith(
      <SiteSettingsContext.Provider value={SETTINGS}>
        <PageRenderer page={{ ...PAGE, blocks }} />
      </SiteSettingsContext.Provider>
    );
    await act(async () => {
      await new Promise((settle) => setTimeout(settle, 0));
    });

    expect(noise).toEqual([]);
    // The blocks that draw prose drew it: the page is not an empty shell.
    expect(screen.getAllByText(SENTENCE).length).toBeGreaterThan(0);
  });
});
