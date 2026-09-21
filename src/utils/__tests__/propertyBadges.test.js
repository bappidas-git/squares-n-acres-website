import { isVerifiedBadge, visibleBadges } from '../propertyBadges';

describe('isVerifiedBadge', () => {
  it('matches the seed badge by slug and by name, whatever its case', () => {
    expect(isVerifiedBadge({ slug: 'verified', name: 'Anything' })).toBe(true);
    expect(isVerifiedBadge({ name: 'Verified' })).toBe(true);
    expect(isVerifiedBadge({ name: ' verified ' })).toBe(true);
    expect(isVerifiedBadge({ name: 'RERA Approved' })).toBe(false);
    expect(isVerifiedBadge(undefined)).toBe(false);
  });
});

describe('visibleBadges', () => {
  const badges = [
    { id: 1, name: 'Ready to Move' },
    { id: 2, name: 'Verified', slug: 'verified' },
    { id: 3, name: 'RERA Approved' },
  ];

  it('drops the badge that repeats the built-in chip', () => {
    expect(visibleBadges({ isVerified: true, badges }).map((b) => b.name)).toEqual([
      'Ready to Move',
      'RERA Approved',
    ]);
  });

  it('keeps it when the record is not verified, because then nothing repeats it', () => {
    expect(visibleBadges({ isVerified: false, badges })).toHaveLength(3);
  });

  it('drops before it limits, so the card still fills both of its slots', () => {
    expect(visibleBadges({ isVerified: true, badges }, { limit: 2 }).map((b) => b.name)).toEqual([
      'Ready to Move',
      'RERA Approved',
    ]);
  });

  it('answers an empty list for a record with no badges', () => {
    expect(visibleBadges({})).toEqual([]);
    expect(visibleBadges(null)).toEqual([]);
  });
});
