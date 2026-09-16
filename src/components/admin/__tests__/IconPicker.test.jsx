import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import IconPicker, { ALL_ICONS, ICON_CATEGORIES, ICON_ID_PATTERN } from '../IconPicker';
import renderWith from '../../../test-utils';

describe('the icon library', () => {
  it('holds nothing but well-formed Iconify MDI ids', () => {
    const malformed = ALL_ICONS.filter((icon) => !ICON_ID_PATTERN.test(icon));
    expect(malformed).toEqual([]);
  });

  it('retires the ids that no longer exist in the MDI set (ADD-23)', () => {
    // Verified against the live Iconify collection: three were removed and
    // three were only aliases of another icon.
    const retired = [
      'mdi:apartment',
      'mdi:intercom',
      'mdi:car-parking',
      'mdi:mountain',
      'mdi:restaurant',
      'mdi:bricks',
    ];
    expect(retired.filter((icon) => ALL_ICONS.includes(icon))).toEqual([]);
  });

  it('lists every icon once', () => {
    expect(new Set(ALL_ICONS).size).toBe(ALL_ICONS.length);
  });

  it('gives every category at least one icon', () => {
    const empty = Object.entries(ICON_CATEGORIES)
      .filter(([, icons]) => icons.length === 0)
      .map(([name]) => name);
    expect(empty).toEqual([]);
  });

  it('offers the amenity and nearby categories straight from the enums', () => {
    expect(ICON_CATEGORIES['Amenity categories']).toContain('mdi:shield-check-outline');
    expect(ICON_CATEGORIES['Nearby places']).toContain('mdi:school-outline');
  });
});

describe('IconPicker', () => {
  const open = (props = {}) =>
    renderWith(<IconPicker open onClose={jest.fn()} onSelect={jest.fn()} {...props} />);

  it('renders every tile as a named, pressable button', () => {
    open({ currentIcon: 'mdi:home' });

    const tile = screen.getByRole('button', { name: 'mdi:home' });
    expect(tile).toHaveAttribute('type', 'button');
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'mdi:door' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('reports the chosen icon and closes', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    open({ onSelect, onClose });

    await userEvent.click(screen.getByRole('button', { name: 'mdi:home' }));

    expect(onSelect).toHaveBeenCalledWith('mdi:home');
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps one tile in the tab order and moves it with the arrow keys', async () => {
    open();

    const first = screen.getAllByRole('button', { name: /^mdi:/ })[0];
    expect(first).toHaveAttribute('tabindex', '0');

    first.focus();
    await userEvent.keyboard('{ArrowRight}');

    const second = screen.getAllByRole('button', { name: /^mdi:/ })[1];
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
  });

  describe('search', () => {
    it('narrows within the active category rather than escaping it', async () => {
      open();

      await userEvent.click(screen.getByRole('button', { name: 'Finance' }));
      expect(screen.getByRole('button', { name: 'mdi:bank' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'mdi:home' })).not.toBeInTheDocument();

      await userEvent.type(screen.getByLabelText('Search icons'), 'home');

      expect(screen.queryByRole('button', { name: 'mdi:home' })).not.toBeInTheDocument();
      expect(screen.getByText(/No icon in Finance matches/)).toBeInTheDocument();
    });

    it('searches the whole library from the All category', async () => {
      open();
      await userEvent.type(screen.getByLabelText('Search icons'), 'bank');
      expect(screen.getByRole('button', { name: 'mdi:bank' })).toBeInTheDocument();
    });
  });

  describe('the custom id field', () => {
    it('refuses an id that is not an MDI id', async () => {
      open();

      const input = screen.getByLabelText('Custom Iconify id');
      await userEvent.type(input, 'Not An Icon');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('button', { name: 'Use' })).toBeDisabled();
      expect(screen.getByText(/An id looks like mdi:home-city-outline/)).toBeInTheDocument();
    });

    it('accepts one that is', async () => {
      const onSelect = jest.fn();
      open({ onSelect });

      await userEvent.type(screen.getByLabelText('Custom Iconify id'), 'mdi:tractor-variant');
      await userEvent.click(screen.getByRole('button', { name: 'Use' }));

      expect(onSelect).toHaveBeenCalledWith('mdi:tractor-variant');
    });
  });

  it('shows the icon the record currently carries', () => {
    open({ currentIcon: 'mdi:home-city-outline' });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('mdi:home-city-outline')).toBeInTheDocument();
  });
});
