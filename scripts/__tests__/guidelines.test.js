/**
 * The generator of `backend_developer_guidelines/` — the three pieces that
 * turn a descriptor into something a Laravel developer reads.
 *
 *   npm run test:scripts
 *
 * The package itself is checked by `npm run check:guidelines`, which walks the
 * generated files. What is tested here is the part that has to be *right*
 * rather than merely present: the Laravel rule a field descriptor becomes, the
 * DDL a model becomes, the tables the documents are made of, the YAML the
 * OpenAPI file is written with, and the merge that puts the hand-written prose
 * into the generated documents.
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  laravelRule,
  referencedCollection,
  rulesFor,
  snakeCase,
  tableOf,
} = require('../lib/guidelines/rules');
// `renderDdl` is aliased: ESLint's testing-library plugin reads any `render*`
// call in a test file as a component render and objects to the name of what
// it is assigned to.
const { buildSchema, columnType, renderDdl: toDdl } = require('../lib/guidelines/sql');
const { blocks, cell, facts, table } = require('../lib/guidelines/markdown');
const { document, isPlain } = require('../lib/guidelines/yaml');
const { render, splitSections } = require('../lib/guidelines/merge');
const { trim, trimText, STABLE } = require('../lib/guidelines/capture');
const { toJsonSchema } = require('../lib/guidelines/openapi');

describe('Laravel rules from field descriptors', () => {
  it('renders the mappings the schema README documents', () => {
    const cases = [
      [
        { type: 'string', required: true, maxLength: 300 },
        { field: 'shortDescription' },
        'required|string|max:300',
      ],
      [
        { type: 'string', required: true, min: 10, maxLength: 200 },
        { field: 'title' },
        'required|string|min:10|max:200',
      ],
      [
        { type: 'int', nullable: true },
        { field: 'localityId' },
        'nullable|integer|exists:localities,id',
      ],
      [
        { type: 'enum', enum: ['sale', 'rent', 'lease'] },
        { field: 'listingType' },
        'in:sale,rent,lease',
      ],
      [{ type: 'bool', default: false }, { field: 'isActive' }, 'boolean'],
      [{ type: 'number', min: 0 }, { field: 'price' }, 'numeric|min:0'],
      [{ type: 'date', nullable: true }, { field: 'possessionDate' }, 'nullable|date_format:Y-m-d'],
      [
        { type: 'array', max: 6, items: { type: 'int' } },
        { field: 'similarPropertyIds' },
        'array|max:6',
      ],
      [
        { type: 'email', required: true, unique: true },
        { field: 'email', collection: 'adminUsers' },
        'required|email|unique:admin_users,email',
      ],
      [
        { type: 'slug', maxLength: 75 },
        { field: 'slug', collection: 'properties' },
        'nullable|regex:/^[a-z0-9-]+$/|max:75|unique:properties,slug',
      ],
      // A url is held to its column's 500 without saying so, and to its own
      // limit when it names one (QA-65).
      [{ type: 'url', nullable: true }, { field: 'logoUrl' }, 'nullable|url|max:500'],
      [
        { type: 'url', required: true, maxLength: 1000 },
        { field: 'wideUrl' },
        'required|url|max:1000',
      ],
    ];

    for (const [descriptor, context, expected] of cases) {
      assert.equal(laravelRule(descriptor, context), expected, `${context.field}`);
    }
  });

  it('turns a required-if descriptor into required_if', () => {
    const rule = laravelRule(
      {
        type: 'date',
        nullable: true,
        requiredIf: { field: 'constructionStatus', in: ['pre-launch'] },
      },
      { field: 'possessionDate' }
    );
    assert.equal(rule, 'required_if:constructionStatus,pre-launch|nullable|date_format:Y-m-d');
  });

  it('keeps the dotted path of a nested shape, as the 422 body does', () => {
    const rules = rulesFor(
      {
        images: {
          type: 'array',
          items: {
            type: 'object',
            shape: { alt: { type: 'string', required: true, maxLength: 200 } },
          },
        },
        location: { type: 'object', shape: { localityId: { type: 'int', required: true } } },
      },
      { collection: 'properties' }
    );

    const byPath = Object.fromEntries(rules.map((entry) => [entry.path, entry.rule]));
    assert.equal(byPath['images.*.alt'], 'required|string|max:200');
    assert.equal(byPath['location.localityId'], 'required|integer|exists:localities,id');
  });

  it('never validates a field the client cannot send', () => {
    const rules = rulesFor({
      viewCount: { type: 'int', serverManaged: true },
      propertyType: { type: 'object', read: true, shape: {} },
      title: { type: 'string', required: true },
    });
    assert.deepEqual(
      rules.map((entry) => entry.path),
      ['title']
    );
  });

  it('resolves the foreign keys whose name does not spell out the table', () => {
    assert.equal(referencedCollection('localityId'), 'localities');
    assert.equal(referencedCollection('propertyTypeId'), 'propertyTypes');
    assert.equal(referencedCollection('amenityIds'), 'amenities');
    assert.equal(referencedCollection('assignedTo'), 'adminUsers');
    assert.equal(referencedCollection('categoryId'), 'articleCategories');
    assert.equal(referencedCollection('title'), null);
    assert.equal(tableOf('newsletterSubscribers'), 'newsletter_subscribers');
    assert.equal(snakeCase('superBuiltUpArea'), 'super_built_up_area');
  });
});

describe('MySQL schema from the model descriptors', () => {
  const tables = buildSchema();
  const byName = Object.fromEntries(tables.map((entry) => [entry.table, entry]));

  it('gives every collection a table, and every nested array its own', () => {
    for (const name of [
      'properties',
      'leads',
      'articles',
      'pages',
      'admin_users',
      'site_settings',
    ]) {
      assert.ok(byName[name], `${name} is missing`);
    }
    for (const name of [
      'property_images',
      'property_amenity',
      'lead_notes',
      'article_tag',
      'page_blocks',
    ]) {
      assert.ok(byName[name], `${name} is missing`);
    }
  });

  it('flattens the nested objects of a property into columns', () => {
    const columns = byName.properties.columns.map((column) => column.column);
    for (const name of [
      'locality_id',
      'city_id',
      'price',
      'rent_per_month',
      'super_built_up_area',
      'bedrooms',
      'developer_id',
      'project_total_floors',
      'agent_show_on_listing',
      'is_landmark_project',
    ]) {
      assert.ok(columns.includes(name), `${name} is missing`);
    }
    // …and keeps as JSON the things nothing ever queries inside.
    const json = byName.properties.columns.filter((column) => column.type === 'JSON');
    assert.ok(json.some((column) => column.column === 'section_visibility'));
    assert.ok(json.some((column) => column.column === 'seo'));
    assert.ok(json.some((column) => column.column === 'other_charges'));
  });

  it('cascades a child row and empties an optional pointer', () => {
    const parent = byName.property_images.columns.find((column) => column.column === 'property_id');
    assert.equal(parent.onDelete, 'CASCADE');

    const assignee = byName.leads.columns.find((column) => column.column === 'assigned_to');
    assert.equal(assignee.onDelete, 'SET NULL');
    assert.equal(assignee.references, 'adminUsers');

    const locality = byName.properties.columns.find((column) => column.column === 'locality_id');
    assert.equal(locality.onDelete, 'RESTRICT');
  });

  it('chooses a column type for every descriptor type', () => {
    assert.equal(columnType({ type: 'int' }, 'floor_number'), 'INT');
    assert.equal(columnType({ type: 'int' }, 'locality_id'), 'BIGINT UNSIGNED');
    assert.equal(columnType({ type: 'number' }, 'latitude'), 'DECIMAL(10,7)');
    assert.equal(columnType({ type: 'number' }, 'price'), 'DECIMAL(14,2)');
    assert.equal(columnType({ type: 'bool' }, 'is_active'), 'TINYINT(1)');
    assert.equal(columnType({ type: 'html' }, 'description'), 'LONGTEXT');
    assert.equal(columnType({ type: 'object' }, 'seo'), 'JSON');
    assert.equal(columnType({ type: 'string', maxLength: 40 }, 'name'), 'VARCHAR(40)');
    assert.equal(columnType({ type: 'string', maxLength: 4000 }, 'note'), 'TEXT');
    assert.equal(columnType({ type: 'url' }, 'logo_url'), 'VARCHAR(500)');
    assert.equal(columnType({ type: 'url', maxLength: 1000 }, 'wide_url'), 'VARCHAR(1000)');
  });

  it('writes DDL a reader can check, with the soft deletes and the indexes', () => {
    const ddl = toDdl({ generatedFrom: 'testing' });

    assert.match(ddl, /-- generatedFrom: testing/);
    assert.match(ddl, /ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci/);
    assert.match(
      ddl,
      /FULLTEXT KEY `properties_fulltext` \(`title`, `project_name`, `short_description`\)/
    );
    assert.match(ddl, /FULLTEXT KEY `articles_fulltext` \(`title`, `content_text`\)/);
    assert.match(ddl, /UNIQUE KEY `properties_slug_unique` \(`slug`\)/);
    assert.match(ddl, /REFERENCES `properties` \(`id`\) ON DELETE CASCADE/);

    for (const soft of ['properties', 'articles', 'pages', 'leads']) {
      const create = ddl.slice(ddl.indexOf(`CREATE TABLE \`${soft}\``));
      assert.match(create.slice(0, create.indexOf(');')), /`deleted_at` DATETIME/, soft);
    }

    // No table is declared twice, and no column inside one.
    const names = [...ddl.matchAll(/CREATE TABLE `([a-z_]+)`/g)].map((match) => match[1]);
    assert.equal(new Set(names).size, names.length, 'a table is declared twice');
  });
});

describe('Markdown tables', () => {
  it('escapes pipes, fills the empty cells and keeps the columns square', () => {
    const rendered = table(
      ['a', 'bb'],
      [
        [1, 'x|y'],
        ['', null],
      ]
    );
    const lines = rendered.split('\n');

    assert.equal(lines.length, 4);
    assert.match(lines[1], /^\| -+ \| -+ \|$/);
    assert.ok(lines[2].includes('x\\|y'), 'a pipe must be escaped');
    assert.ok(lines[3].includes('—'), 'an empty cell becomes an em dash');
    assert.equal(new Set(lines.map((line) => line.length)).size, 1, 'the rows are not square');
  });

  it('says so rather than rendering an empty table', () => {
    assert.equal(table(['a'], []), '_None._');
  });

  it('never leaves a newline inside a cell', () => {
    assert.equal(cell('one\ntwo'), 'one two');
  });

  it('writes a fact list without the blank labels a two-column table would have', () => {
    assert.equal(
      facts([
        ['Key', '`x`'],
        ['Empty', ''],
      ]),
      '- **Key** `x`'
    );
  });

  it('joins blocks with exactly one blank line', () => {
    assert.equal(blocks('a\n\n', '', null, 'b'), 'a\n\nb');
  });
});

describe('YAML', () => {
  it('quotes only what YAML would otherwise misread', () => {
    assert.ok(isPlain('plain-text'));
    assert.ok(isPlain('http://localhost:4000/api'));
    assert.ok(!isPlain('yes'));
    assert.ok(!isPlain('3.1'));
    assert.ok(!isPlain('has: a colon'));
    assert.ok(!isPlain(''));
  });

  it('writes maps, sequences and block scalars', () => {
    const yaml = document({
      openapi: '3.1.0',
      servers: [{ url: 'http://localhost:4000/api' }],
      info: { description: 'one\ntwo' },
      empty: {},
      none: [],
    });

    assert.equal(
      yaml,
      [
        // `3.1.0` is not a number in any YAML version, so it stays plain;
        // `3.1` would be quoted, which is exactly the distinction that matters.
        'openapi: 3.1.0',
        'servers:',
        '  - url: http://localhost:4000/api',
        'info:',
        '  description: |-',
        '    one',
        '    two',
        'empty: {}',
        'none: []',
        '',
      ].join('\n')
    );
  });
});

describe('JSON Schema from the descriptors', () => {
  it('carries the nullability, the enum and the bounds', () => {
    assert.deepEqual(toJsonSchema({ type: 'enum', enum: ['a', 'b'], nullable: true }), {
      type: ['string', 'null'],
      enum: ['a', 'b', null],
    });
    assert.deepEqual(toJsonSchema({ type: 'string', maxLength: 300, min: 10 }), {
      type: 'string',
      maxLength: 300,
      minLength: 10,
    });
    assert.equal(toJsonSchema({ type: 'int', read: true }).readOnly, true);
  });

  it('gives a url the 500 characters of its column (QA-65)', () => {
    assert.deepEqual(toJsonSchema({ type: 'url', nullable: true }), {
      type: ['string', 'null'],
      format: 'uri',
      maxLength: 500,
    });
    assert.equal(toJsonSchema({ type: 'array', items: { type: 'url' } }).items.maxLength, 500);
  });
});

describe('Merging the hand-written notes', () => {
  const markdown = [
    'preamble',
    '',
    '## Token flow',
    '',
    'body one',
    '',
    '### deeper',
    '',
    'still one',
    '',
    '## Sales scoping',
    '',
    '```sql',
    '-- ## not a heading',
    '```',
    '',
  ].join('\n');

  it('splits a file on its second-level headings', () => {
    const sections = splitSections(markdown);
    assert.deepEqual(Object.keys(sections), ['', 'token-flow', 'sales-scoping']);
    assert.match(sections['token-flow'].body, /^body one/);
    assert.match(sections['token-flow'].body, /### deeper/);
  });

  it('does not mistake a heading inside a fenced block for one', () => {
    assert.match(splitSections(markdown)['sales-scoping'].body, /-- ## not a heading/);
  });

  it('fills a template, and refuses to leave a hole', () => {
    assert.equal(render('a {{x}} b', { x: 'X' }, 't.md'), 'a X b');
    assert.throws(() => render('a {{y}}', {}, 't.md'), /nothing to put in y/);
  });
});

describe('Stabilising a captured example', () => {
  it('trims the arrays and the long strings, and says it did', () => {
    const trimmed = trim({ items: [1, 2, 3, 4], note: 'x'.repeat(400) }, 'data');
    assert.equal(trimmed.items.length, 3);
    assert.match(trimmed.items[2], /2 more/);
    assert.equal(trimmed.note.length, 301);
  });

  it('replaces the values a server invents on every call', () => {
    const trimmed = trim(
      {
        createdAt: '2026-09-18T19:05:07.000Z',
        possessionDate: '2027-03-01',
        token: 'whatever-the-server-minted',
        viewCount: 41,
        url: 'https://x/y?preview=aWEmTn9Fjy16kI-UgtGFvoZwBHinpYhj',
      },
      'data'
    );

    assert.equal(trimmed.createdAt, STABLE.datetime);
    assert.equal(trimmed.possessionDate, STABLE.date);
    assert.equal(trimmed.token, STABLE.token);
    assert.equal(trimmed.viewCount, 0);
    assert.doesNotMatch(trimmed.url, /aWEmTn9F/);
  });

  it('zeroes a counter column of a CSV export, whatever it is called', () => {
    const csv = 'From,To,Status,Active,Hits,Note\r\n/blog,/insights,301,true,7,"A, note"\r\n';
    assert.match(trimText(csv), /301,true,0,"A, note"/);
  });

  it('normalises the RFC-822 date an RSS feed stamps itself with', () => {
    assert.doesNotMatch(
      trimText('<lastBuildDate>Fri, 18 Sep 2026 19:05:07 GMT</lastBuildDate>'),
      /18 Sep/
    );
  });
});
