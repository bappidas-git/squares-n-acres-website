/**
 * The accessibility contract of the rich-text editor's toolbar (prompt 42
 * §4.4, §4.5).
 *
 * A toolbar of icon buttons is the control most likely to ship without names:
 * every one of them is a glyph, and a glyph announces nothing.
 */

import { render, screen } from '@testing-library/react';

import RichTextEditor from '../RichTextEditor';
import {
  expectAccessibleName,
  expectLabelledInputs,
  expectNamedControls,
  expectNoDuplicateIds,
} from '../../../test-utils/a11y';

const draw = (props = {}) =>
  render(<RichTextEditor label="Body" value="" onChange={() => {}} {...props} />);

describe('RichTextEditor toolbar', () => {
  it('names the toolbar and every control in it', () => {
    const { container } = draw();

    expectAccessibleName(screen.getByRole('toolbar'), 'Formatting');
    expectNamedControls(container);
    expectLabelledInputs(container);
    expectNoDuplicateIds(container);
  });

  it('says which formatting is on with aria-pressed rather than a class alone', () => {
    draw();

    const toggles = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'));

    expect(toggles.length).toBeGreaterThan(0);
    toggles.forEach((toggle) => {
      expect(['true', 'false']).toContain(toggle.getAttribute('aria-pressed'));
      expectAccessibleName(toggle);
    });
  });

  it('labels the editing surface itself', () => {
    draw();
    expectAccessibleName(screen.getByRole('textbox'), 'Body');
  });
});
