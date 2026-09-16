import { fireEvent, screen } from '@testing-library/react';

import SectionNav, { sectionElementId } from '../SectionNav';
import { getVisibleSections } from '../../../../utils/propertySections';
import renderWith from '../../../../test-utils';

/**
 * A §6.1 record with three sections' worth of data, one of them switched off
 * by the editor and one with nothing behind it.
 */
const property = {
  id: 1,
  listingType: 'sale',
  constructionStatus: 'ready-to-move',
  description: 'A long description of the apartment.',
  highlights: ['Corner unit', 'East facing'],
  amenityIds: [1, 2],
  images: [{ id: 1, url: 'https://example.test/a.jpg' }],
  videoUrl: 'https://www.youtube.com/watch?v=abc',
  faqs: [],
  pricing: { price: 12400000 },
  location: { localityId: 1 },
  similarPropertyIds: [],
  sectionVisibility: { video: false },
};

describe('SectionNav', () => {
  it('renders one chip per visible section, in page order', () => {
    const sections = getVisibleSections(property, {
      banksAvailable: false,
      similarAvailable: false,
    });

    renderWith(<SectionNav sections={sections} />);

    const chips = screen.getAllByRole('link');
    expect(chips.map((chip) => chip.textContent)).toEqual(sections.map((s) => s.label));
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Overview',
      'Highlights',
      'Amenities',
      'Location',
      'Enquiry form',
    ]);
  });

  it('leaves out a section the editor switched off and one with no data', () => {
    const sections = getVisibleSections(property, {
      banksAvailable: false,
      similarAvailable: false,
    });

    renderWith(<SectionNav sections={sections} />);

    // `video` is switched off although the listing carries a video URL…
    expect(screen.queryByRole('link', { name: 'Video' })).not.toBeInTheDocument();
    // …and `faqs` is switched on with nothing behind it.
    expect(screen.queryByRole('link', { name: 'FAQs' })).not.toBeInTheDocument();
    // The finance section needs an active lender (§6.6).
    expect(screen.queryByRole('link', { name: 'Finance & EMI' })).not.toBeInTheDocument();
  });

  it('adds the finance and similar chips once the context allows them', () => {
    const sections = getVisibleSections(property, { banksAvailable: true, similarAvailable: true });

    renderWith(<SectionNav sections={sections} />);

    expect(screen.getByRole('link', { name: 'Finance & EMI' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Similar properties' })).toBeInTheDocument();
  });

  it('points each chip at its section wrapper and marks the first one current', () => {
    renderWith(
      <SectionNav
        sections={[
          { key: 'overview', label: 'Overview' },
          { key: 'amenities', label: 'Amenities' },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '#section-overview'
    );
    expect(screen.getByRole('link', { name: 'Amenities' })).toHaveAttribute(
      'href',
      '#section-amenities'
    );
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'true');
  });

  it('scrolls to the section and follows the click with the highlight', () => {
    const target = document.createElement('section');
    target.id = sectionElementId('amenities');
    document.body.append(target);
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo;

    renderWith(
      <SectionNav
        offset={72}
        sections={[
          { key: 'overview', label: 'Overview' },
          { key: 'amenities', label: 'Amenities' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: 'Amenities' }));

    expect(scrollTo).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Amenities' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');

    target.remove();
  });

  it('renders nothing when the listing shows no sections', () => {
    renderWith(<SectionNav sections={[]} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
