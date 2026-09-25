import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import ImageGalleryEditor, {
  coverAfterRemoval,
  parseUrlList,
} from '../components/ImageGalleryEditor';
import { makeImage, resetTmpIds } from '../initialState';

/** The gallery, wired the way `MediaTab` wires it. */
function Harness({ initial = [], errors = {}, altHint, disabled = false, onMoveSpy }) {
  const [images, setImages] = useState(initial);

  return (
    <>
      <ImageGalleryEditor
        images={images}
        errors={errors}
        altHint={altHint}
        disabled={disabled}
        onAdd={(added) =>
          setImages((current) => [
            ...current,
            ...added.map((image, offset) =>
              makeImage({
                url: image.url,
                alt: image.alt ?? '',
                caption: image.caption ?? '',
                isCover: current.length === 0 && offset === 0,
              })
            ),
          ])
        }
        onUpdate={(id, patch) =>
          setImages((current) =>
            current.map((image) => (image.id === id ? { ...image, ...patch } : image))
          )
        }
        onRemove={(id) =>
          setImages((current) => {
            const promoted = coverAfterRemoval(current, id);
            return current
              .filter((image) => image.id !== id)
              .map((image) => (image.id === promoted ? { ...image, isCover: true } : image));
          })
        }
        onMove={(from, to) => {
          onMoveSpy?.(from, to);
          setImages((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          });
        }}
        onSetCover={(id) =>
          setImages((current) => current.map((image) => ({ ...image, isCover: image.id === id })))
        }
      />
      <output data-testid="images">{JSON.stringify(images)}</output>
    </>
  );
}

const stored = () => JSON.parse(screen.getByTestId('images').textContent);

const gallery = () => {
  resetTmpIds();
  return [
    makeImage({ url: 'https://example.com/a.jpg', alt: 'Living room', isCover: true }),
    makeImage({ url: 'https://example.com/b.jpg', alt: 'Kitchen' }),
    makeImage({ url: 'https://example.com/c.jpg', alt: '' }),
  ];
};

describe('parseUrlList', () => {
  it('takes one URL per line and keeps the order', () => {
    expect(parseUrlList('https://a.jpg\nhttps://b.jpg\n\n  https://c.jpg  ')).toEqual([
      'https://a.jpg',
      'https://b.jpg',
      'https://c.jpg',
    ]);
  });

  it('skips what the gallery already holds, and its own repeats', () => {
    expect(parseUrlList('https://a.jpg\nhttps://b.jpg\nhttps://b.jpg', ['https://a.jpg'])).toEqual([
      'https://b.jpg',
    ]);
  });

  it('is empty for an empty paste', () => {
    expect(parseUrlList('   \n  ')).toEqual([]);
    expect(parseUrlList(null)).toEqual([]);
  });

  it('keeps the commas of a Cloudinary transformation inside one address', () => {
    const url =
      'https://res.cloudinary.com/demo/image/upload/w_1600,h_900,c_fill/v1/properties/lobby.jpg';
    expect(parseUrlList(`${url}\nhttps://b.jpg`)).toEqual([url, 'https://b.jpg']);
  });
});

describe('the counters', () => {
  it('counts the images and the ones nobody has described', () => {
    renderWith(<Harness initial={gallery()} />);
    expect(screen.getByTestId('gallery-counts')).toHaveTextContent('3 images · 1 missing alt');
  });

  it('says so when every image is described', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.type(screen.getAllByLabelText(/^Alt text/)[2], 'Balcony');
    expect(screen.getByTestId('gallery-counts')).toHaveTextContent('every image described');
  });

  it('invites the first photograph when there is none', () => {
    renderWith(<Harness />);
    expect(screen.getByTestId('gallery-counts')).toHaveTextContent('0 images');
    expect(screen.getByText(/The first one becomes the cover/)).toBeInTheDocument();
  });
});

describe('the cover', () => {
  it('is one radio, and choosing another moves it', async () => {
    renderWith(<Harness initial={gallery()} />);

    const radios = screen.getAllByRole('radio', { name: 'Cover image' });
    expect(radios).toHaveLength(3);
    expect(radios[0]).toBeChecked();

    await userEvent.click(radios[2]);

    expect(stored().map((image) => image.isCover)).toEqual([false, false, true]);
    expect(screen.getAllByRole('radio', { name: 'Cover image' })[2]).toBeChecked();
  });

  it('is promoted to the first image left when the cover is removed', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove image 1' }));

    const left = stored();
    expect(left).toHaveLength(2);
    expect(left[0].url).toBe('https://example.com/b.jpg');
    expect(left[0].isCover).toBe(true);
  });

  it('is left where it is when another image is removed', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove image 2' }));

    const left = stored();
    expect(left).toHaveLength(2);
    expect(left[0].isCover).toBe(true);
    expect(left[1].isCover).toBe(false);
  });
});

describe('coverAfterRemoval', () => {
  it('names nobody when the row going away is not the cover', () => {
    const images = gallery();
    expect(coverAfterRemoval(images, images[1].id)).toBeNull();
  });

  it('names the first row left when it is', () => {
    const images = gallery();
    expect(coverAfterRemoval(images, images[0].id)).toBe(images[1].id);
  });

  it('names nobody when the last image goes', () => {
    resetTmpIds();
    const only = [makeImage({ url: 'https://example.com/a.jpg', isCover: true })];
    expect(coverAfterRemoval(only, only[0].id)).toBeNull();
  });
});

describe('alt text', () => {
  it('is marked required and carries the validator message', () => {
    renderWith(
      <Harness
        initial={gallery()}
        errors={{
          'images.2.alt': 'Describe this image — screen readers and search engines read it.',
        }}
      />
    );

    const alts = screen.getAllByLabelText(/^Alt text/);
    expect(alts[2]).toBeRequired();
    expect(alts[2]).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Describe this image');
  });

  it('suggests the SEO focus keyword when there is one', () => {
    const { unmount } = renderWith(<Harness initial={gallery()} />);
    expect(screen.getAllByText(/Describe what is shown/)[0]).toBeInTheDocument();
    unmount();

    renderWith(<Harness initial={gallery()} altHint="3 bhk apartment in whitefield" />);
    expect(
      screen.getAllByText('Describe what is shown. Use: 3 bhk apartment in whitefield')
    ).toHaveLength(3);
  });

  it('writes what is typed back to the row', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.type(screen.getAllByLabelText(/^Alt text/)[2], 'Balcony view');
    expect(stored()[2].alt).toBe('Balcony view');
  });

  it('prints a caption that is too long against the caption', () => {
    renderWith(
      <Harness
        initial={gallery()}
        errors={{ 'images.1.caption': 'Keep the caption to 300 characters.' }}
      />
    );

    expect(screen.getAllByLabelText('Caption')[1]).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Keep the caption to 300 characters.');
  });
});

describe('a message about the gallery as a whole', () => {
  it('is printed above the photographs, where a failed save can focus it', () => {
    renderWith(
      <Harness
        initial={gallery().map((image) => ({ ...image, isCover: false }))}
        errors={{ images: 'Choose which photograph is the cover.' }}
      />
    );

    const message = screen.getByRole('alert');
    expect(message).toHaveTextContent('Choose which photograph is the cover.');
    // Keyed `images`, it used to be counted on the Media badge and shown nowhere.
    expect(message).toHaveAttribute('tabindex', '-1');
  });

  it('is absent while there is nothing to say', () => {
    renderWith(<Harness initial={gallery()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('reordering', () => {
  it('moves an image later and back with the buttons', async () => {
    const onMoveSpy = jest.fn();
    renderWith(<Harness initial={gallery()} onMoveSpy={onMoveSpy} />);

    await userEvent.click(screen.getByRole('button', { name: 'Move image 1 later' }));

    expect(onMoveSpy).toHaveBeenCalledWith(0, 1);
    expect(stored().map((image) => image.url)).toEqual([
      'https://example.com/b.jpg',
      'https://example.com/a.jpg',
      'https://example.com/c.jpg',
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Move image 2 earlier' }));
    expect(stored().map((image) => image.url)).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
      'https://example.com/c.jpg',
    ]);
  });

  it('cannot move the first image earlier or the last one later', () => {
    renderWith(<Harness initial={gallery()} />);

    expect(screen.getByRole('button', { name: 'Move image 1 earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move image 3 later' })).toBeDisabled();
  });

  it('announces the move for a screen reader', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Move image 1 later' }));
    expect(screen.getByRole('status', { name: 'Gallery order' })).toHaveTextContent(
      'Living room moved to position 2 of 3.'
    );
  });

  it('keeps the cover with the image it belongs to', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Move image 1 later' }));
    const moved = stored();
    expect(moved[1].url).toBe('https://example.com/a.jpg');
    expect(moved[1].isCover).toBe(true);
  });
});

describe('adding images', () => {
  it('adds one URL and makes the first one the cover', async () => {
    renderWith(<Harness />);

    await userEvent.type(screen.getByLabelText('Add an image'), 'https://example.com/new.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    const images = stored();
    expect(images).toHaveLength(1);
    expect(images[0].url).toBe('https://example.com/new.jpg');
    expect(images[0].isCover).toBe(true);
    expect(screen.getByLabelText('Add an image')).toHaveValue('');
  });

  it('adds a pasted list, skipping what is already there', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add multiple URLs' }));
    await userEvent.type(
      screen.getByLabelText('One URL per line'),
      'https://example.com/a.jpg{enter}https://example.com/d.jpg{enter}https://example.com/e.jpg'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add these images' }));

    expect(stored().map((image) => image.url)).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
      'https://example.com/c.jpg',
      'https://example.com/d.jpg',
      'https://example.com/e.jpg',
    ]);
    expect(screen.queryByLabelText('One URL per line')).not.toBeInTheDocument();
  });
});

describe('a read-only form (§7)', () => {
  it('disables every control', () => {
    renderWith(<Harness initial={gallery()} disabled />);

    expect(screen.getAllByLabelText(/^Alt text/)[0]).toBeDisabled();
    expect(screen.getAllByRole('radio', { name: 'Cover image' })[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove image 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move image 1 later' })).toBeDisabled();
  });
});

describe('adding by address (QA-62)', () => {
  it('refuses text that is not an address, rather than adding a broken row', async () => {
    // Chrome keeps the spaces of "not a url" in a URL box, and the gallery used
    // to split them into three rows; jsdom strips them, so the one-word case
    // is what this test can type — the refusal is the same.
    renderWith(<Harness initial={gallery()} />);

    await userEvent.type(screen.getByLabelText('Add an image'), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(stored()).toHaveLength(3);
    expect(
      screen.getByText('Enter the address of a photograph, starting with http:// or https://.')
    ).toBeInTheDocument();
  });

  it('says so when the photograph is already in the gallery', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.type(screen.getByLabelText('Add an image'), 'https://example.com/a.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(stored()).toHaveLength(3);
    expect(screen.getByText('That photograph is already in the gallery.')).toBeInTheDocument();
  });

  it('adds an address, empties the box and forgets the message', async () => {
    renderWith(<Harness initial={gallery()} />);
    const box = screen.getByLabelText('Add an image');

    await userEvent.type(box, 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.clear(box);
    await userEvent.type(box, 'https://example.com/d.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(stored().map((image) => image.url)).toContain('https://example.com/d.jpg');
    expect(box).toHaveValue('');
    expect(screen.queryByText(/Enter the address of a photograph/)).not.toBeInTheDocument();
  });

  it('adds the addresses of a pasted list and keeps the lines that are not one', async () => {
    renderWith(<Harness initial={gallery()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add multiple URLs' }));
    await userEvent.type(
      screen.getByLabelText('One URL per line'),
      'https://example.com/e.jpg{enter}not-a-url{enter}https://example.com/f.jpg'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add these images' }));

    expect(stored().map((image) => image.url)).toEqual(
      expect.arrayContaining(['https://example.com/e.jpg', 'https://example.com/f.jpg'])
    );
    expect(stored()).toHaveLength(5);
    expect(screen.getByLabelText('One URL per line')).toHaveValue('not-a-url');
    expect(
      screen.getByText('This line is not the address of a photograph — fix or remove it.')
    ).toBeInTheDocument();
  });
});
