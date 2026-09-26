import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CloudinarySetup from '../parts/CloudinarySetup';
import ToastProvider from '../../../../components/common/ToastProvider';
import mediaService from '../../../../services/mediaService';
import renderWith from '../../../../test-utils';
import { testCloudinaryUpload } from '../../../../utils/cloudinary';

jest.mock('../../../../utils/cloudinary', () => ({
  ...jest.requireActual('../../../../utils/cloudinary'),
  testCloudinaryUpload: jest.fn(),
}));

jest.mock('../../../../services/mediaService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

/**
 * Settings → Integrations → Cloudinary (prompt 51): the walkthrough, and a
 * "Test uploads" that tries the values in the boxes and files nothing.
 */

const renderSetup = (props = {}) =>
  renderWith(
    <ToastProvider>
      <CloudinarySetup
        cloudName="typed-cloud"
        uploadPreset="sna-unsigned"
        savedCloudName=""
        savedUploadPreset=""
        valid
        {...props}
      />
    </ToastProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

it('walks through the preset set-up while uploads are not configured', () => {
  renderSetup();

  expect(screen.getByRole('button', { name: 'How to set up Cloudinary uploads' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
  expect(screen.getByText(/Settings → Upload → Upload presets/)).toBeInTheDocument();
  expect(screen.getByText('Unsigned')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'console.cloudinary.com' })).toHaveAttribute(
    'href',
    'https://console.cloudinary.com'
  );
});

it('waits for both boxes before it can test', () => {
  renderSetup({ valid: false });

  expect(screen.getByRole('button', { name: 'Test uploads' })).toBeDisabled();
  expect(screen.getByText(/Fill in both boxes to test them/)).toBeInTheDocument();
});

it('says which values worked, that they are not saved yet, and files nothing', async () => {
  testCloudinaryUpload.mockResolvedValue({
    url: 'https://res.cloudinary.com/x/image/upload/a.png',
  });
  renderSetup();

  expect(
    screen.getByText(/Tests the values typed above, which are not saved yet/)
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Test uploads' }));

  expect(
    await screen.findByText(
      /Uploads work — tested just now with cloud “typed-cloud” and preset “sna-unsigned”/
    )
  ).toBeInTheDocument();
  expect(screen.getByText(/Save the settings to turn uploads on/)).toBeInTheDocument();
  expect(testCloudinaryUpload).toHaveBeenCalledWith(
    expect.objectContaining({ cloudName: 'typed-cloud', uploadPreset: 'sna-unsigned' })
  );
  expect(mediaService.create).not.toHaveBeenCalled();
});

it('puts a refusal in plain words', async () => {
  testCloudinaryUpload.mockRejectedValue(
    Object.assign(new Error('Upload preset not found'), { status: 400 })
  );
  renderSetup({ savedCloudName: 'typed-cloud', savedUploadPreset: 'sna-unsigned' });

  // Configured: the walkthrough starts folded away.
  expect(screen.getByRole('button', { name: 'How to set up Cloudinary uploads' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  expect(screen.getByText(/Tests the saved values/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Test uploads' }));

  await waitFor(() =>
    expect(
      screen.getAllByText('Preset not found or not unsigned — open the walkthrough above.').length
    ).toBeGreaterThan(0)
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Preset not found or not unsigned');
});
