import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SchemaEditor, { validateCustomSchema } from '../parts/SchemaEditor';
import renderWith from '../../../../test-utils';
import { SeoPanelProvider } from '../SeoPanelContext';
import { withSeoDefaults } from '../../seoValues';

/** The editor on its own, with the panel API a host would have given it. */
function render(custom, { setField = jest.fn(), errors = {} } = {}) {
  const seo = withSeoDefaults({ schema: { type: 'auto', custom, disabledAutoTypes: [] } });

  renderWith(
    <SeoPanelProvider
      value={{
        entityType: 'property',
        entity: { id: 1, seo },
        seo,
        setField,
        setSeo: jest.fn(),
        errors,
        disabled: false,
        variant: 'full',
      }}
    >
      <SchemaEditor />
    </SeoPanelProvider>
  );

  return { setField };
}

describe('validateCustomSchema', () => {
  it('accepts an empty block — the custom graph is an addition, not a replacement', () => {
    expect(validateCustomSchema('')).toMatchObject({ valid: true });
    expect(validateCustomSchema('   ')).toMatchObject({ valid: true });
  });

  it('accepts one node, an array of them and a whole document', () => {
    expect(
      validateCustomSchema('{"@type":"Event","name":"Site visit","startDate":"2026-10-01"}').valid
    ).toBe(true);
    expect(validateCustomSchema('[{"@type":"Organization","name":"Squares N Acres"}]').valid).toBe(
      true
    );
    expect(
      validateCustomSchema('{"@graph":[{"@type":"Organization","name":"Squares N Acres"}]}').valid
    ).toBe(true);
  });

  it('refuses what is not JSON at all', () => {
    const { valid, errors } = validateCustomSchema('{ "@type": Event }');
    expect(valid).toBe(false);
    expect(errors[0].message).toMatch(/Not valid JSON/);
  });

  it('refuses JSON that is not a JSON-LD object', () => {
    expect(validateCustomSchema('"just a string"')).toMatchObject({ valid: false });
    expect(validateCustomSchema('[1, 2, 3]')).toMatchObject({ valid: false });
  });
});

describe('SchemaEditor', () => {
  it('explains what the block is for while it is empty', () => {
    render('');
    expect(screen.getByText(/Optional\./)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the parser error for invalid JSON and marks the field invalid', () => {
    render('{ "@type": Event }');

    expect(screen.getByText('This cannot be published')).toBeInTheDocument();
    expect(screen.getByText(/Not valid JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText('Custom JSON-LD')).toHaveAttribute('aria-invalid', 'true');
  });

  it('confirms a valid block and counts the nodes it adds', () => {
    render(
      '[{"@type":"Organization","name":"Squares N Acres"},{"@type":"WebPage","name":"A page"}]'
    );

    expect(screen.getByText(/Valid JSON-LD/)).toBeInTheDocument();
    expect(screen.getByText(/2 nodes will be added/)).toBeInTheDocument();
  });

  it('surfaces the message the host form refuses the save with', () => {
    render('{ "@type": Event }', {
      errors: { 'seo.schema.custom': 'Fix the custom schema before saving.' },
    });
    expect(screen.getByText('Fix the custom schema before saving.')).toBeInTheDocument();
  });

  it('formats a valid block in place', async () => {
    const { setField } = render('{"@type":"Organization","name":"Squares N Acres"}');

    await userEvent.click(screen.getByRole('button', { name: 'Format JSON' }));

    expect(setField).toHaveBeenCalledWith(
      'schema.custom',
      '{\n  "@type": "Organization",\n  "name": "Squares N Acres"\n}'
    );
  });

  it('writes what is typed straight through to the record', async () => {
    const { setField } = render('');

    await userEvent.type(screen.getByLabelText('Custom JSON-LD'), '{{');

    expect(setField).toHaveBeenCalledWith('schema.custom', '{');
  });
});
