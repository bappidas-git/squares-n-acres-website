/**
 * The phone number every lead form sends (`utils/validators.normalizePhone`).
 *
 * One shape, `+919876543210`, however the visitor typed it — the CRM's
 * duplicate flag compares numbers, and three spellings of one number are three
 * strangers to it. The 91-series is the case that went wrong (QA-53): a
 * ten-digit mobile that happens to start with 91 is a whole number, not a
 * country code with eight digits after it.
 */

import { getMobileErrorMessage, localPhoneDigits, normalizePhone, tidyPhone } from '../validators';

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+91-98765-43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['(0) 98765 43210', '+919876543210'],
  ])('reads %p as %p', (typed, stored) => {
    expect(normalizePhone(typed)).toBe(stored);
  });

  it.each([
    ['9123456780', '+919123456780'],
    ['91234 56780', '+919123456780'],
    ['+91 91234 56780', '+919123456780'],
    ['919123456780', '+919123456780'],
  ])('keeps the 91 of a 91-series mobile: %p', (typed, stored) => {
    expect(normalizePhone(typed)).toBe(stored);
  });

  it.each([['12345'], ['5876543210'], ['+1 415 555 0100'], ['']])(
    'leaves %p for the validator to refuse',
    (typed) => {
      expect(normalizePhone(typed)).toBe(typed);
    }
  );

  it('accepts a 91-series number as a valid mobile', () => {
    expect(getMobileErrorMessage('9123456780')).toBe('');
  });
});

describe('localPhoneDigits', () => {
  it('takes the last ten digits of a stored number', () => {
    expect(localPhoneDigits('+919123456780')).toBe('9123456780');
    expect(localPhoneDigits('9876500100')).toBe('9876500100');
    expect(localPhoneDigits(null)).toBe('');
  });
});

describe('tidyPhone (QA-61)', () => {
  it('writes a mobile number as the ten digits a record stores, however it was typed', () => {
    for (const typed of ['98450 12345', '+91 98450-12345', '919845012345', '098450 12345']) {
      expect(tidyPhone(typed)).toBe('9845012345');
    }
    // A ten-digit mobile of the 91-series keeps its 91 (QA-53).
    expect(tidyPhone('91234 56780')).toBe('9123456780');
  });

  it('hands back what is not a mobile number as it came', () => {
    expect(tidyPhone('98450 1234')).toBe('98450 1234');
    expect(tidyPhone('')).toBe('');
    expect(tidyPhone(null)).toBeNull();
  });
});
