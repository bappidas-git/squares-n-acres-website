import { act, renderHook, waitFor } from '@testing-library/react';

import ApiError from '../../../../services/apiError';
import mediaService from '../../../../services/mediaService';
import useMediaUpload from '../useMediaUpload';
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
