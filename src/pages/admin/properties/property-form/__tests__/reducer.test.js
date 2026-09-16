import createInitialState, { makeImage, resetTmpIds } from '../initialState';
import reducer, { actions, createFormState } from '../reducer';

const stateWithImages = (count = 3) => {
  const base = createFormState();
  const images = Array.from({ length: count }, (_row, index) =>
    makeImage({ url: `https://example.com/${index + 1}.jpg`, alt: `Photo ${index + 1}` })
  );
  return { ...base, values: { ...base.values, images }, initial: { ...base.values, images } };
};

const RECORD = {
  id: 7,
  title: 'Lakeview Heights 3 BHK',
  slug: 'lakeview-heights-3-bhk',
  updatedAt: '2026-09-16T10:00:00.000Z',
  location: { localityId: 1, cityId: 1 },
};

beforeEach(() => resetTmpIds());

describe('createFormState', () => {
  it('starts a new listing blank, clean and flagged as new', () => {
    const state = createFormState();

    expect(state.values).toEqual(createInitialState());
    expect(state.initial).toBe(state.values);
    expect(state.isNew).toBe(true);
    expect(state.saving).toBe(false);
    expect(state.errors).toEqual({});
    expect(state.lastSavedAt).toBeNull();
  });

  it('starts an existing listing from its record', () => {
    const state = createFormState({ propertyId: 7, record: RECORD });

    expect(state.values.title).toBe('Lakeview Heights 3 BHK');
    expect(state.isNew).toBe(false);
    expect(state.lastSavedAt).toBe('2026-09-16T10:00:00.000Z');
  });
});

describe('SET', () => {
  it('writes a dotted path without losing its siblings', () => {
    const next = reducer(createFormState(), actions.set('location.localityId', 4));

    expect(next.values.location.localityId).toBe(4);
    expect(next.values.location.cityId).toBeNull();
    expect(next.touched['location.localityId']).toBe(true);
  });

  it('clears the message of the field it writes', () => {
    const withError = reducer(
      createFormState(),
      actions.setErrors({ title: 'A title is required.', slug: 'A URL is required.' })
    );
    const next = reducer(withError, actions.set('title', 'Lakeview Heights 3 BHK'));

    expect(next.errors.title).toBeUndefined();
    expect(next.errors.slug).toBe('A URL is required.');
  });

  it('ignores a write that changes nothing', () => {
    const state = createFormState();
    expect(reducer(state, actions.set('title', ''))).toBe(state);
  });
});

describe('SET_MANY', () => {
  it('applies every path in one step', () => {
    const next = reducer(
      createFormState(),
      actions.setMany({ 'location.localityId': 4, 'location.cityId': 1, segment: 'commercial' })
    );

    expect(next.values.location).toMatchObject({ localityId: 4, cityId: 1 });
    expect(next.values.segment).toBe('commercial');
  });

  it('returns the same state for an empty patch', () => {
    const state = createFormState();
    expect(reducer(state, actions.setMany({}))).toBe(state);
  });
});

describe('list actions', () => {
  it('appends by default and inserts at an index when given one', () => {
    const state = stateWithImages(2);
    const appended = reducer(state, actions.listAdd('images', makeImage({ url: 'c' })));
    expect(appended.values.images.map((image) => image.url)).toEqual([
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'c',
    ]);

    const inserted = reducer(state, actions.listAdd('images', makeImage({ url: 'c' }), 0));
    expect(inserted.values.images[0].url).toBe('c');
  });

  it('removes by id and leaves an unknown id alone', () => {
    const state = stateWithImages(3);
    const id = state.values.images[1].id;

    const next = reducer(state, actions.listRemove('images', id));
    expect(next.values.images).toHaveLength(2);
    expect(next.values.images.some((image) => image.id === id)).toBe(false);

    expect(reducer(state, actions.listRemove('images', 'tmp-999'))).toBe(state);
  });

  it('moves a row and refuses a move that goes nowhere', () => {
    const state = stateWithImages(3);

    const moved = reducer(state, actions.listMove('images', 2, 0));
    expect(moved.values.images.map((image) => image.alt)).toEqual([
      'Photo 3',
      'Photo 1',
      'Photo 2',
    ]);

    expect(reducer(state, actions.listMove('images', 1, 1))).toBe(state);
    expect(reducer(state, actions.listMove('images', 0, 9))).toBe(state);
  });

  it('patches one row by id and leaves the others untouched', () => {
    const state = stateWithImages(2);
    const id = state.values.images[0].id;

    const next = reducer(state, actions.listUpdate('images', id, { alt: 'Cover photo' }));
    expect(next.values.images[0].alt).toBe('Cover photo');
    expect(next.values.images[0].url).toBe('https://example.com/1.jpg');
    expect(next.values.images[1].alt).toBe('Photo 2');
  });

  it('clears the messages of a list whose rows have shifted', () => {
    const state = stateWithImages(2);
    const withErrors = reducer(
      state,
      actions.setErrors({ 'images.0.alt': 'Describe this image.', title: 'A title is required.' })
    );

    const next = reducer(withErrors, actions.listRemove('images', state.values.images[0].id));
    expect(next.errors['images.0.alt']).toBeUndefined();
    expect(next.errors.title).toBe('A title is required.');
  });

  it('clears only the patched field of a row', () => {
    const state = stateWithImages(1);
    const id = state.values.images[0].id;
    const withErrors = reducer(
      state,
      actions.setErrors({ 'images.0.alt': 'Describe it.', 'images.0.url': 'Bad address.' })
    );

    const next = reducer(withErrors, actions.listUpdate('images', id, { alt: 'A photo' }));
    expect(next.errors['images.0.alt']).toBeUndefined();
    expect(next.errors['images.0.url']).toBe('Bad address.');
  });
});

describe('errors', () => {
  it('marks every field it refuses as touched', () => {
    const next = reducer(createFormState(), actions.setErrors({ title: 'A title is required.' }));
    expect(next.touched.title).toBe(true);
  });

  it('clears one message', () => {
    const withErrors = reducer(
      createFormState(),
      actions.setErrors({ title: 'A title is required.', slug: 'A URL is required.' })
    );
    const next = reducer(withErrors, actions.clearError('title'));

    expect(next.errors).toEqual({ slug: 'A URL is required.' });
  });
});

describe('saving', () => {
  it('flags and unflags a write in flight', () => {
    const saving = reducer(createFormState(), actions.setSaving(true));
    expect(saving.saving).toBe(true);
    expect(reducer(saving, actions.setSaving(false)).saving).toBe(false);
  });

  it('MARK_SAVED moves the baseline, so the form stops being dirty', () => {
    const typed = reducer(createFormState(), actions.set('title', 'Lakeview Heights 3 BHK'));
    expect(JSON.stringify(typed.values)).not.toBe(JSON.stringify(typed.initial));

    const saved = reducer(typed, actions.markSaved(RECORD));
    expect(JSON.stringify(saved.values)).toBe(JSON.stringify(saved.initial));
    expect(saved.isNew).toBe(false);
    expect(saved.saving).toBe(false);
    expect(saved.lastSavedAt).toBe('2026-09-16T10:00:00.000Z');
  });

  it('LOAD replaces both the values and the baseline', () => {
    const typed = reducer(createFormState(), actions.set('title', 'Something else'));
    const loaded = reducer(typed, actions.load(RECORD));

    expect(loaded.values.title).toBe('Lakeview Heights 3 BHK');
    expect(loaded.initial).toBe(loaded.values);
    expect(loaded.errors).toEqual({});
  });
});

describe('drafts', () => {
  it('RESTORE_DRAFT layers a draft over a complete record', () => {
    const next = reducer(
      createFormState(),
      actions.restoreDraft({ values: { title: 'From the draft' }, savedAt: '2026-09-16T10:05:00Z' })
    );

    expect(next.values.title).toBe('From the draft');
    // Everything the draft did not carry is still there.
    expect(next.values.pricing.currency).toBe('INR');
    expect(next.restoredDraft).toBe(true);
  });

  it('ignores a draft with no values', () => {
    const state = createFormState();
    expect(reducer(state, actions.restoreDraft({ savedAt: 'x' }))).toBe(state);
  });

  it('RESET goes back to the last saved values', () => {
    const typed = reducer(
      createFormState({ propertyId: 7, record: RECORD }),
      actions.set('title', 'Edited')
    );
    const reset = reducer(typed, actions.reset());

    expect(reset.values.title).toBe('Lakeview Heights 3 BHK');
    expect(reset.errors).toEqual({});
  });
});

it('ignores an action it does not know', () => {
  const state = createFormState();
  expect(reducer(state, { type: 'NOT_AN_ACTION' })).toBe(state);
});
