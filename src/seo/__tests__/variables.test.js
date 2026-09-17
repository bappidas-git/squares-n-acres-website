import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import {
  buildVariables,
  cleanTitle,
  listVariables,
  resolveTemplate,
  resolveTitleTemplate,
  templateKeyFor,
} from '../variables';

const context = { ...masterData, seoSettings, now: '2026-09-17T00:00:00.000Z' };

describe('cleanTitle', () => {
  it('removes an unresolved variable', () => {
    expect(cleanTitle('%bhk% Apartment')).toBe('Apartment');
  });

  it('clears the punctuation an unresolved variable leaves behind (§7)', () => {
    expect(cleanTitle('– | Squares N Acres')).toBe('Squares N Acres');
  });

  it('closes the gap a missing locality leaves', () => {
    expect(cleanTitle('Properties in , Bengaluru')).toBe('Properties in Bengaluru');
  });

  it('collapses a doubled separator and double spaces', () => {
    expect(cleanTitle('A  title | | Squares N Acres')).toBe('A title | Squares N Acres');
  });

  it('leaves a title that is already clean alone', () => {
    expect(cleanTitle('3 BHK Apartment in Whitefield | Squares N Acres')).toBe(
      '3 BHK Apartment in Whitefield | Squares N Acres'
    );
  });

  it('answers an empty string for nothing', () => {
    expect(cleanTitle(null)).toBe('');
  });
});

describe('resolveTemplate', () => {
  it('fills the variables it is given', () => {
    expect(
      resolveTemplate('%title% %sep% %sitename%', {
        title: 'About us',
        sep: '|',
        sitename: 'Squares N Acres',
      })
    ).toBe('About us | Squares N Acres');
  });

  it('is not case-sensitive about a variable name', () => {
    expect(resolveTemplate('%Title%', { title: 'Works' })).toBe('Works');
  });

  it('removes a variable that resolved to nothing and cleans up after it', () => {
    expect(
      resolveTemplate('%bhk% %propertytype% in %locality%, %city% – %price% %sep% %sitename%', {
        bhk: '',
        propertytype: 'Apartment',
        locality: '',
        city: 'Bengaluru',
        price: '',
        sep: '|',
        sitename: 'Squares N Acres',
      })
    ).toBe('Apartment in Bengaluru | Squares N Acres');
  });

  it('removes a variable this build does not know', () => {
    expect(resolveTemplate('%nonsense% Squares N Acres')).toBe('Squares N Acres');
  });

  it('answers an empty string when everything resolves to nothing', () => {
    expect(resolveTemplate('%a% %b%', { a: '', b: '' })).toBe('');
  });
});

describe('buildVariables', () => {
  it('reads a property', () => {
    const vars = buildVariables('property', property, context);
    expect(vars).toMatchObject({
      title: property.title,
      bhk: '3 BHK',
      listingtype: 'for Sale',
      locality: 'Whitefield',
      city: 'Bengaluru',
      price: '₹1.24 Cr',
      area: '1,650 sq ft',
      status: 'Ready to Move',
      projectname: 'Lakeview Heights',
      propertytype: 'Apartments',
      developer: 'Aurelia Estates',
      sitename: 'Squares N Acres',
      sep: '|',
      currentyear: '2026',
    });
  });

  it('leaves the configuration empty for land and commercial space (§9.5)', () => {
    const plot = { ...property, segment: 'land', configuration: { bedrooms: 0 } };
    expect(buildVariables('property', plot, context).bhk).toBe('');
  });

  it('says "Price on Request" when that is what the record says', () => {
    const onRequest = { ...property, pricing: { ...property.pricing, priceOnRequest: true } };
    expect(buildVariables('property', onRequest, context).price).toBe('Price on Request');
  });

  it('prices a rental per month', () => {
    const rental = {
      ...property,
      listingType: 'rent',
      pricing: { ...property.pricing, price: null, rentPerMonth: 45000 },
    };
    expect(buildVariables('property', rental, context).price).toBe('₹45,000/month');
  });

  it('reads an article', () => {
    const vars = buildVariables('article', article, context);
    expect(vars.title).toBe(article.title);
    expect(vars.category).toBe('Legal & RERA');
    expect(vars.author).toBe('Legal Desk');
    expect(vars.excerpt).toBe(article.excerpt);
    expect(vars.date).toMatch(/\d{2} \w{3} \d{4}/);
  });

  it('reads a locality and a developer under their own names', () => {
    expect(buildVariables('locality', locality, context)).toMatchObject({
      title: 'Whitefield',
      locality: 'Whitefield',
      city: 'Bengaluru',
    });
    expect(buildVariables('developer', developer, context).developer).toBe('Aurelia Estates');
  });

  it('answers every variable, empty, for an empty record', () => {
    const vars = buildVariables('property', {}, context);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(22);
    expect(vars.price).toBe('');
    expect(vars.locality).toBe('');
    expect(vars.title).toBe('');
  });

  it('numbers a page from two upwards', () => {
    expect(buildVariables('page', {}, { ...context, page: 1 }).page).toBe('');
    expect(buildVariables('page', {}, { ...context, page: 2 }).page).toBe('Page 2');
  });
});

describe('resolveTitleTemplate', () => {
  it('uses the type template of the settings', () => {
    expect(templateKeyFor('property')).toBe('property');
    expect(templateKeyFor('propertyType')).toBe('default');

    expect(resolveTitleTemplate('property', property, context)).toBe(
      '3 BHK Apartments for Sale in Whitefield, Bengaluru – ₹1.24 Cr | Squares N Acres'
    );
  });

  it('falls back to the default template for a type that has none', () => {
    expect(resolveTitleTemplate('propertyType', { name: 'Apartments' }, context)).toBe(
      'Apartments | Squares N Acres'
    );
  });

  it('resolves a locality title', () => {
    expect(resolveTitleTemplate('locality', locality, context)).toBe(
      'Properties in Whitefield, Bengaluru – Buy, Rent & Invest | Squares N Acres'
    );
  });
});

describe('listVariables', () => {
  it('offers every §9.5 variable to the insert menu', () => {
    const tokens = listVariables().map((variable) => variable.token);
    for (const token of [
      '%title%',
      '%sitename%',
      '%sep%',
      '%tagline%',
      '%excerpt%',
      '%category%',
      '%author%',
      '%date%',
      '%modified%',
      '%currentyear%',
      '%page%',
      '%propertytype%',
      '%listingtype%',
      '%bhk%',
      '%locality%',
      '%city%',
      '%price%',
      '%area%',
      '%developer%',
      '%status%',
      '%projectname%',
      '%count%',
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it('answers a copy each time, so the menu cannot edit the catalogue', () => {
    listVariables()[0].label = 'changed';
    expect(listVariables()[0].label).toBe('Title');
  });
});
