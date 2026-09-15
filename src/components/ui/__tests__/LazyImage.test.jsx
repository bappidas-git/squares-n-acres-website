import { fireEvent, screen } from '@testing-library/react';

import LazyImage from '../LazyImage';
import renderWith from '../../../test-utils';

describe('LazyImage', () => {
  it('reserves the ratio box and lazy-loads with the given alt text', () => {
    renderWith(<LazyImage src="/a.jpg" alt="Lakeview Heights facade" ratio="16/9" />);

    const image = screen.getByAltText('Lakeview Heights facade');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(screen.getByTestId('lazy-image')).toHaveStyle({ '--ratio': '16/9' });
  });

  it('passes srcSet and sizes through', () => {
    renderWith(
      <LazyImage src="/a.jpg" alt="Plan" srcSet="/a-320.jpg 320w, /a-640.jpg 640w" sizes="50vw" />
    );
    const image = screen.getByAltText('Plan');
    expect(image).toHaveAttribute('srcset', '/a-320.jpg 320w, /a-640.jpg 640w');
    expect(image).toHaveAttribute('sizes', '50vw');
  });

  it('keeps the box and shows the monogram when the image fails', () => {
    renderWith(<LazyImage src="/missing.jpg" alt="Gone" ratio="4/3" />);

    expect(screen.queryByTestId('lazy-image-placeholder')).not.toBeInTheDocument();
    fireEvent.error(screen.getByAltText('Gone'));

    expect(screen.getByTestId('lazy-image')).toHaveStyle({ '--ratio': '4/3' });
    expect(screen.getByTestId('lazy-image-monogram')).toBeInTheDocument();
  });

  it('renders the placeholder when there is no src at all', () => {
    renderWith(<LazyImage src="" alt="" ratio="1" />);
    expect(screen.getByTestId('lazy-image')).toHaveStyle({ '--ratio': '1' });
    expect(screen.getByTestId('lazy-image-monogram')).toBeInTheDocument();
  });
});
