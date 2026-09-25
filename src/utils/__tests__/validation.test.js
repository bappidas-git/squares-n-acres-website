import { schemas } from '../../services/schemas';
import { validate } from '../validation';

/**
 * `validate()` is the client half of the mock's validator: the rules and the
 * sentences have to match, or a form and the API would disagree about the same
 * body (§5.3).
 */
describe('validate', () => {
  describe('required', () => {
    const schema = { name: { type: 'string', required: true } };

    it('reports a missing key', () => {
      expect(validate({}, schema)).toEqual({ name: 'The name field is required.' });
    });

    it.each([[''], ['   '], [null], [[]]])('reports %p as empty', (value) => {
      expect(validate({ name: value }, schema).name).toBe('The name field is required.');
    });

    it('accepts a value', () => {
      expect(validate({ name: 'Whitefield' }, schema)).toEqual({});
    });

    it('skips missing keys when partial', () => {
      expect(validate({}, schema, { partial: true })).toEqual({});
    });

    it('still checks a key a partial body does send', () => {
      expect(validate({ name: '' }, schema, { partial: true }).name).toBeDefined();
    });

    it('exempts a field the API defaults when filling defaults (a POST)', () => {
      const withDefault = { role: { type: 'string', required: true, default: 'sales' } };
      expect(validate({}, withDefault, { fillDefaults: true })).toEqual({});
      expect(validate({}, withDefault).role).toBe('The role field is required.');
    });
  });

  describe('types', () => {
    it.each([
      ['string', 42, 'The field must be a string.'],
      ['int', 1.5, 'The field must be an integer.'],
      ['number', 'x', 'The field must be a number.'],
      ['bool', 'true', 'The field field must be true or false.'],
      ['array', {}, 'The field must be an array.'],
      ['object', [], 'The field must be an object.'],
    ])('rejects a %s of the wrong type', (type, value, message) => {
      expect(validate({ field: value }, { field: { type } }).field).toBe(message);
    });

    it('accepts an enum value and refuses anything else', () => {
      const schema = { role: { type: 'enum', enum: ['admin', 'sales'] } };
      expect(validate({ role: 'admin' }, schema)).toEqual({});
      expect(validate({ role: 'owner' }, schema).role).toBe('The selected role is invalid.');
    });

    it('accepts values an enum only tolerates', () => {
      const schema = { source: { type: 'enum', enum: ['contact-page'], accepts: ['website'] } };
      expect(validate({ source: 'website' }, schema)).toEqual({});
    });

    it.each([
      ['email', 'ada@example.com', 'ada@', 'The email must be a valid email address.'],
      ['url', 'https://x.io/a', 'x.io', 'The url must be a valid URL.'],
      [
        'slug',
        'whitefield-east',
        'Whitefield East',
        'The slug may only contain lowercase letters, numbers and hyphens.',
      ],
      ['date', '2026-09-16', '16-09-2026', 'The date does not match the format Y-m-d.'],
    ])('checks the %s format', (type, good, bad, message) => {
      expect(validate({ [type]: good }, { [type]: { type } })).toEqual({});
      expect(validate({ [type]: bad }, { [type]: { type } })[type]).toBe(message);
    });

    it('reads an empty slug as "derive it", as the API does (QA-60)', () => {
      const schema = { slug: { type: 'slug', maxLength: 75, default: '' } };
      expect(validate({ slug: '' }, schema)).toEqual({});
      expect(validate({ slug: 'Not A Slug' }, schema).slug).toBe(
        'The slug may only contain lowercase letters, numbers and hyphens.'
      );
      // A slug that has to be there still says so.
      expect(validate({ slug: '' }, { slug: { type: 'slug', required: true } }).slug).toBe(
        'The slug field is required.'
      );
    });

    it('checks Indian mobile numbers, spacing and +91 included', () => {
      const schema = { phone: { type: 'phone' } };
      expect(validate({ phone: '9876543210' }, schema)).toEqual({});
      expect(validate({ phone: '+91 98765 43210' }, schema)).toEqual({});
      expect(validate({ phone: '1234567890' }, schema).phone).toBe(
        'The phone must be a valid Indian mobile number.'
      );
    });
  });

  describe('null and nullable', () => {
    it('accepts null on a nullable field', () => {
      expect(validate({ phone: null }, { phone: { type: 'phone', nullable: true } })).toEqual({});
    });

    it('refuses null on a field that is not nullable', () => {
      expect(validate({ phone: null }, { phone: { type: 'phone' } }).phone).toBeDefined();
    });

    it('refuses null on a required field', () => {
      expect(validate({ name: null }, { name: { type: 'string', required: true } }).name).toBe(
        'The name field is required.'
      );
    });
  });

  describe('bounds', () => {
    it('checks numeric min and max', () => {
      const schema = { order: { type: 'int', min: 0, max: 10 } };
      expect(validate({ order: -1 }, schema).order).toBe('The order must be at least 0.');
      expect(validate({ order: 11 }, schema).order).toBe('The order may not be greater than 10.');
      expect(validate({ order: 5 }, schema)).toEqual({});
    });

    it('checks string length', () => {
      const schema = { name: { type: 'string', min: 2, maxLength: 5 } };
      expect(validate({ name: 'a' }, schema).name).toBe('The name must be at least 2 characters.');
      expect(validate({ name: 'abcdef' }, schema).name).toBe(
        'The name may not be greater than 5 characters.'
      );
    });

    it('checks a pattern', () => {
      const schema = { code: { type: 'string', pattern: '^[A-Z]{3}$' } };
      expect(validate({ code: 'abc' }, schema).code).toBe('The code format is invalid.');
      expect(validate({ code: 'BLR' }, schema)).toEqual({});
    });

    it('holds a url to its column’s 500 characters unless it names its own limit (QA-65)', () => {
      const address = (length) => `https://cdn.example.com/${'a'.repeat(length - 28)}.png`;
      const schema = {
        logoUrl: { type: 'url', nullable: true },
        gallery: { type: 'array', items: { type: 'url' } },
        wideUrl: { type: 'url', maxLength: 1000 },
      };

      expect(validate({ logoUrl: address(500), gallery: [address(500)] }, schema)).toEqual({});
      expect(validate({ logoUrl: address(501), gallery: [address(501)] }, schema)).toEqual({
        logoUrl: 'The logoUrl may not be greater than 500 characters.',
        'gallery.0': 'The gallery.0 may not be greater than 500 characters.',
      });
      // A descriptor's own `maxLength` still decides.
      expect(validate({ wideUrl: address(900) }, schema)).toEqual({});
    });

    it('holds every url of the contract to 500 characters (QA-65)', () => {
      // Every `url` descriptor the registry holds, at any depth, refuses 501.
      const urls = [];
      const walk = (descriptor, key) => {
        if (!descriptor || typeof descriptor !== 'object') return;
        if (descriptor.type === 'url') urls.push([key, descriptor]);
        if (descriptor.items) walk(descriptor.items, `${key}.*`);
        for (const [field, child] of Object.entries(descriptor.shape ?? {})) {
          walk(child, `${key}.${field}`);
        }
      };
      for (const [schemaKey, shape] of Object.entries(schemas)) {
        for (const [field, descriptor] of Object.entries(shape)) {
          walk(descriptor, `${schemaKey}:${field}`);
        }
      }

      expect(urls.length).toBeGreaterThan(50);
      const tooLong = `https://cdn.example.com/${'a'.repeat(473)}.png`;
      for (const [key, descriptor] of urls) {
        const found = validate({ value: tooLong }, { value: descriptor }).value;
        expect([key, found]).toEqual([key, 'The value may not be greater than 500 characters.']);
      }
    });

    it('checks array length', () => {
      const schema = { ids: { type: 'array', min: 1, max: 2 } };
      expect(validate({ ids: [] }, schema).ids).toBe('The ids must have at least 1 items.');
      expect(validate({ ids: [1, 2, 3] }, schema).ids).toBe(
        'The ids may not have more than 2 items.'
      );
    });
  });

  describe('nested shapes and arrays', () => {
    const schema = {
      location: {
        type: 'object',
        shape: {
          localityId: { type: 'int', required: true },
          city: { type: 'string', maxLength: 5 },
        },
      },
      images: {
        type: 'array',
        items: { type: 'object', shape: { alt: { type: 'string', required: true } } },
      },
      tags: { type: 'array', items: { type: 'slug' } },
    };

    it('reports a nested key in dotted form', () => {
      expect(validate({ location: {} }, schema)['location.localityId']).toBe(
        'The location.localityId field is required.'
      );
    });

    it('reports the index of the array element that failed', () => {
      const errors = validate({ images: [{ alt: 'A' }, {}] }, schema);
      expect(errors['images.1.alt']).toBe('The images.1.alt field is required.');
      expect(errors['images.0.alt']).toBeUndefined();
    });

    it('checks scalar array items', () => {
      expect(validate({ tags: ['ok', 'Not OK'] }, schema)['tags.1']).toBeDefined();
    });

    it('refuses a non-object where a shape is expected', () => {
      expect(validate({ location: 'Whitefield' }, schema).location).toBe(
        'The location must be an object.'
      );
    });

    it('passes a body that satisfies every rule', () => {
      expect(
        validate(
          { location: { localityId: 4, city: 'BLR' }, images: [{ alt: 'A' }], tags: ['new'] },
          schema
        )
      ).toEqual({});
    });
  });

  it('ignores server-managed fields a client may not send', () => {
    const schema = { viewCount: { type: 'int', required: true, serverManaged: true } };
    expect(validate({}, schema)).toEqual({});
  });

  it('answers an empty object for a missing descriptor', () => {
    expect(validate({ anything: 1 }, null)).toEqual({});
  });
});
