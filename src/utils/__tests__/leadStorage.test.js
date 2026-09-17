import { LEAD_CHANGE_EVENT, captureUtm, getUtm, leadStorage } from '../leadStorage';

/**
 * `sna_lead` decides what a page shows a visitor who has already filled a form
 * in this session: whose name goes in the boxes, which listings they have
 * enquired about, and which gated files are open to them.
 */

beforeEach(() => {
  sessionStorage.clear();
});

describe('the visitor', () => {
  it('is nobody until a form has been filled in', () => {
    expect(leadStorage.getVisitor()).toBeNull();
    expect(leadStorage.isIdentified()).toBe(false);
  });

  it('remembers what was typed', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });

    expect(leadStorage.getVisitor()).toEqual({
      name: 'Asha Rao',
      phone: '+919876543210',
      email: '',
    });
    expect(leadStorage.isIdentified()).toBe(true);
  });

  it('never blanks a field a later form did not ask for', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '+919876543210' });
    leadStorage.saveVisitor({ email: 'asha@example.com' });

    expect(leadStorage.getVisitor()).toEqual({
      name: 'Asha Rao',
      phone: '+919876543210',
      email: 'asha@example.com',
    });
  });

  it('is not identified by a name alone', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao' });
    expect(leadStorage.isIdentified()).toBe(false);
  });
});

describe('captures', () => {
  it('records the listing a form was about', () => {
    leadStorage.markCaptured(7, 'price-request');

    expect(leadStorage.isCapturedFor(7)).toBe(true);
    expect(leadStorage.isCapturedFor('7')).toBe(true);
    expect(leadStorage.isCapturedFor(8)).toBe(false);
  });

  it('is not a capture when there was no listing', () => {
    leadStorage.markCaptured(null, 'contact-page');
    expect(leadStorage.isCapturedFor(null)).toBe(false);
  });

  it('opens every gate on a listing the visitor enquired about', () => {
    leadStorage.markCaptured(7, 'property-enquiry');

    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);
    expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(true);
    expect(leadStorage.isUnlocked(8, 'documents')).toBe(false);
  });

  it('opens nothing when the form was only about one file', () => {
    leadStorage.markCaptured(7, 'price-request');
    expect(leadStorage.isUnlocked(7, 'documents')).toBe(false);
  });
});

describe('unlocks', () => {
  it('is per kind and per listing', () => {
    expect(leadStorage.unlock(7, 'documents')).toBe(true);

    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);
    expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(false);
    expect(leadStorage.isUnlocked(8, 'documents')).toBe(false);
  });

  it('refuses a kind nothing gates and a listing that is not one', () => {
    expect(leadStorage.unlock(7, 'pricing')).toBe(false);
    expect(leadStorage.unlock(null, 'documents')).toBe(false);
  });

  it('keeps what was already open', () => {
    leadStorage.unlock(7, 'documents');
    leadStorage.unlock(7, 'floorPlans');

    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);
    expect(leadStorage.isUnlocked(7, 'floorPlans')).toBe(true);
  });
});

describe('a record written by an older bundle', () => {
  it('is read rather than thrown away', () => {
    sessionStorage.setItem(
      'sna_lead',
      JSON.stringify({
        name: 'Asha Rao',
        email: '',
        phone: '9876543210',
        capturedProperties: [7],
        capturedSources: [{ propertyId: 7, source: 'property-enquiry' }],
        unlocks: { 7: ['documents'] },
      })
    );

    expect(leadStorage.getVisitor().name).toBe('Asha Rao');
    expect(leadStorage.isCapturedFor(7)).toBe(true);
    expect(leadStorage.isUnlocked(7, 'documents')).toBe(true);
  });
});

describe('change notifications', () => {
  it('tells the page every time the record moves', () => {
    const listener = jest.fn();
    window.addEventListener(LEAD_CHANGE_EVENT, listener);

    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '9876543210' });
    leadStorage.unlock(7, 'documents');
    leadStorage.clear();

    expect(listener).toHaveBeenCalledTimes(3);
    window.removeEventListener(LEAD_CHANGE_EVENT, listener);
  });
});

describe('clear', () => {
  it('forgets the visitor and the campaign together', () => {
    leadStorage.saveVisitor({ name: 'Asha Rao', phone: '9876543210' });
    captureUtm('?utm_source=google');

    leadStorage.clear();

    expect(leadStorage.getVisitor()).toBeNull();
    expect(getUtm()).toBeNull();
  });
});

describe('the campaign', () => {
  it('is read from the first landing and kept', () => {
    expect(captureUtm('?utm_source=google&utm_campaign=whitefield')).toEqual({
      source: 'google',
      campaign: 'whitefield',
    });
    expect(getUtm()).toEqual({ source: 'google', campaign: 'whitefield' });
  });

  it('is not replaced by a later page that carries its own', () => {
    captureUtm('?utm_source=google');
    captureUtm('?utm_source=facebook');

    expect(getUtm()).toEqual({ source: 'google' });
  });

  it('is nothing at all when the visit arrived without one', () => {
    expect(captureUtm('?page=2')).toBeNull();
    expect(getUtm()).toBeNull();
  });
});
