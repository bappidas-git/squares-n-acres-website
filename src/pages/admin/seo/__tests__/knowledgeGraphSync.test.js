/**
 * The knowledge graph against Site settings (prompt 51): Site settings read as
 * a knowledge graph, the fields the two put differently, and the copy.
 */

import fs from 'fs';
import path from 'path';

import {
  copyFromSiteSettings,
  daysOf,
  graphFromSiteSettings,
  graphMismatches,
  hoursOf,
  listOf,
  openingHoursOf,
} from '../settings-tabs/knowledgeGraphSync';

const SEED = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'db.json'), 'utf-8')
);
const SITE = SEED.siteSettings;
const GRAPH = SEED.seoSettings.knowledgeGraph;

const withSite = ({ general = {}, social = {} } = {}) => ({
  ...SITE,
  general: { ...SITE.general, ...general },
  social: { ...SITE.social, ...social },
});

describe('working hours as opening hours', () => {
  it.each([
    ['Monday to Saturday', 'Mo-Sa'],
    ['Mon – Fri', 'Mo-Fr'],
    ['Sat & Sun', 'Sa,Su'],
    ['Saturday and Sunday', 'Sa,Su'],
    ['Monday-Friday, Saturday', 'Mo-Fr,Sa'],
    ['Sunday', 'Su'],
    ['Weekdays', 'Mo-Fr'],
    ['Daily', 'Mo-Su'],
    ['Public holidays', null],
    ['', null],
  ])('reads the days “%s” as %s', (text, expected) => {
    expect(daysOf(text)).toBe(expected);
  });

  it.each([
    ['9:30 am – 6:30 pm', '09:30-18:30'],
    ['10 am to 7 pm', '10:00-19:00'],
    ['10:00-19:00', '10:00-19:00'],
    ['10 – 7', '10:00-19:00'],
    ['9.30am-1pm', '09:30-13:00'],
    ['12 pm - 5 pm', '12:00-17:00'],
    ['Open 24 hours', '00:00-23:59'],
    ['Closed', 'closed'],
    ['By appointment', null],
    ['9 am', null],
  ])('reads the hours “%s” as %s', (text, expected) => {
    expect(hoursOf(text)).toBe(expected);
  });

  it('lists what has a form, leaves a closed day out, and names what has none', () => {
    expect(
      openingHoursOf([
        { days: 'Monday to Saturday', hours: '9:30 am – 6:30 pm' },
        { days: 'Sunday', hours: 'By appointment' },
        { days: 'Public holidays', hours: 'Closed' },
      ])
    ).toEqual({ hours: ['Mo-Sa 09:30-18:30'], leftOut: ['Sunday: By appointment'] });
  });
});

describe('Site settings as a knowledge graph', () => {
  it('reads the seed as the seeded graph says it', () => {
    const site = graphFromSiteSettings(SITE);
    expect(site).toMatchObject({
      name: GRAPH.name,
      phone: GRAPH.phone,
      email: GRAPH.email,
      address: GRAPH.address,
      geo: GRAPH.geo,
      openingHours: GRAPH.openingHours,
      sameAs: [],
    });
  });

  it('finds nothing to say about the seed', () => {
    expect(graphMismatches(GRAPH, SITE)).toEqual([]);
  });

  it('says nothing without Site settings to compare with', () => {
    expect(graphMismatches(GRAPH, null)).toEqual([]);
    expect(graphMismatches(GRAPH, {})).toEqual([]);
  });

  it('names each field that differs, in the order the tab shows them', () => {
    const site = withSite({
      general: {
        siteName: 'Squares and Acres',
        contactEmail: 'hello@squaresnacres.com',
        address: { ...SITE.general.address, pincode: '560002' },
      },
      social: { instagram: 'https://www.instagram.com/squaresnacres' },
    });
    expect(graphMismatches(GRAPH, site).map((field) => field.label)).toEqual([
      'Name',
      'E-mail',
      'Address',
      'Profiles',
    ]);
  });

  it('does not call a number written with spaces a different number', () => {
    expect(
      graphMismatches(GRAPH, withSite({ general: { contactPhone: '+91 98000 00001' } }))
    ).toEqual([]);
    expect(
      graphMismatches(GRAPH, withSite({ general: { contactEmail: 'INFO@squaresnacres.com' } }))
    ).toEqual([]);
  });
});

describe('copying from Site settings', () => {
  it('fills the fields that differ and says which', () => {
    const site = withSite({
      general: {
        contactPhone: '+919800000099',
        address: { ...SITE.general.address, line2: 'MG Road' },
      },
    });
    const { graph, copied, leftOut } = copyFromSiteSettings(GRAPH, site);

    expect(copied).toEqual(['Phone', 'Address']);
    expect(graph.phone).toBe('+919800000099');
    expect(graph.address.streetAddress).toBe('[Office address to be provided], MG Road');
    expect(graph.address.addressCountry).toBe('IN');
    expect(leftOut).toEqual(['Sunday: By appointment']);
    // What Site settings do not hold stays as the graph had it.
    expect(graph.description).toBe(GRAPH.description);
    expect(graph.areaServed).toEqual(GRAPH.areaServed);
    expect(graphMismatches(graph, site)).toEqual([]);
  });

  it('adds profiles to the list rather than replacing it', () => {
    const graph = { ...GRAPH, sameAs: ['https://g.page/squaresnacres'] };
    const site = withSite({
      social: {
        facebook: 'https://www.facebook.com/squaresnacres',
        linkedin: 'https://www.linkedin.com/company/squaresnacres/',
      },
    });
    const copied = copyFromSiteSettings(
      { ...graph, sameAs: [...graph.sameAs, 'https://www.linkedin.com/company/squaresnacres'] },
      site
    );

    expect(copied.graph.sameAs).toEqual([
      'https://g.page/squaresnacres',
      'https://www.linkedin.com/company/squaresnacres',
      'https://www.facebook.com/squaresnacres',
    ]);
  });

  it('leaves a field alone that Site settings leave empty', () => {
    const site = withSite({ general: { contactEmail: '', workingHours: [] } });
    const { graph, copied } = copyFromSiteSettings(
      { ...GRAPH, email: 'desk@squaresnacres.com' },
      site
    );

    expect(copied).toEqual([]);
    expect(graph.email).toBe('desk@squaresnacres.com');
    expect(graph.openingHours).toEqual(GRAPH.openingHours);
  });

  it('copies nothing without Site settings', () => {
    expect(copyFromSiteSettings(GRAPH, null)).toEqual({ graph: GRAPH, copied: [], leftOut: [] });
  });
});

describe('listOf', () => {
  it('joins labels as a sentence says them', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['Name'])).toBe('Name');
    expect(listOf(['Name', 'Phone'])).toBe('Name and Phone');
    expect(listOf(['Name', 'Phone', 'Address'])).toBe('Name, Phone and Address');
  });
});
