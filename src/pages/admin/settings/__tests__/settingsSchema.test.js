/**
 * The client half of the settings contract (QA-64): what a save sends, how a
 * phone number is read, what a message calls a field, and the rules the
 * descriptor cannot state.
 */

import {
  changedSettings,
  displayedAt,
  formatIndianPhone,
  isIndianMobile,
  isUsableHref,
  listError,
  normalizeSettings,
  prepareSettings,
  settingsLabel,
  validateSettings,
} from '../settingsSchema';

describe('changedSettings', () => {
  const base = {
    general: { siteName: 'Squares N Acres', tagline: 'Old', address: { city: 'Bengaluru' } },
    hero: { title: 'Find your next home', stats: [], searchTabs: ['sale', 'rent'] },
    leads: { notificationEmails: ['info@squaresnacres.com'] },
  };

  it('keeps only the keys whose value changed, however deep', () => {
    const next = {
      ...base,
      general: { ...base.general, tagline: 'New', address: { city: 'Mysuru' } },
    };

    expect(changedSettings(next, base)).toEqual({
      general: { tagline: 'New', address: { city: 'Mysuru' } },
    });
  });

  it('sends a changed list whole, because the API replaces lists', () => {
    const next = { ...base, hero: { ...base.hero, searchTabs: ['rent', 'sale'] } };

    expect(changedSettings(next, base)).toEqual({ hero: { searchTabs: ['rent', 'sale'] } });
  });

  it('sends a value that was emptied as null', () => {
    const next = { ...base, general: { ...base.general, tagline: null } };

    expect(changedSettings(next, base)).toEqual({ general: { tagline: null } });
  });

  it('is empty when nothing changed', () => {
    expect(changedSettings(JSON.parse(JSON.stringify(base)), base)).toEqual({});
  });
});

describe('Indian mobile numbers', () => {
  it.each([
    ['9876543210'],
    ['98765 43210'],
    ['+91 98765 43210'],
    ['+91-98765-43210'],
    ['919876543210'],
    ['09876543210'],
  ])('reads %s as +91 98765 43210', (typed) => {
    expect(isIndianMobile(typed)).toBe(true);
    expect(formatIndianPhone(typed)).toBe('+91 98765 43210');
  });

  it.each([['12345'], ['5876543210'], ['+44 7911 123456'], ['9198765432100'], ['abc']])(
    'leaves %s as typed, for the message to say what is wrong',
    (typed) => {
      expect(isIndianMobile(typed)).toBe(false);
      expect(formatIndianPhone(typed)).toBe(typed);
    }
  );

  it('loads the stored numbers in the form the boxes write them', () => {
    const prepared = prepareSettings({
      general: { contactPhone: '+919800000001', whatsappNumber: null, alternatePhone: '12345' },
      hero: { title: 'x' },
    });

    expect(prepared.general).toEqual({
      contactPhone: '+91 98000 00001',
      whatsappNumber: null,
      alternatePhone: '12345',
    });
    expect(prepared.hero).toEqual({ title: 'x' });
  });

  it('sends a number typed with 91 in front readable, so the API takes it', () => {
    const body = normalizeSettings({ general: { whatsappNumber: '919876543210' } });

    expect(body.general.whatsappNumber).toBe('+91 98765 43210');
  });
});

describe('isUsableHref', () => {
  it.each([['/contact'], ['#post-requirement'], ['https://x.com'], ['mailto:a@b.co'], ['tel:+91']])(
    'takes %s',
    (href) => expect(isUsableHref(href)).toBe(true)
  );

  // eslint-disable-next-line no-script-url -- refusing one is the point
  it.each([['contact'], ['//evil.example'], ['javascript:alert(1)'], ['#two words']])(
    'refuses %s',
    (href) => expect(isUsableHref(href)).toBe(false)
  );
});

describe('settingsLabel', () => {
  it.each([
    ['general.siteName', 'site name'],
    ['general.address.pincode', 'PIN code'],
    ['integrations.googleAnalyticsId', 'GA4 measurement ID'],
    ['social.x', 'X address'],
    ['general.workingHours.2.days', 'days of opening-hours row 3'],
    ['hero.stats.0.label', 'label of counter 1'],
    ['footer.columns.1.links.0.href', 'target of link 1 in footer column 2'],
    ['footer.galleryImageUrls.4', 'gallery picture 5'],
    ['leads.notificationEmails.1', 'notification e-mail 2'],
  ])('calls %s "%s"', (key, label) => {
    expect(settingsLabel(key)).toBe(label);
  });

  it('knows nothing of a key the record does not have', () => {
    expect(settingsLabel('general.nothing')).toBeUndefined();
  });
});

describe('the list fields', () => {
  it('shows a message about one entry on the list', () => {
    expect(displayedAt('hero.badges.2')).toBe('hero.badges');
    expect(displayedAt('leads.notificationEmails.0')).toBe('leads.notificationEmails');
    expect(displayedAt('hero.stats.0.label')).toBe('hero.stats.0.label');

    expect(listError({ 'hero.badges.1': 'Too long.' }, 'hero.badges')).toBe('Too long.');
    expect(listError({ 'hero.badges': 'Own.', 'hero.badges.1': 'Entry.' }, 'hero.badges')).toBe(
      'Own.'
    );
    expect(listError({ 'hero.badgesX': 'No.' }, 'hero.badges')).toBeUndefined();
  });
});

describe('validateSettings — QA-64', () => {
  const valid = {
    general: {
      siteName: 'Squares N Acres',
      siteUrl: 'https://www.squaresnacres.com',
      contactEmail: 'info@squaresnacres.com',
      contactPhone: '+91 98000 00001',
      latitude: 12.9716,
      longitude: 77.5946,
      workingHours: [{ days: 'Monday', hours: '9 to 6' }],
    },
    navigation: { headerCtaLabel: 'Post', headerCtaHref: '#post-requirement' },
    footer: { columns: [], galleryImageUrls: ['https://images.test/a.jpg'] },
    hero: { stats: [{ label: 'Listings', value: '500' }], badges: [] },
    integrations: {},
    leads: { notificationEmails: [] },
  };

  it('finds nothing wrong with a valid record', () => {
    expect(validateSettings(valid)).toEqual({});
  });

  it('asks for both coordinates or neither', () => {
    expect(validateSettings({ ...valid, general: { ...valid.general, longitude: null } })).toEqual({
      'general.longitude': 'Add the longitude too — the map needs both, or neither.',
    });
    expect(validateSettings({ ...valid, general: { ...valid.general, latitude: '' } })).toEqual({
      'general.latitude': 'Add the latitude too — the map needs both, or neither.',
    });
    expect(
      validateSettings({ ...valid, general: { ...valid.general, latitude: null, longitude: null } })
    ).toEqual({});
  });

  it('says what an empty row of the repeaters is missing', () => {
    const errors = validateSettings({
      ...valid,
      general: { ...valid.general, workingHours: [{ days: '', hours: ' ' }] },
      hero: { ...valid.hero, stats: [{ label: '', value: '' }] },
      footer: { ...valid.footer, galleryImageUrls: [''] },
    });

    expect(errors).toEqual({
      'general.workingHours.0.days': 'Say which days this row is for.',
      'general.workingHours.0.hours': 'Say the hours for these days.',
      'hero.stats.0.label': 'Name what this counter counts.',
      'hero.stats.0.value': 'Give the counter its number.',
      'footer.galleryImageUrls.0': 'Choose a picture for this slot, or remove the slot.',
    });
  });

  it('takes the WhatsApp numbers its hint describes, and refuses the rest', () => {
    const withWhatsapp = (whatsappNumber) =>
      validateSettings({ ...valid, general: { ...valid.general, whatsappNumber } });

    expect(withWhatsapp('919876543210')).toEqual({});
    expect(withWhatsapp('09876543210')).toEqual({});
    expect(withWhatsapp('+44 7911 123456')).toEqual({
      'general.whatsappNumber':
        'Enter the Indian mobile number WhatsApp runs on — 10 digits, with or without +91.',
    });
  });

  it('refuses a protocol-relative link target', () => {
    expect(
      validateSettings({
        ...valid,
        navigation: { headerCtaLabel: 'Post', headerCtaHref: '//evil.example' },
      })
    ).toEqual({
      'navigation.headerCtaHref':
        'Use a path (/buy), an anchor (#post-requirement) or a full https:// address.',
    });
  });
});
