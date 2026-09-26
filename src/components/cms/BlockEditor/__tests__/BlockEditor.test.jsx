/**
 * The block editor's answers to two dead ends (prompt 51): a save refused over
 * a problem inside a collapsed block now opens that block, and a page that can
 * only show some block types — the home page — offers only those.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import BlockEditor from '../BlockEditor';
import renderWith from '../../../../test-utils';
import { homeBlockTypes } from '../../../../pages/admin/pages/PageFormPage';

const BLOCKS = [
  { id: 1, type: 'richText', order: 1, data: { html: '<p>Hello.</p>' } },
  { id: 2, type: 'features', order: 2, data: { title: 'Why us', items: [] } },
];

function Host({ errors = {}, reveal = 0, ...rest }) {
  const [blocks, setBlocks] = useState(rest.blocks ?? BLOCKS);
  return (
    <BlockEditor
      blocks={blocks}
      onChange={setBlocks}
      errors={errors}
      revealErrors={reveal}
      {...rest}
    />
  );
}

const cardToggle = (name) => screen.getByRole('button', { name: new RegExp(name) });

describe('BlockEditor — a refused save', () => {
  it('opens the blocks that hold a message when asked to reveal them', () => {
    const errors = { 2: { title: 'Title is required.' } };
    const { rerender } = renderWith(<Host errors={errors} reveal={0} />);
    expect(cardToggle('2. Features')).toHaveAttribute('aria-expanded', 'false');

    rerender(<Host errors={errors} reveal={1} />);

    expect(cardToggle('2. Features')).toHaveAttribute('aria-expanded', 'true');
    expect(cardToggle('1. Rich text')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a refusal of the block itself on its card', () => {
    const props = {
      blocks: [{ id: 7, type: 'retired', order: 1, data: {} }],
      errors: { 7: { type: 'The selected blocks.0.type is invalid.' } },
    };
    const { rerender } = renderWith(<Host {...props} reveal={0} />);
    rerender(<Host {...props} reveal={1} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The selected blocks.0.type is invalid.');
    expect(screen.getByText(/cannot be saved/)).toBeInTheDocument();
  });
});

describe('BlockEditor — the home page', () => {
  it('offers only the types the page shows, and says why', async () => {
    renderWith(
      <Host
        blocks={[BLOCKS[1]]}
        allowedTypes={homeBlockTypes([BLOCKS[1]])}
        addNote="Only Features and Steps."
      />
    );

    expect(screen.getByText('Only Features and Steps.')).toBeInTheDocument();
    // A second Features block would never be drawn, so it cannot be duplicated.
    expect(screen.queryByRole('button', { name: /Duplicate/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add block' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /Steps/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Rich text/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^Features/ })).not.toBeInTheDocument();
  });

  it('turns Add block off once both are there', () => {
    const both = [BLOCKS[1], { id: 3, type: 'steps', order: 2, data: { title: 'How', items: [] } }];
    renderWith(<Host blocks={both} allowedTypes={homeBlockTypes(both)} addNote="Both are here." />);
    expect(screen.getByRole('button', { name: 'Add block' })).toBeDisabled();
  });
});

describe('homeBlockTypes', () => {
  it('is the home page’s two blocks, less the ones it has', () => {
    expect(homeBlockTypes([])).toEqual(['features', 'steps']);
    expect(homeBlockTypes([{ type: 'steps' }])).toEqual(['features']);
    expect(homeBlockTypes([{ type: 'features' }, { type: 'steps' }])).toEqual([]);
  });
});
