/**
 * `Avatar` (QA-65): the header's avatar stays mounted from one screen to the
 * next, so a picture that failed must not keep the next address from being
 * tried; and initials are characters as a reader sees them, not UTF-16 units.
 */

import { fireEvent, render, screen } from '@testing-library/react';

import Avatar, { initialsOf } from '../Avatar';

describe('Avatar', () => {
  it('tries a new address after the last one failed', () => {
    const onImageError = jest.fn();
    const { rerender } = render(
      <Avatar
        src="https://cdn.example.com/broken.png"
        name="Asha Rao"
        onImageError={onImageError}
      />
    );

    fireEvent.error(screen.getByAltText('Asha Rao'));
    expect(screen.queryByAltText('Asha Rao')).not.toBeInTheDocument();
    expect(screen.getByText('AR')).toBeInTheDocument();
    expect(onImageError).toHaveBeenCalledWith('https://cdn.example.com/broken.png');

    // The address corrected on "My profile" reaches the header's avatar.
    rerender(<Avatar src="https://cdn.example.com/asha.png" name="Asha Rao" />);
    expect(screen.getByAltText('Asha Rao')).toHaveAttribute(
      'src',
      'https://cdn.example.com/asha.png'
    );
  });

  it('shows the initials when there is no picture at all', () => {
    render(<Avatar name="Asha Rao" />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('never cuts an emoji or an astral letter in half', () => {
    expect(initialsOf('Asha 🙂')).toBe('A🙂');
    expect(initialsOf('🙂 Rao')).toBe('🙂R');
    expect(initialsOf('𝒜sha')).toBe('𝒜s');
    expect(initialsOf('Priya Sharma')).toBe('PS');
    expect(initialsOf('  admin  ')).toBe('ad');
    expect(initialsOf('')).toBe('');
    // In Unicode mode a pair is one character, so this finds only a lone half.
    expect(initialsOf('<b> O’Brien 🙂')).not.toMatch(/[\uD800-\uDFFF]/u);
  });
});
