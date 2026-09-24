/**
 * What the three Pages screens share (QA-56): how a page's place in the header
 * reads, and how the list's search box reads an address.
 */

import { headerPlacementLabel, normaliseSearch } from '../pagesAdmin';

const MENUS = [
  { slug: 'company', name: 'Company', isActive: true, submenus: [{ slug: 'team', name: 'Team' }] },
  { slug: 'offers', name: 'Offers', isActive: false, submenus: [] },
];

describe('headerPlacementLabel', () => {
  it('names the menu, and the submenu when there is one', () => {
    expect(headerPlacementLabel({ showInHeader: true, headerMenu: 'company' }, MENUS)).toBe(
      'Company'
    );
    expect(
      headerPlacementLabel(
        { showInHeader: true, headerMenu: 'company', headerSubmenu: 'team' },
        MENUS
      )
    ).toBe('Company › Team');
  });

  it('says when the menu is hidden', () => {
    expect(headerPlacementLabel({ showInHeader: true, headerMenu: 'offers' }, MENUS)).toBe(
      'Offers (hidden)'
    );
  });

  it('falls back to the key of a menu it does not know, and the menu for a lost submenu', () => {
    expect(headerPlacementLabel({ showInHeader: true, headerMenu: 'ghost' }, MENUS)).toBe('ghost');
    expect(
      headerPlacementLabel(
        { showInHeader: true, headerMenu: 'company', headerSubmenu: 'gone' },
        MENUS
      )
    ).toBe('Company');
  });

  it('is empty for a page that is not in the header', () => {
    expect(headerPlacementLabel({ showInHeader: false, headerMenu: 'company' }, MENUS)).toBe('');
    expect(headerPlacementLabel({ showInHeader: true, headerMenu: null }, MENUS)).toBe('');
    expect(headerPlacementLabel(null, MENUS)).toBe('');
  });
});

describe('normaliseSearch', () => {
  it('leaves words alone', () => {
    expect(normaliseSearch('  home loan ')).toBe('home loan');
    expect(normaliseSearch('')).toBe('');
    expect(normaliseSearch(undefined)).toBe('');
  });

  it('reads an address as the list prints it', () => {
    expect(normaliseSearch('/buyer-assistance/home-loan')).toBe('buyer-assistance/home-loan');
    expect(normaliseSearch('/about/')).toBe('about');
  });

  it('reads an address copied from the browser', () => {
    expect(normaliseSearch('https://www.squaresnacres.com/contact?utm=x#form')).toBe('contact');
    expect(normaliseSearch('http://localhost:3000/privacy-policy')).toBe('privacy-policy');
  });

  it('reads the site root as the home page', () => {
    expect(normaliseSearch('/')).toBe('home');
    expect(normaliseSearch('https://www.squaresnacres.com/')).toBe('home');
  });
});
