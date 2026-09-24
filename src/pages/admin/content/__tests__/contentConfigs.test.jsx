import { render, screen } from '@testing-library/react';

import propertyService from '../../../../services/propertyService';
import { partnersConfig, teamConfig, testimonialsConfig } from '../contentConfigs';

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { adminList: jest.fn() },
}));

/**
 * The testimonial, team and partner screens' own rules (QA-61): where a new
 * record goes and what an emptied Order box says, what the drag list tells an
 * editor about the home page, how a testimonial's listing is named when the
 * form reopens, and what a bulk delete says will refuse it.
 */
describe('the content configurations (QA-61)', () => {
  const configs = {
    testimonials: testimonialsConfig(),
    team: teamConfig(),
    partners: partnersConfig(),
  };

  it.each(Object.entries(configs))(
    '%s: a new record reads 1 — first, as the hint under the box says',
    (_name, config) => {
      expect(config.newValues.order).toBe(1);
    }
  );

  it.each(Object.entries(configs))(
    '%s: an emptied Order box asks for a place, in the hint’s words',
    (_name, config) => {
      expect(config.validate({ order: null, logoUrl: 'https://x.test/l.png' }).order).toBe(
        'Give it a place in the list: 1 is first.'
      );
      expect(
        config.validate({ order: 2, logoUrl: 'https://x.test/l.png', rating: 5 }).order
      ).toBeUndefined();
    }
  );

  it('says in the drag list which testimonials the home page shows', () => {
    render(
      configs.testimonials.renderOrderItem({
        id: 1,
        name: 'A. Rao',
        rating: 5,
        isFeatured: true,
        isSample: true,
      })
    );
    expect(screen.getByText('5/5 · featured · sample')).toBeInTheDocument();
  });

  it('explains what Featured does on the testimonial form', () => {
    const featured = configs.testimonials.formFields.find((field) => field.name === 'isFeatured');
    expect(featured.hint).toMatch(/home page shows the featured quotes/);
  });

  it('names a testimonial’s listing by asking for it by id', async () => {
    propertyService.adminList.mockResolvedValue({ data: [{ id: 1, title: 'Lakeview Heights' }] });
    const field = configs.testimonials.formFields.find((entry) => entry.name === 'propertyId');

    await field.resolveSelected(['1'], { signal: undefined });
    expect(propertyService.adminList).toHaveBeenCalledWith(
      { ids: '1', perPage: 1 },
      { signal: undefined }
    );
  });

  it('says a listing that names a team member holds them too', () => {
    const remove = configs.team.bulkActions.find((action) => action.key === 'delete');
    expect(remove.confirm.message).toMatch(/If a page or a listing still names any of them/);
    const partners = configs.partners.bulkActions.find((action) => action.key === 'delete');
    expect(partners.confirm.message).toMatch(/If a page still shows any of them/);
  });
});
