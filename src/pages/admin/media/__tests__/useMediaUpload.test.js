import { act, renderHook, waitFor } from '@testing-library/react';

import ApiError from '../../../../services/apiError';
import mediaService from '../../../../services/mediaService';
import useMediaUpload, { cleanFolder, recordFolder, titleFromFileName } from '../useMediaUpload';
import { uploadToCloudinary } from '../../../../utils/cloudinary';

jest.mock('../../../../services/mediaService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../../../../utils/cloudinary', () => ({
  ...jest.requireActual('../../../../utils/cloudinary'),
  uploadToCloudinary: jest.fn(),
}));

jest.mock('../../../../hooks/useCloudinaryConfig', () => ({
  __esModule: true,
  default: () => ({ configured: true, cloudName: 'qa', uploadPreset: 'qa', settings: null }),
}));

/**
 * The upload queue (QA-63): a retry files the record without sending the file
 * to Cloudinary again, a file already there cannot be "cancelled", and a file
 * the library does not take cannot be retried.
 */

const UPLOADED = {
  url: 'https://res.cloudinary.com/qa/image/upload/v1/sna/front.jpg',
  publicId: 'sna/front',
  bytes: 10,
  format: 'jpg',
  width: 10,
  height: 10,
};

const jpeg = (name = 'front.jpg') => new File(['x'], name, { type: 'image/jpeg' });

const rowOf = (result) => result.current.items[0];

beforeEach(() => {
  jest.clearAllMocks();
  uploadToCloudinary.mockResolvedValue(UPLOADED);
});

it('files the record again without uploading the file again', async () => {
  mediaService.create
    .mockRejectedValueOnce(new ApiError({ status: 500, message: 'Server exploded' }))
    .mockRejectedValueOnce(new ApiError({ status: 500, message: 'Server exploded' }))
    .mockResolvedValueOnce({ data: { id: 1, url: UPLOADED.url } });
  const onUploaded = jest.fn();
  const { result } = renderHook(() => useMediaUpload({ onUploaded }));

  act(() => {
    result.current.enqueue([jpeg()]);
  });

  // The automatic retry failed too: the row waits for the editor.
  await waitFor(() => expect(rowOf(result).status).toBe('error'));
  expect(rowOf(result).error).toBe('Server exploded');
  expect(mediaService.create).toHaveBeenCalledTimes(2);
  expect(uploadToCloudinary).toHaveBeenCalledTimes(1);

  act(() => result.current.retry(rowOf(result).id));

  await waitFor(() => expect(rowOf(result).status).toBe('done'));
  // Three records asked for, one file sent.
  expect(mediaService.create).toHaveBeenCalledTimes(3);
  expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
  expect(mediaService.create.mock.calls[2][0]).toMatchObject({ url: UPLOADED.url });
  expect(onUploaded).toHaveBeenCalledTimes(1);
});

it('does not cancel a file that is already on Cloudinary', async () => {
  let file;
  mediaService.create.mockReturnValueOnce(
    new Promise((resolve) => {
      file = resolve;
    })
  );
  const { result } = renderHook(() => useMediaUpload());

  act(() => {
    result.current.enqueue([jpeg()]);
  });
  await waitFor(() => expect(rowOf(result).status).toBe('saving'));

  act(() => result.current.cancel(rowOf(result).id));
  expect(rowOf(result).status).toBe('saving');

  await act(async () => file({ data: { id: 1, url: UPLOADED.url } }));
  expect(rowOf(result).status).toBe('done');
});

it('offers no retry to a file the library does not take', async () => {
  const { result } = renderHook(() => useMediaUpload());

  act(() => {
    result.current.enqueue([new File(['x'], 'notes.txt', { type: 'text/plain' })]);
  });

  expect(rowOf(result)).toMatchObject({ status: 'error', invalid: true });
  act(() => result.current.retry(rowOf(result).id));
  expect(rowOf(result).status).toBe('error');
  expect(uploadToCloudinary).not.toHaveBeenCalled();
});

it('still cancels a file on its way to Cloudinary', async () => {
  uploadToCloudinary.mockImplementationOnce(
    (_file, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('The upload was cancelled.'), { name: 'AbortError' }))
        );
      })
  );
  const { result } = renderHook(() => useMediaUpload());

  act(() => {
    result.current.enqueue([jpeg()]);
  });
  await waitFor(() => expect(rowOf(result).status).toBe('uploading'));

  act(() => result.current.cancel(rowOf(result).id));
  await waitFor(() => expect(rowOf(result).status).toBe('cancelled'));
  expect(mediaService.create).not.toHaveBeenCalled();
});

it('files a long file name under a title the library keeps, and the folder cleaned (QA-63)', async () => {
  mediaService.create.mockImplementation((body) => Promise.resolve({ data: { id: 3, ...body } }));
  const name = `${'aerial-view-of-the-clubhouse-'.repeat(9)}.jpg`;
  const { result } = renderHook(() => useMediaUpload({ folder: ' /projects//aurelia/ ' }));

  act(() => {
    result.current.enqueue([jpeg(name)]);
  });
  await waitFor(() => expect(rowOf(result).status).toBe('done'));

  const body = mediaService.create.mock.calls[0][0];
  expect(name.length).toBeGreaterThan(200);
  expect(body.title).toHaveLength(200);
  expect(body.title.endsWith('….jpg')).toBe(true);
  expect(body.folder).toBe('projects/aurelia');
  expect(uploadToCloudinary.mock.calls[0][1]).toMatchObject({ folder: 'sna/projects/aurelia' });
});

it('shortens only what is too long, and cleans only what needs it', () => {
  expect(titleFromFileName('lobby.jpg')).toBe('lobby.jpg');
  expect(titleFromFileName('x'.repeat(250))).toHaveLength(200);
  expect(cleanFolder('  ')).toBe('');
  expect(cleanFolder('properties')).toBe('properties');
  expect(cleanFolder('/a / b//c/')).toBe('a/b/c');
});

it('files a record’s own uploads in a folder of its own, or the section’s (prompt 51)', () => {
  expect(recordFolder('properties', 'lakeview-heights-3-bhk-whitefield')).toBe(
    'properties/lakeview-heights-3-bhk-whitefield'
  );
  expect(recordFolder('properties', 'draft-lx3k2')).toBe('properties/draft-lx3k2');
  expect(recordFolder('articles', '')).toBe('articles');
  expect(recordFolder('articles', undefined)).toBe('articles');
  // A slug is one segment: a slash in it does not make a folder inside a folder.
  expect(recordFolder('pages', 'buyer-assistance/home-loan')).toBe(
    'pages/buyer-assistance-home-loan'
  );
});
