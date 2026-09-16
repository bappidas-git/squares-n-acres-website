import { screen } from '@testing-library/react';

import TeamSection from '../TeamSection';
import renderWith from '../../../../test-utils';

/** §6.9 team members, trimmed to what the cards read. */
const FULL = {
  id: 1,
  name: 'Anita Rao',
  slug: 'anita-rao',
  designation: 'Senior Advisor',
  phone: '9880000021',
  whatsapp: '9880000021',
  email: 'anita@squaresnacres.com',
  photoUrl: 'https://example.test/anita.jpg',
  reraId: 'PRM/KA/RERA/0000/000/AG/000000',
  socialLinks: { linkedin: 'https://linkedin.example.test/in/anita' },
  isActive: true,
  showOnAbout: true,
};

const BARE = {
  id: 2,
  name: 'Ravi Kumar',
  slug: 'ravi-kumar',
  designation: 'Advisor',
  phone: null,
  whatsapp: null,
  email: null,
  photoUrl: null,
  reraId: null,
  socialLinks: {},
  isActive: true,
  showOnAbout: true,
};

describe('TeamSection', () => {
  it('renders a card per member with the name, the role and the registration', () => {
    renderWith(<TeamSection items={[FULL]} title="Our team" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Our team' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Anita Rao' })).toBeInTheDocument();
    expect(screen.getByText('Senior Advisor')).toBeInTheDocument();
    expect(screen.getByText(/PRM\/KA\/RERA/)).toBeInTheDocument();
    expect(screen.getByAltText('Anita Rao')).toHaveAttribute(
      'src',
      'https://example.test/anita.jpg'
    );
  });

  it('turns every contact detail into a way to use it', () => {
    renderWith(<TeamSection items={[FULL]} />);

    expect(screen.getByRole('link', { name: 'Call Anita Rao' })).toHaveAttribute(
      'href',
      'tel:+919880000021'
    );
    expect(screen.getByRole('link', { name: 'E-mail Anita Rao' })).toHaveAttribute(
      'href',
      'mailto:anita@squaresnacres.com'
    );
    expect(screen.getByRole('link', { name: 'Anita Rao on LinkedIn' })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
  });

  it('draws initials for a member without a photograph', () => {
    renderWith(<TeamSection items={[BARE]} />);

    expect(screen.getByText('RK')).toBeInTheDocument();
    expect(screen.queryByAltText('Ravi Kumar')).not.toBeInTheDocument();
  });

  it('shows no contact row when there is nothing to put in it', () => {
    renderWith(<TeamSection items={[BARE]} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Ravi Kumar' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves out a member who is no longer active', () => {
    renderWith(<TeamSection items={[FULL, { ...BARE, isActive: false }]} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Anita Rao' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ravi Kumar' })).not.toBeInTheDocument();
  });

  it('renders nothing at all when the team is empty', () => {
    const { container } = renderWith(<TeamSection items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
