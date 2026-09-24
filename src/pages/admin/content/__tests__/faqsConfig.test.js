import { faqsConfig, stripHtml } from '../contentConfigs';

/**
 * The FAQ screen's own rules (QA-59): what the form refuses before the API
 * would, and what it sends.
 */
describe('faqsConfig', () => {
  const config = faqsConfig({ propertyTypes: [{ id: 11, name: 'Office Spaces' }] });
  const valid = {
    question: 'How long does a registration take?',
    answer: '<p>Usually a single visit to the sub-registrar’s office.</p>',
    category: 'legal',
    order: 0,
  };

  it('refuses an answer that is markup without words', () => {
    for (const answer of ['<ul><li><p></p></li></ul>', '<h3> </h3>', '<p>&nbsp;</p>']) {
      expect(config.validate({ ...valid, answer })).toEqual({
        answer: 'The answer field is required.',
      });
    }
    expect(config.validate(valid)).toEqual({});
  });

  it('asks for a place in the list when the box is emptied', () => {
    expect(config.validate({ ...valid, order: null }).order).toMatch(/place in the list/);
    expect(config.validate({ ...valid, order: 0 }).order).toBeUndefined();
  });

  it('sends the question without the spaces around it', () => {
    expect(config.toPayload({ ...valid, question: '  Is it registered?  ' }).question).toBe(
      'Is it registered?'
    );
  });

  it('calls the collection "FAQs", not "faqs"', () => {
    expect(config.plural).toBe('FAQs');
  });

  it('filters by the property types the site lists, and names the tied one', () => {
    const filter = config.filters.find((entry) => entry.key === 'propertyTypeId');
    expect(filter.options).toEqual([{ value: '11', label: 'Office Spaces' }]);
    expect(faqsConfig({ propertyTypes: [] }).filters.some((f) => f.key === 'propertyTypeId')).toBe(
      false
    );
  });

  it('reads an answer by its words', () => {
    expect(stripHtml('<p>Stamp duty &amp; registration</p><ul><li></li></ul>')).toBe(
      'Stamp duty & registration'
    );
  });
});
