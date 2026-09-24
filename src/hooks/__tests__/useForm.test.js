import { act, renderHook, waitFor } from '@testing-library/react';

import ApiError from '../../services/apiError';
import ToastProvider from '../../components/common/ToastProvider';
import useForm, { getIn, relabel, setIn } from '../useForm';

/** `useForm` toasts what it cannot paint, so it needs the one toast system. */
const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;

const setup = (options) => renderHook(() => useForm(options), { wrapper });

const schema = {
  name: { type: 'string', required: true, min: 2 },
  email: { type: 'email', required: true },
  location: { type: 'object', shape: { localityId: { type: 'int', required: true } } },
};

describe('useForm', () => {
  it('starts clean, valid and not submitting', () => {
    const { result } = setup({ initialValues: { name: '' } });

    expect(result.current.values).toEqual({ name: '' });
    expect(result.current.dirty).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.submitting).toBe(false);
  });

  describe('dirty', () => {
    it('turns true when a value changes and false again when it changes back', () => {
      const { result } = setup({ initialValues: { name: 'Ada' } });

      act(() => result.current.setField('name', 'Grace'));
      expect(result.current.dirty).toBe(true);

      act(() => result.current.setField('name', 'Ada'));
      expect(result.current.dirty).toBe(false);
    });

    it('ignores a write that changes nothing', () => {
      const { result } = setup({ initialValues: { name: 'Ada' } });
      act(() => result.current.setField('name', 'Ada'));
      expect(result.current.dirty).toBe(false);
    });

    it('is cleared by reset', () => {
      const { result } = setup({ initialValues: { name: 'Ada' } });

      act(() => result.current.setField('name', 'Grace'));
      act(() => result.current.reset());

      expect(result.current.values).toEqual({ name: 'Ada' });
      expect(result.current.dirty).toBe(false);
    });
  });

  describe('setComputed', () => {
    const blank = { name: 'Ada', seo: { title: '', score: null, scoreBand: 'none' } };

    it('writes the value without making an untouched form dirty', () => {
      const { result } = setup({ initialValues: blank });

      act(() => result.current.setComputed({ 'seo.score': 72, 'seo.scoreBand': 'good' }));

      expect(result.current.values.seo.score).toBe(72);
      expect(result.current.values.seo.scoreBand).toBe('good');
      expect(result.current.dirty).toBe(false);
    });

    it('leaves the edit a person did make showing as a change', () => {
      const { result } = setup({ initialValues: blank });

      act(() => result.current.setField('seo.title', 'A title'));
      act(() => result.current.setComputed({ 'seo.score': 72 }));

      expect(result.current.dirty).toBe(true);

      // …and undoing that edit still clears the form, score and all.
      act(() => result.current.setField('seo.title', ''));
      expect(result.current.dirty).toBe(false);
    });

    it('does nothing at all for an empty patch', () => {
      const { result } = setup({ initialValues: blank });
      const before = result.current.values;

      act(() => result.current.setComputed({}));

      expect(result.current.values).toBe(before);
      expect(result.current.dirty).toBe(false);
    });
  });

  describe('setField', () => {
    it('writes a dotted path without losing its siblings', () => {
      const { result } = setup({
        initialValues: { location: { localityId: 1, city: 'Bengaluru' } },
      });

      act(() => result.current.setField('location.localityId', 7));

      expect(result.current.values.location).toEqual({ localityId: 7, city: 'Bengaluru' });
    });

    it('writes into an array by index', () => {
      const { result } = setup({ initialValues: { images: [{ alt: 'A' }, { alt: 'B' }] } });

      act(() => result.current.setField('images.1.alt', 'Changed'));

      expect(Array.isArray(result.current.values.images)).toBe(true);
      expect(result.current.values.images[1].alt).toBe('Changed');
      expect(result.current.values.images[0].alt).toBe('A');
    });

    it('clears the error of the field being corrected', () => {
      const { result } = setup({ initialValues: { name: '', email: '' }, schema });

      act(() => result.current.validateAll());
      expect(result.current.errors.name).toBeDefined();

      act(() => result.current.setField('name', 'Ada'));
      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeDefined();
    });
  });

  describe('validation', () => {
    it('validates against the schema and marks the failures touched', () => {
      const { result } = setup({ initialValues: { name: 'A', email: 'nope' }, schema });

      let valid;
      act(() => {
        valid = result.current.validateAll();
      });

      expect(valid).toBe(false);
      expect(result.current.errors.name).toBe('The name must be at least 2 characters.');
      expect(result.current.errors.email).toBe('The email must be a valid email address.');
      expect(result.current.touched.email).toBe(true);
      expect(result.current.isValid).toBe(false);
    });

    it('merges the extra rules the caller passes over the schema', () => {
      const { result } = setup({
        initialValues: { name: 'Ada', email: 'ada@example.com' },
        schema,
        validate: (values) => (values.name === 'Ada' ? { name: 'That name is taken.' } : {}),
      });

      act(() => result.current.validateAll());
      expect(result.current.errors.name).toBe('That name is taken.');
    });
  });

  describe('setServerErrors', () => {
    it('maps dotted keys onto the fields that own them', () => {
      const { result } = setup({ initialValues: {} });

      act(() =>
        result.current.setServerErrors(
          new ApiError({
            status: 422,
            errors: {
              'location.localityId': ['The location.localityId field is required.'],
              'images.0.alt': ['The images.0.alt field is required.'],
              email: ['The email has already been taken.'],
            },
          })
        )
      );

      expect(result.current.errors['location.localityId']).toBe(
        'The location.localityId field is required.'
      );
      expect(result.current.errors['images.0.alt']).toBe('The images.0.alt field is required.');
      expect(result.current.errors.email).toBe('The email has already been taken.');
      expect(result.current.getError('location.localityId')).toBe(
        'The location.localityId field is required.'
      );
      expect(result.current.touched['location.localityId']).toBe(true);
    });

    it('takes a bare string as readily as an array', () => {
      const { result } = setup({ initialValues: {} });
      act(() =>
        result.current.setServerErrors({ errors: { role: 'You cannot demote yourself.' } })
      );
      expect(result.current.errors.role).toBe('You cannot demote yourself.');
    });
  });

  describe('labels (QA-55)', () => {
    const labelled = {
      initialValues: { categoryId: null, title: '' },
      schema: { categoryId: { type: 'int', required: true } },
      labels: { categoryId: 'category', 'seo.slug': 'URL' },
    };

    it('names a field by its label in the messages the schema writes', () => {
      const { result } = setup(labelled);

      act(() => {
        result.current.validateAll();
      });

      expect(result.current.errors.categoryId).toBe('The category field is required.');
    });

    it('names it the same way in the messages the API sends', () => {
      const { result } = setup(labelled);

      act(() =>
        result.current.setServerErrors(
          new ApiError({
            status: 422,
            errors: {
              categoryId: ['The selected categoryId is invalid.'],
              'seo.slug': ['The seo.slug may only contain lowercase letters.'],
              title: ['The title field is required.'],
            },
          })
        )
      );

      expect(result.current.errors.categoryId).toBe('The selected category is invalid.');
      expect(result.current.errors['seo.slug']).toBe('The URL may only contain lowercase letters.');
      // A field with no label keeps the words it was sent with.
      expect(result.current.errors.title).toBe('The title field is required.');
    });
  });

  describe('submit', () => {
    it('refuses to call onSubmit while the form is invalid', async () => {
      const onSubmit = jest.fn();
      const { result } = setup({ initialValues: { name: '', email: '' }, schema, onSubmit });

      let outcome;
      await act(async () => {
        outcome = await result.current.submit();
      });

      expect(outcome).toBe(false);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits the values and resets the dirty baseline', async () => {
      const onSubmit = jest.fn().mockResolvedValue({ data: { id: 1 } });
      const { result } = setup({
        initialValues: { name: 'Ada', email: 'ada@example.com' },
        schema,
        onSubmit,
      });

      act(() => result.current.setField('name', 'Grace'));
      expect(result.current.dirty).toBe(true);

      await act(async () => {
        await result.current.submit();
      });

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Grace', email: 'ada@example.com' });
      await waitFor(() => expect(result.current.dirty).toBe(false));
    });

    it('paints a 422 onto the fields', async () => {
      const onSubmit = jest.fn().mockRejectedValue(
        new ApiError({
          status: 422,
          message: 'The given data was invalid.',
          errors: { email: ['The email has already been taken.'] },
        })
      );
      const { result } = setup({
        initialValues: { name: 'Ada', email: 'ada@example.com' },
        schema,
        onSubmit,
      });

      let outcome;
      await act(async () => {
        outcome = await result.current.submit();
      });

      expect(outcome).toBe(false);
      expect(result.current.errors.email).toBe('The email has already been taken.');
      expect(result.current.submitting).toBe(false);
    });

    it('survives a failure that belongs to no field', async () => {
      const onSubmit = jest
        .fn()
        .mockRejectedValue(new ApiError({ status: 500, message: 'Internal server error' }));
      const { result } = setup({
        initialValues: { name: 'Ada', email: 'ada@example.com' },
        schema,
        onSubmit,
      });

      let outcome;
      await act(async () => {
        outcome = await result.current.submit();
      });

      expect(outcome).toBe(false);
      expect(result.current.errors).toEqual({});
    });
  });
});

describe('relabel', () => {
  it('replaces the key only where it stands as a word of its own', () => {
    expect(
      relabel(
        {
          slug: 'The slug has already been taken.',
          'seo.slug': 'The seo.slug must be a string.',
          authorId: 'Pick an author for this piece.',
        },
        { slug: 'URL', authorId: 'author' }
      )
    ).toEqual({
      slug: 'The URL has already been taken.',
      // `slug` inside `seo.slug` is not the word `slug`.
      'seo.slug': 'The seo.slug must be a string.',
      authorId: 'Pick an author for this piece.',
    });
  });

  it('hands the errors back untouched when there are no labels', () => {
    const errors = { name: 'The name field is required.' };
    expect(relabel(errors, null)).toBe(errors);
  });
});

describe('dotted paths', () => {
  it('reads a nested value and answers undefined for a missing one', () => {
    expect(getIn({ a: { b: [{ c: 1 }] } }, 'a.b.0.c')).toBe(1);
    expect(getIn({ a: {} }, 'a.b.c')).toBeUndefined();
  });

  it('creates an array when the next key is an index', () => {
    expect(setIn({}, 'images.0.alt', 'A')).toEqual({ images: [{ alt: 'A' }] });
  });

  it('never mutates its input', () => {
    const source = { a: { b: 1 } };
    const next = setIn(source, 'a.b', 2);
    expect(source.a.b).toBe(1);
    expect(next.a.b).toBe(2);
  });
});
