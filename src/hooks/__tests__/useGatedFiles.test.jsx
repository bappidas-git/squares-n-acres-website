/**
 * `useGatedFiles` — the addresses of a listing's gated files, fetched once per
 * token with the token of the visitor's lead and shared by every section that
 * shows one (QA-51 OPEN-1).
 */

import { act, render, screen, waitFor } from '@testing-library/react';

import propertyService from '../../services/propertyService';
import { leadStorage } from '../../utils/leadStorage';
import useGatedFiles, { fetchGatedFiles, normaliseFiles, resetGatedFiles } from '../useGatedFiles';

jest.mock('../../services/propertyService', () => ({
  __esModule: true,
  default: { documentAccess: jest.fn() },
}));

const later = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

const ANSWER = {
  data: {
    brochureUrl: 'https://example.test/brochure.pdf',
    documents: [{ id: 2, url: 'https://example.test/prices.pdf' }],
    floorPlans: [{ id: 1, imageUrl: 'https://example.test/plan-1.png', pdfUrl: null }],
    unitConfigurations: [
      { id: 3, floorPlanImageUrl: 'https://example.test/unit-3.png', floorPlanPdfUrl: null },
    ],
  },
};

/** Shows what the hook holds for listing 7. */
function Probe({ enabled = false }) {
  const { status, files, fetchFiles } = useGatedFiles(7, { enabled });
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="plan">{files?.floorPlans?.['1']?.imageUrl ?? ''}</span>
      <button type="button" onClick={() => fetchFiles()}>
        fetch
      </button>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  resetGatedFiles();
  propertyService.documentAccess.mockResolvedValue(ANSWER);
});

describe('normaliseFiles', () => {
  it('keys every address by the id of its record', () => {
    expect(normaliseFiles(ANSWER.data)).toEqual({
      brochureUrl: 'https://example.test/brochure.pdf',
      documents: { 2: 'https://example.test/prices.pdf' },
      floorPlans: { 1: { imageUrl: 'https://example.test/plan-1.png', pdfUrl: null } },
      unitConfigurations: {
        3: { floorPlanImageUrl: 'https://example.test/unit-3.png', floorPlanPdfUrl: null },
      },
    });
  });

  it('survives an answer that carries nothing', () => {
    expect(normaliseFiles(null)).toEqual({
      brochureUrl: null,
      documents: {},
      floorPlans: {},
      unitConfigurations: {},
    });
  });
});

describe('fetchGatedFiles', () => {
  it('asks nothing of a visit that holds no token', async () => {
    await expect(fetchGatedFiles(7)).resolves.toBeNull();
    expect(propertyService.documentAccess).not.toHaveBeenCalled();
  });

  it('asks once per token, however many sections ask', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'tok', expiresAt: later() });

    const [first, second] = await Promise.all([fetchGatedFiles(7), fetchGatedFiles('7')]);

    expect(first).toBe(second);
    expect(first.floorPlans['1'].imageUrl).toBe('https://example.test/plan-1.png');
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(1);
    expect(propertyService.documentAccess).toHaveBeenCalledWith(7, 'tok');

    // The next lead's token is asked with afresh.
    leadStorage.markCaptured(7, 'property-enquiry', { token: 'tok-2', expiresAt: later() });
    await fetchGatedFiles(7);
    expect(propertyService.documentAccess).toHaveBeenLastCalledWith(7, 'tok-2');
  });

  it('forgets a token the API refuses', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'stale', expiresAt: later() });
    propertyService.documentAccess.mockRejectedValue({ status: 403 });

    await expect(fetchGatedFiles(7)).resolves.toBeNull();
    expect(leadStorage.getAccess(7)).toBeNull();
  });

  it('keeps the token through a failure the next attempt may not meet', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'tok', expiresAt: later() });
    propertyService.documentAccess.mockRejectedValueOnce({ status: 0 });

    await expect(fetchGatedFiles(7)).resolves.toBeNull();
    expect(leadStorage.getAccess(7)).toBe('tok');

    await expect(fetchGatedFiles(7)).resolves.toMatchObject({ brochureUrl: expect.any(String) });
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(2);
  });
});

describe('useGatedFiles', () => {
  it('reads as none without a token and fetches nothing', () => {
    render(<Probe enabled />);

    expect(screen.getByTestId('status')).toHaveTextContent('none');
    expect(propertyService.documentAccess).not.toHaveBeenCalled();
  });

  it('fetches as soon as it is enabled and the visit holds a token', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'tok', expiresAt: later() });
    render(<Probe enabled />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('plan')).toHaveTextContent('https://example.test/plan-1.png');
  });

  it('waits to be enabled, or asked', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'tok', expiresAt: later() });
    render(<Probe />);

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(propertyService.documentAccess).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByRole('button', { name: 'fetch' }).click();
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
  });

  it('shares one answer between two sections', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'tok', expiresAt: later() });
    render(
      <>
        <Probe enabled />
        <Probe enabled />
      </>
    );

    await waitFor(() =>
      screen.getAllByTestId('status').forEach((node) => expect(node).toHaveTextContent('ready'))
    );
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(1);
  });

  it('reads as failed, without asking again on its own, when the request fails', async () => {
    leadStorage.markCaptured(7, 'floor-plan-request', { token: 'tok', expiresAt: later() });
    propertyService.documentAccess.mockRejectedValueOnce({ status: 0 });
    render(<Probe enabled />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    expect(propertyService.documentAccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByRole('button', { name: 'fetch' }).click();
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
  });
});
