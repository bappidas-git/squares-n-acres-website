/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   a `<source>` has no role and no accessible name, so the only way to assert
   what `Picture` offered the browser is to read the elements themselves. */
import { useLayoutEffect, useRef } from 'react';
import { fireEvent, screen } from '@testing-library/react';

import LazyImage, { DEFAULT_SIZES } from '../LazyImage';
import Picture from '../Picture';
import renderWith from '../../../test-utils';

const CLOUD = 'https://res.cloudinary.com/dn9gyaiik/image/upload';

/**
 * A picture the browser already holds — its HTTP cache on a reload, a preload
 * of the LCP image — answers `load` almost at once, before React has run the
 * effects of the render that drew it. A layout effect is the same moment. The
 * event is a bare DOM one: `fireEvent` wraps itself in `act()`, which settles
 * React's queue in an order no browser does.
 */
function LoadsAtOnce(props) {
  const box = useRef(null);
  useLayoutEffect(() => {
    box.current.querySelector('img').dispatchEvent(new Event('load'));
  }, []);
  return (
    <div ref={box}>
      <LazyImage {...props} />
    </div>
  );
}

describe('LazyImage', () => {
  it('fades the picture in once it has loaded', () => {
    renderWith(<LazyImage src="https://picsum.photos/seed/a/1200/800" alt="Whitefield" />);

    const image = screen.getByAltText('Whitefield');
    expect(image).not.toHaveClass('loaded');
    fireEvent.load(image);
    expect(image).toHaveClass('loaded');
  });

  it('shows a picture that loaded before its effects ran, as a cached one does', () => {
    renderWith(<LoadsAtOnce src="https://picsum.photos/seed/b/1200/800" alt="From the cache" />);

    expect(screen.getByAltText('From the cache')).toHaveClass('loaded');
    expect(screen.queryByTestId('lazy-image-placeholder')).not.toBeInTheDocument();
  });

  it('waits for a new picture when the src changes, and shows it when it loads', () => {
    const { rerender } = renderWith(<LazyImage src="/first.jpg" alt="Cover" />);
    const image = screen.getByAltText('Cover');
    fireEvent.load(image);
    expect(image).toHaveClass('loaded');

    rerender(<LazyImage src="/second.jpg" alt="Cover" />);
    expect(screen.getByAltText('Cover')).not.toHaveClass('loaded');
    fireEvent.load(screen.getByAltText('Cover'));
    expect(screen.getByAltText('Cover')).toHaveClass('loaded');
  });

  it('forgets a failure when the src changes', () => {
    const { rerender } = renderWith(<LazyImage src="/broken.jpg" alt="Cover" />);
    fireEvent.error(screen.getByAltText('Cover'));
    expect(screen.getByTestId('lazy-image-monogram')).toBeInTheDocument();

    rerender(<LazyImage src="/fixed.jpg" alt="Cover" />);
    expect(screen.queryByTestId('lazy-image-monogram')).not.toBeInTheDocument();
    fireEvent.load(screen.getByAltText('Cover'));
    expect(screen.getByAltText('Cover')).toHaveClass('loaded');
  });

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

  describe('a Cloudinary picture (§8.6)', () => {
    const src = `${CLOUD}/v1789465788/sna-logo_o09ugt.png`;

    it('builds the six widths, crops them to the box and blurs up', () => {
      renderWith(<LazyImage src={src} alt="Squares N Acres" ratio="16/9" />);

      const image = screen.getByAltText('Squares N Acres');
      const srcSet = image.getAttribute('srcset');

      expect(srcSet.split(', ')).toHaveLength(6);
      expect(srcSet).toContain(`${CLOUD}/f_auto,q_auto,w_320,h_180,c_fill,dpr_auto/`);
      expect(srcSet).toContain('1600w');
      expect(image).toHaveAttribute('sizes', DEFAULT_SIZES);
      // The `src` a browser without `srcset` falls back to is a variant too.
      expect(image).toHaveAttribute(
        'src',
        `${CLOUD}/f_auto,q_auto,w_960/v1789465788/sna-logo_o09ugt.png`
      );

      expect(screen.getByTestId('lazy-image')).toHaveStyle({
        '--blur': `url("${CLOUD}/f_auto,q_1,w_24,e_blur:200/v1789465788/sna-logo_o09ugt.png")`,
      });
    });

    it('takes the `sizes` its caller knows and its own widths', () => {
      renderWith(
        <LazyImage src={src} alt="Hero" ratio="21/9" sizes="100vw" widths={[640, 1280]} />
      );

      const image = screen.getByAltText('Hero');
      expect(image).toHaveAttribute('sizes', '100vw');
      expect(image.getAttribute('srcset').split(', ')).toHaveLength(2);
    });

    it('never crops an image that is fitted inside its box (§2.2)', () => {
      renderWith(<LazyImage src={src} alt="Logo" ratio="5/2" fit="contain" />);

      const srcSet = screen.getByAltText('Logo').getAttribute('srcset');
      expect(srcSet).not.toContain('c_fill');
      expect(srcSet).not.toContain('h_');
      expect(srcSet).toContain('f_auto,q_auto,w_320,dpr_auto');
    });

    it('merges onto a URL that already carries a crop rather than doubling /upload/', () => {
      const cropped = `${CLOUD}/c_crop,x_375,y_655,w_395,h_390/v1789465791/sna-icon.png`;
      renderWith(<LazyImage src={cropped} alt="Monogram" ratio="1" />);

      const srcSet = screen.getByAltText('Monogram').getAttribute('srcset');
      expect(srcSet).toContain('c_crop,x_375,y_655,w_395,h_390/f_auto,q_auto,w_320');
      expect(srcSet.match(/\/upload\//g)).toHaveLength(6);
    });

    it('loads the LCP image eagerly and asks for it first', () => {
      renderWith(<LazyImage src={src} alt="Property hero" priority />);

      const image = screen.getByAltText('Property hero');
      expect(image).toHaveAttribute('loading', 'eager');
      expect(image).toHaveAttribute('fetchpriority', 'high');
    });
  });

  describe('a picture from anywhere else', () => {
    it('is used exactly as given, with no srcSet and no blur', () => {
      renderWith(
        <LazyImage src="https://picsum.photos/seed/whitefield/1200/800" alt="Whitefield" />
      );

      const image = screen.getByAltText('Whitefield');
      expect(image).toHaveAttribute('src', 'https://picsum.photos/seed/whitefield/1200/800');
      expect(image).not.toHaveAttribute('srcset');
      expect(image).not.toHaveAttribute('sizes');
      expect(screen.getByTestId('lazy-image')).not.toHaveStyle({ '--blur': expect.anything() });
    });
  });
});

describe('Picture', () => {
  it('offers a different crop per breakpoint and keeps the fallback image', () => {
    renderWith(
      <Picture
        alt="Find your home in Bengaluru"
        ratio="21/9"
        sizes="100vw"
        priority
        src={`${CLOUD}/v1/hero-desktop.jpg`}
        sources={[
          { media: '(max-width: 599px)', src: `${CLOUD}/v1/hero-mobile.jpg`, ratio: '4/5' },
        ]}
      />
    );

    const image = screen.getByAltText('Find your home in Bengaluru');
    const source = image.closest('picture').querySelector('source');

    expect(source).toHaveAttribute('media', '(max-width: 599px)');
    expect(source.getAttribute('srcset')).toContain('hero-mobile.jpg');
    expect(source.getAttribute('srcset')).toContain('w_320,h_400,c_fill');
    expect(source).toHaveAttribute('sizes', '100vw');
    expect(image.getAttribute('srcset')).toContain('hero-desktop.jpg');
    expect(image).toHaveAttribute('loading', 'eager');
  });

  it('still art-directs a picture with no Cloudinary variants', () => {
    renderWith(
      <Picture
        alt="Whitefield"
        src="https://picsum.photos/seed/wide/1600/700"
        sources={[{ media: '(max-width: 599px)', src: 'https://picsum.photos/seed/tall/800/1000' }]}
      />
    );

    const source = screen.getByAltText('Whitefield').closest('picture').querySelector('source');
    expect(source).toHaveAttribute('srcset', 'https://picsum.photos/seed/tall/800/1000');
  });

  it('renders no <picture> when it has no sources to offer', () => {
    const { container } = renderWith(
      <Picture alt="Plain" src={`${CLOUD}/v1/plain.jpg`} sources={[]} />
    );

    expect(screen.getByAltText('Plain')).toBeInTheDocument();
    expect(container.querySelector('picture')).toBeNull();
  });
});
