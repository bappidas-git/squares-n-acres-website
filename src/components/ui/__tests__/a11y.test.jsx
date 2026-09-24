/**
 * The accessibility contract of the UI kit.
 *
 * `npm run a11y:audit` checks the rendered site, but a crawl only sees the
 * states it can reach: an open sheet, an autoplaying carousel, a tab strip
 * after an arrow key. These are those states, asserted directly, so the rules
 * hold at `npm run test:ci` rather than at the next crawl (prompt 42 §4.5).
 */

import { fireEvent, screen, within } from '@testing-library/react';

import Accordion from '../Accordion';
import BottomSheet from '../BottomSheet';
import Carousel from '../Carousel';
import Drawer from '../Drawer';
import Tabs from '../Tabs';
import renderWith from '../../../test-utils';
import {
  expectAccessibleName,
  expectDialogSemantics,
  expectNamedControls,
  expectNoDuplicateIds,
  expectRoleGroup,
  expectRovingTabIndex,
} from '../../../test-utils/a11y';

describe('Tabs', () => {
  const ITEMS = [
    { value: 'general', label: 'General', content: <p>General</p> },
    { value: 'social', label: 'Social', content: <p>Social</p> },
    { value: 'advanced', label: 'Advanced', content: <p>Advanced</p> },
  ];

  it('is one tab stop with a named list and three tabs', () => {
    const { container } = renderWith(<Tabs items={ITEMS} label="SEO sections" />);

    expectRoleGroup(container, 'tablist', { items: 3 });
    expectRovingTabIndex(container, '[role="tab"]');
    expectNoDuplicateIds(container);
  });

  it('labels each panel by the tab that opens it', () => {
    renderWith(<Tabs items={ITEMS} label="SEO sections" />);

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAccessibleName('General');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'General' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Social');
  });
});

describe('Accordion', () => {
  const ITEMS = [
    { id: 'a', title: 'What is khata?', content: <p>The municipal record.</p> },
    { id: 'b', title: 'What is carpet area?', content: <p>The usable floor.</p> },
  ];

  it('links every trigger to the region it opens', () => {
    const { container } = renderWith(<Accordion items={ITEMS} />);

    const triggers = screen.getAllByRole('button');
    triggers.forEach((trigger) => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expectNamedControls(container);
    expectNoDuplicateIds(container);

    fireEvent.click(triggers[0]);
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region')).toHaveAccessibleName('What is khata?');
  });
});

describe('Carousel', () => {
  const slides = [1, 2, 3, 4].map((n) => <p key={n}>Slide {n}</p>);

  it('announces itself as a carousel and numbers its slides', () => {
    const { container } = renderWith(<Carousel label="Featured properties">{slides}</Carousel>);

    const region = screen.getByRole('region', { name: 'Featured properties' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');

    const groups = within(region).getAllByRole('group');
    expect(groups).toHaveLength(4);
    groups.forEach((group, index) => {
      expect(group).toHaveAttribute('aria-roledescription', 'slide');
      expect(group).toHaveAccessibleName(`${index + 1} of 4`);
    });

    expectNamedControls(container);
  });
});

describe('BottomSheet', () => {
  it('is a modal dialog named by its title', () => {
    renderWith(
      <BottomSheet open onClose={jest.fn()} title="Filters">
        <p>Body</p>
      </BottomSheet>
    );

    expectDialogSemantics(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Filters');
    expectAccessibleName(screen.getByRole('button', { name: 'Close' }), 'Close');
  });

  it('falls back to the label when it has no title bar', () => {
    renderWith(
      <BottomSheet open onClose={jest.fn()} label="Photo actions">
        <p>Body</p>
      </BottomSheet>
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo actions');
  });
});

describe('Drawer', () => {
  it('keeps its name and role when the caller brings paper props of its own (QA-61)', () => {
    renderWith(
      <Drawer
        open
        onClose={jest.fn()}
        title="Vivek Nair"
        PaperProps={{ className: 'caller-paper' }}
      >
        <p>The application</p>
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    expectDialogSemantics(dialog);
    // A caller's class replaced the kit's props wholesale: the panel was a
    // dialog called nothing.
    expect(dialog).toHaveAccessibleName('Vivek Nair');
    expect(dialog).toHaveClass('caller-paper');
  });

  it('is a modal dialog with a name even when it has no title', () => {
    renderWith(
      <Drawer open onClose={jest.fn()} label="Menu" padded={false}>
        <p>Links</p>
      </Drawer>
    );

    expectDialogSemantics(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Menu');
  });
});
