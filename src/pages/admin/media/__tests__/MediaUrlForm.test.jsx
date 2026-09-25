import { createPortal } from 'react-dom';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import mediaService from '../../../../services/mediaService';
import renderWith from '../../../../test-utils';
import { MediaUrlForm, URL_MAX_LENGTH, fieldErrorsOf } from '../MediaAddUrlDialog';

jest.mock('../../../../services/mediaService', () => ({
  __esModule: true,
  default: { create: jest.fn(), list: jest.fn() },
}));

/**
 * "Add by URL" (QA-63): Enter adds, an address already in the library or too
 * long for it is refused under its box, and a picture is measured first.
 */

const fill = async ({ url, alt = 'A photograph' }) => {
  fireEvent.change(screen.getByLabelText(/file address/i), { target: { value: url } });
  await userEvent.type(screen.getByLabelText(/alt text/i), alt);
};

beforeEach(() => {
  jest.clearAllMocks();
  mediaService.create.mockImplementation((body) => Promise.resolve({ data: { id: 9, ...body } }));
});

it('adds the file when Enter is pressed in a box', async () => {
  const onCreated = jest.fn();
  renderWith(<MediaUrlForm onCreated={onCreated} />);

  await fill({ url: 'https://example.com/lobby.jpg', alt: 'The lobby{enter}' });

  await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  expect(mediaService.create).toHaveBeenCalledTimes(1);
  expect(mediaService.create.mock.calls[0][0]).toMatchObject({
    url: 'https://example.com/lobby.jpg',
    alt: 'The lobby',
    type: 'image',
    format: 'jpg',
  });
});

it('does not submit the form of the field that opened it (QA-63)', async () => {
  // The picker is a portal inside, say, the property form: React bubbles the
  // inner form's submit to the outer one, which then saved the listing.
  const outer = jest.fn((event) => event.preventDefault());
  const onCreated = jest.fn();
  renderWith(
    <form onSubmit={outer}>
      {createPortal(<MediaUrlForm onCreated={onCreated} />, document.body)}
    </form>
  );

  await fill({ url: 'https://example.com/lobby.jpg', alt: 'The lobby{enter}' });
  await waitFor(() => expect(onCreated).toHaveBeenCalled());
  await userEvent.click(screen.getByRole('button', { name: /add to library/i }));

  expect(outer).not.toHaveBeenCalled();
});

it('says an address is already in the library, under the address', async () => {
  mediaService.create.mockRejectedValueOnce(
    new ApiError({
      status: 422,
      message: 'The given data was invalid.',
      errors: { url: ['The url has already been taken.'] },
    })
  );
  renderWith(<MediaUrlForm onCreated={() => {}} />);

  await fill({ url: 'https://picsum.photos/seed/sna-locality-whitefield/1600/900' });
  await userEvent.click(screen.getByRole('button', { name: /add to library/i }));

  expect(await screen.findByText('This address is already in the library.')).toBeInTheDocument();
  expect(screen.getByLabelText(/file address/i)).toHaveAttribute('aria-invalid', 'true');
});

it('refuses an address longer than the library keeps, before sending it', async () => {
  renderWith(<MediaUrlForm onCreated={() => {}} />);

  await fill({ url: `https://example.com/${'x'.repeat(URL_MAX_LENGTH)}.jpg` });
  await userEvent.click(screen.getByRole('button', { name: /add to library/i }));

  expect(await screen.findByText(/The library takes up to 500/)).toBeInTheDocument();
  expect(mediaService.create).not.toHaveBeenCalled();
});

describe('a picture’s size', () => {
  const RealImage = global.Image;

  beforeEach(() => {
    jest.useFakeTimers();
    // A picture that "loads" as soon as it is asked for, at 1600 × 900.
    global.Image = class {
      set src(value) {
        this.naturalWidth = 1600;
        this.naturalHeight = 900;
        setTimeout(() => this.onload?.(), 0);
      }
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    global.Image = RealImage;
  });

  it('is measured before the file is added, and sent with it', async () => {
    renderWith(<MediaUrlForm onCreated={() => {}} />);

    fireEvent.change(screen.getByLabelText(/file address/i), {
      target: { value: 'https://picsum.photos/seed/new/1600/900' },
    });
    fireEvent.change(screen.getByLabelText(/alt text/i), { target: { value: 'A photograph' } });
    // The address rests, then the picture behind it loads.
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    expect(screen.getByText(/1600 × 900/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add to library/i }));
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    expect(mediaService.create.mock.calls[0][0]).toMatchObject({ width: 1600, height: 900 });
  });
});

describe('a field that takes one kind of file (QA-63)', () => {
  it('refuses an address that is plainly another kind, and files the rest as its own', async () => {
    const onCreated = jest.fn();
    renderWith(<MediaUrlForm accept="document" onCreated={onCreated} />);

    // The Type is the field's, not the address's.
    expect(screen.getByLabelText('Type')).toBeDisabled();
    expect(screen.getByLabelText('Type')).toHaveValue('document');

    await fill({ url: 'https://picsum.photos/seed/not-a-brochure/800/600', alt: 'A photograph' });
    expect(
      screen.getByText('That address is a picture, and this field takes a document.')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));
    expect(mediaService.create).not.toHaveBeenCalled();

    // An address that says nothing about itself is trusted, as a document.
    fireEvent.change(screen.getByLabelText(/file address/i), {
      target: { value: 'https://example.com/download?id=5' },
    });
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(mediaService.create.mock.calls[0][0]).toMatchObject({ type: 'document' });
  });
});

describe('an address already in the library (QA-63)', () => {
  const EXISTING = {
    id: 7,
    url: 'https://picsum.photos/seed/sna-locality-whitefield/1600/900',
    type: 'image',
    alt: 'Whitefield, Bengaluru',
    title: null,
    usedIn: [],
  };

  beforeEach(() => {
    mediaService.create.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { url: ['The url has already been taken.'] },
      })
    );
    mediaService.list.mockResolvedValue({ data: [EXISTING], meta: {} });
  });

  it('offers the file it belongs to', async () => {
    const onExisting = jest.fn();
    renderWith(<MediaUrlForm onCreated={() => {}} onExisting={onExisting} />);

    await fill({ url: EXISTING.url });
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));

    expect(await screen.findByText(/It is filed as “Whitefield, Bengaluru”/)).toBeInTheDocument();
    expect(mediaService.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: EXISTING.url, withUsage: true })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Use that file' }));
    expect(onExisting).toHaveBeenCalledWith(EXISTING);
  });

  it('does not offer a file of another kind to a field that takes one kind', async () => {
    renderWith(<MediaUrlForm accept="video" onCreated={() => {}} onExisting={jest.fn()} />);

    await fill({ url: 'https://example.com/download?id=7' });
    mediaService.list.mockResolvedValue({
      data: [{ ...EXISTING, url: 'https://example.com/download?id=7' }],
      meta: {},
    });
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));

    expect(
      await screen.findByText(/which is a picture — this field takes a video/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use that file' })).not.toBeInTheDocument();
  });
});

it('files the folder as the library names it', async () => {
  renderWith(<MediaUrlForm onCreated={() => {}} />);

  await fill({ url: 'https://example.com/lobby.jpg' });
  fireEvent.change(screen.getByLabelText('Folder'), { target: { value: ' /projects//aurelia/ ' } });
  await userEvent.click(screen.getByRole('button', { name: /add to library/i }));

  await waitFor(() => expect(mediaService.create).toHaveBeenCalled());
  expect(mediaService.create.mock.calls[0][0]).toMatchObject({ folder: 'projects/aurelia' });
});

describe('fieldErrorsOf', () => {
  it('reads a 422 field by field, and words the unique rule for an editor', () => {
    expect(
      fieldErrorsOf(
        new ApiError({
          status: 422,
          errors: { url: ['The url has already been taken.'], alt: ['The alt field is required.'] },
        })
      )
    ).toMatchObject({
      url: 'This address is already in the library.',
      alt: 'The alt field is required.',
    });
    expect(fieldErrorsOf(new ApiError({ status: 500 }))).toEqual({});
  });
});
