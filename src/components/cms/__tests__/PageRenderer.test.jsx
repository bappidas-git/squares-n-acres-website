/**
 * The public page renderer (prompt 30).
 *
 * Three promises are worth a test without a server: the blocks come out in
 * `order` whatever order the array holds them in, a type this build does not
 * know renders nothing at all rather than throwing, and a block that has said
 * it is empty neither renders nor costs the next one its background band.
 *
 * The block components are stubbed: this is a test of the renderer, and the
 * real ones each want an API, a settings context and a lead-capture provider.
 */

import { screen } from '@testing-library/react';

import renderWith from '../../../test-utils';

jest.mock('../blocks', () => {
  const stub = (name) =>
    function Stub({ data, background, page }) {
      return (
        <div data-testid={name} data-background={background ?? 'none'} data-page={page?.slug}>
          {name}: {data?.title ?? ''}
        </div>
      );
    };

  const Stats = stub('stats');
  Stats.isEmpty = (data) => !(data?.items ?? []).length;

  return {
    __esModule: true,
    BLOCK_COMPONENTS: {
      hero: stub('hero'),
      richText: stub('richText'),
      features: stub('features'),
      steps: stub('steps'),
      stats: Stats,
      cta: stub('cta'),
    },
    default: {
      hero: stub('hero'),
      richText: stub('richText'),
      features: stub('features'),
      steps: stub('steps'),
      stats: Stats,
      cta: stub('cta'),
    },
  };
});

// eslint-disable-next-line import/first
import PageRenderer, { layoutBlocks } from '../PageRenderer';

const block = (id, type, order, data = {}) => ({ id, type, order, data });

const page = (blocks) => ({ id: 1, slug: 'about', title: 'About Us', blocks });

describe('PageRenderer', () => {
  it('renders a component per known block, in `order`', () => {
    renderWith(
      <PageRenderer
        page={page([block(3, 'steps', 3), block(1, 'hero', 1), block(2, 'richText', 2)])}
      />
    );

    const rendered = screen.getAllByTestId(/hero|richText|steps/);
    expect(rendered.map((node) => node.dataset.testid)).toEqual(['hero', 'richText', 'steps']);
  });

  it('skips a block type it has no component for, and keeps the rest', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderWith(
      <PageRenderer
        page={page([block(1, 'hero', 1), block(2, 'timeMachine', 2), block(3, 'steps', 3)])}
      />
    );

    expect(screen.getByTestId('hero')).toBeInTheDocument();
    expect(screen.getByTestId('steps')).toBeInTheDocument();
    expect(screen.queryByTestId('timeMachine')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('timeMachine'));

    warn.mockRestore();
  });

  it('hands every block the page it belongs to', () => {
    renderWith(<PageRenderer page={page([block(1, 'features', 1, { title: 'Why us' })])} />);

    const node = screen.getByTestId('features');
    expect(node).toHaveAttribute('data-page', 'about');
    expect(node).toHaveTextContent('Why us');
  });

  it('renders nothing at all without a page', () => {
    const { container } = renderWith(<PageRenderer page={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('layoutBlocks', () => {
    it('alternates the background bands', () => {
      const layout = layoutBlocks([
        block(1, 'richText', 1),
        block(2, 'features', 2),
        block(3, 'steps', 3),
      ]);

      expect(layout.map((entry) => entry.background)).toEqual(['bg', 'surface', 'bg']);
    });

    it('lets the hero and the call to action keep their own band', () => {
      const layout = layoutBlocks([
        block(1, 'hero', 1),
        block(2, 'richText', 2),
        block(3, 'cta', 3),
        block(4, 'features', 4),
      ]);

      expect(layout.map((entry) => [entry.block.type, entry.background])).toEqual([
        ['hero', null],
        ['richText', 'bg'],
        ['cta', null],
        ['features', 'surface'],
      ]);
    });

    it('drops an empty block without costing the next one its band', () => {
      const layout = layoutBlocks([
        block(1, 'richText', 1),
        block(2, 'stats', 2, { items: [] }),
        block(3, 'features', 3),
      ]);

      expect(layout.map((entry) => [entry.block.type, entry.background])).toEqual([
        ['richText', 'bg'],
        ['features', 'surface'],
      ]);
    });

    it('keeps a stats block that has figures', () => {
      const layout = layoutBlocks([block(1, 'stats', 1, { items: [{ value: '20', label: 'x' }] })]);
      expect(layout).toHaveLength(1);
    });

    it('survives a page with no blocks, or nonsense in place of them', () => {
      expect(layoutBlocks([])).toEqual([]);
      expect(layoutBlocks(undefined)).toEqual([]);
      expect(layoutBlocks([null, { id: 1 }, 'nope'])).toEqual([]);
    });

    it('keeps the array order when two blocks claim the same `order`', () => {
      const layout = layoutBlocks([
        block(1, 'features', 2),
        block(2, 'steps', 2),
        block(3, 'richText', 1),
      ]);

      expect(layout.map((entry) => entry.block.type)).toEqual(['richText', 'features', 'steps']);
    });
  });
});
