import { render, screen } from '@testing-library/react';

import { authorsConfig, categoriesConfig, tagsConfig } from '../taxonomyConfigs';

/**
 * The three article taxonomy screens (QA-55): the count a row shows is the
 * published one, so the column says so; the placeholder for an SEO panel that
 * has long since arrived is gone; the boxes stop where the API does.
 */
describe('taxonomyConfigs', () => {
  const field = (config, name) => config.formFields.find((entry) => entry.name === name);

  it('calls the count what it is — published articles', () => {
    for (const config of [categoriesConfig(), tagsConfig(), authorsConfig()]) {
      const count = config.columns.find((column) => column.key === 'articleCount');
      expect(count.label).toBe('Published articles');
    }
  });

  it('no longer promises an SEO panel "in a later step" under the real one', () => {
    expect(categoriesConfig().formFooter).toBeUndefined();
    expect(authorsConfig().formFooter).toBeUndefined();
  });

  it('stops each box at the length the API accepts', () => {
    expect(field(categoriesConfig(), 'name').maxLength).toBe(120);
    expect(field(categoriesConfig(), 'description').maxLength).toBe(500);
    expect(field(tagsConfig(), 'name').maxLength).toBe(60);
    expect(field(authorsConfig(), 'name').maxLength).toBe(120);
    expect(field(authorsConfig(), 'designation').maxLength).toBe(120);
  });

  it('shows what a category holds in the drag list, as every other one does', () => {
    const { renderOrderItem } = categoriesConfig();
    render(renderOrderItem({ id: 4, name: 'Legal & RERA', articleCount: 3, isActive: false }));

    expect(screen.getByText('Legal & RERA')).toBeInTheDocument();
    expect(screen.getByText('3 published · inactive')).toBeInTheDocument();
  });
});
