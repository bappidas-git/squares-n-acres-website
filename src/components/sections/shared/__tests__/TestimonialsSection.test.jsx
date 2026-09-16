import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TestimonialsSection, { isRenderable } from '../TestimonialsSection';
import renderWith from '../../../../test-utils';

/** §6.9 testimonials, trimmed to what the cards read. */
const REAL = {
  id: 1,
  name: 'Priya Sharma',
  designation: 'Home buyer',
  location: 'Whitefield, Bengaluru',
  rating: 5,
  message: 'They shortlisted four projects that matched our brief and said which had a risk.',
  avatarUrl: null,
  isFeatured: true,
  isActive: true,
  isSample: false,
};

const SAMPLE = { ...REAL, id: 2, name: 'Sample — A. Rao', isSample: true };
const INACTIVE = { ...REAL, id: 3, name: 'Withdrawn quote', isActive: false };

/** Runs `body` with `NODE_ENV` set to `value`, then puts the old one back. */
function withNodeEnv(value, body) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    body();
  } finally {
    process.env.NODE_ENV = previous;
  }
}

describe('TestimonialsSection', () => {
  it('renders a card per testimonial, with the name, the role and the rating', () => {
    renderWith(<TestimonialsSection items={[REAL]} title="What our clients say" />);

    expect(screen.getByRole('heading', { name: 'What our clients say' })).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Home buyer · Whitefield, Bengaluru')).toBeInTheDocument();
    expect(screen.getByText(REAL.message)).toBeInTheDocument();
    expect(screen.getByLabelText('5 out of 5')).toBeInTheDocument();
  });

  it('renders nothing at all when no testimonial survives the filtering', () => {
    const { container } = renderWith(<TestimonialsSection items={[INACTIVE]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('leaves out a testimonial that is no longer active', () => {
    renderWith(<TestimonialsSection items={[REAL, INACTIVE]} />);

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Withdrawn quote')).not.toBeInTheDocument();
  });

  describe('sample gating (D41)', () => {
    it('shows sample copy while the site is being built, under a chip that says so', () => {
      withNodeEnv('development', () => {
        renderWith(<TestimonialsSection items={[REAL, SAMPLE]} />);

        expect(screen.getByText('Sample — A. Rao')).toBeInTheDocument();
        expect(screen.getByText('Sample')).toBeInTheDocument();
      });
    });

    it('drops it from a production build', () => {
      withNodeEnv('production', () => {
        renderWith(<TestimonialsSection items={[REAL, SAMPLE]} />);

        expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
        expect(screen.queryByText('Sample — A. Rao')).not.toBeInTheDocument();
      });
    });

    it('hides the whole section when sample copy is all there was', () => {
      withNodeEnv('production', () => {
        const { container } = renderWith(<TestimonialsSection items={[SAMPLE]} />);

        expect(container).toBeEmptyDOMElement();
      });
    });

    it('answers the same question on its own', () => {
      withNodeEnv('production', () => {
        expect(isRenderable(REAL)).toBe(true);
        expect(isRenderable(SAMPLE)).toBe(false);
        expect(isRenderable(INACTIVE)).toBe(false);
      });
    });
  });

  describe('a long quote', () => {
    const LONG = {
      ...REAL,
      id: 4,
      message: 'We looked at flats for eight months. '.repeat(10).trim(),
    };

    it('offers "Read more" and opens the whole thing in a dialog', async () => {
      renderWith(<TestimonialsSection items={[LONG]} />);

      await userEvent.click(screen.getByRole('button', { name: /Read more/ }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: 'Priya Sharma' })).toBeInTheDocument();
      expect(within(dialog).getByText(LONG.message)).toBeInTheDocument();
    });

    it('does not offer it for a quote the card already shows whole', () => {
      renderWith(<TestimonialsSection items={[REAL]} />);

      expect(screen.queryByRole('button', { name: /Read more/ })).not.toBeInTheDocument();
    });
  });
});
