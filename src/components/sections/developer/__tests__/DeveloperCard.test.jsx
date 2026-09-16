import { screen } from '@testing-library/react';

import DeveloperCard from '../DeveloperCard';
import renderWith from '../../../../test-utils';

/** A §6.5 developer, trimmed to what the card reads. */
const developer = {
  id: 1,
  name: 'Aurelia Estates',
  slug: 'aurelia-estates',
  logoUrl: 'https://example.test/aurelia-logo.png',
  shortDescription: 'Mid-rise gated apartment projects across east Bengaluru.',
  propertyCount: 12,
  isFeatured: true,
};

describe('DeveloperCard', () => {
  it('renders the name, the project count, the summary and the featured badge', () => {
    renderWith(<DeveloperCard developer={developer} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Aurelia Estates' })).toBeInTheDocument();
    expect(screen.getByText('12 projects')).toBeInTheDocument();
    expect(
      screen.getByText('Mid-rise gated apartment projects across east Bengaluru.')
    ).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('links to the builder page', () => {
    renderWith(<DeveloperCard developer={developer} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/builders/aurelia-estates');
  });

  it('shows the logo as decoration — the heading already names the builder', () => {
    renderWith(<DeveloperCard developer={developer} />);

    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.test/aurelia-logo.png');
  });

  it('keeps the logo box and draws the initials when there is no logo', () => {
    renderWith(<DeveloperCard developer={{ ...developer, logoUrl: null }} />);

    expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();
    expect(screen.getByText('AE')).toBeInTheDocument();
    // Never the site's own monogram: this is somebody else's box (§2.2).
    expect(screen.queryByTestId('lazy-image-monogram')).toBeNull();
  });

  it('lists a builder with nothing on the site, and says so', () => {
    renderWith(<DeveloperCard developer={{ ...developer, propertyCount: 0 }} />);

    expect(screen.getByText('0 projects')).toBeInTheDocument();
  });

  it('says "1 project" rather than "1 projects"', () => {
    renderWith(<DeveloperCard developer={{ ...developer, propertyCount: 1 }} />);

    expect(screen.getByText('1 project')).toBeInTheDocument();
  });

  it('leaves out the summary, the count and the badge a developer does not carry', () => {
    renderWith(
      <DeveloperCard
        developer={{
          id: 2,
          name: 'Trident Habitat',
          slug: 'trident-habitat',
          shortDescription: '',
          propertyCount: undefined,
          isFeatured: false,
        }}
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Trident Habitat' })).toBeInTheDocument();
    expect(screen.queryByText(/project/)).not.toBeInTheDocument();
    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('drops the summary in the compact variant the home row uses', () => {
    renderWith(<DeveloperCard developer={developer} variant="compact" />);

    expect(screen.getByRole('heading', { level: 3, name: 'Aurelia Estates' })).toBeInTheDocument();
    expect(screen.getByText('12 projects')).toBeInTheDocument();
    expect(
      screen.queryByText('Mid-rise gated apartment projects across east Bengaluru.')
    ).not.toBeInTheDocument();
  });

  it('renders nothing without a record', () => {
    const { container } = renderWith(<DeveloperCard developer={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
