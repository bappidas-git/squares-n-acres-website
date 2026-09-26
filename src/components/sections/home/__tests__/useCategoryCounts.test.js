/**
 * `useCategoryCounts` (prompt 51): the home page's tiles from two
 * `GET /properties/counts` answers, and the per-tile `perPage=1` requests
 * against an API that has not built that endpoint.
 */

import { renderHook, waitFor } from '@testing-library/react';

import ApiError from '../../../../services/apiError';
import propertyService from '../../../../services/propertyService';
import useCategoryCounts, {
  COUNT_QUERIES,
  aggregateFor,
  resetCategoryCounts,
} from '../useCategoryCounts';
import { CATEGORIES } from '../CategoryTiles';

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { counts: jest.fn(), list: jest.fn() },
}));

/** The six category tiles and three type tiles, as the two sections ask. */
const REQUESTS = [
  ...CATEGORIES.map((category) => ({ key: category.key, params: category.params })),
  { key: '1', params: { propertyTypeId: 1 } },
  { key: '2', params: { propertyTypeId: 2 } },
  { key: '17', params: { propertyTypeId: 17 } },
];

const TOTALS = {
  segment: { residential: 26, commercial: 5, land: 9 },
  listingType: { sale: 31, rent: 7, lease: 2 },
  propertyTypeId: { 1: 8, 2: 4 },
};

const SALE_STATUS = {
  constructionStatus: { 'ready-to-move': 14, 'under-construction': 11 },
};

const answer = (params) =>
  Promise.resolve({
    data: params.by === COUNT_QUERIES.saleStatus.by ? SALE_STATUS : TOTALS,
    meta: null,
  });

const render = (requests = REQUESTS) => renderHook(() => useCategoryCounts(requests));

beforeEach(() => {
  resetCategoryCounts();
  propertyService.counts.mockImplementation(answer);
  propertyService.list.mockImplementation((params) =>
    Promise.resolve({ data: [], meta: { total: 100 + Object.keys(params).length } })
  );
});

describe('which answer holds a tile', () => {
  it.each([
    [{ segment: 'land' }, { query: 'totals', dimension: 'segment', value: 'land' }],
    [{ listingType: 'rent' }, { query: 'totals', dimension: 'listingType', value: 'rent' }],
    [{ propertyTypeId: 4 }, { query: 'totals', dimension: 'propertyTypeId', value: '4' }],
    [
      { listingType: 'sale', constructionStatus: 'pre-launch' },
      { query: 'saleStatus', dimension: 'constructionStatus', value: 'pre-launch' },
    ],
    [{ listingType: 'rent', constructionStatus: 'ready-to-move' }, null],
    [{ segment: 'land', listingType: 'sale' }, null],
    [{ propertyTypeId: [1, 2] }, null],
    [{ localityId: 3 }, null],
    [{}, null],
  ])('%j → %j', (params, expected) => {
    expect(aggregateFor(params)).toEqual(expected);
  });
});

describe('the two counts requests', () => {
  it('answer every tile with two requests and none per tile', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(propertyService.counts).toHaveBeenCalledTimes(2);
    expect(propertyService.counts).toHaveBeenCalledWith(COUNT_QUERIES.totals);
    expect(propertyService.counts).toHaveBeenCalledWith(COUNT_QUERIES.saleStatus);
    expect(propertyService.list).not.toHaveBeenCalled();

    expect(result.current.counts).toEqual({
      'ready-to-move': 14,
      'under-construction': 11,
      // A value no live listing carries is absent from the answer: none.
      'pre-launch': 0,
      plots: 9,
      rent: 7,
      commercial: 5,
      1: 8,
      2: 4,
      17: 0,
    });
  });

  it('asks once for two sections that ask the same, and not again while it is fresh', async () => {
    const { result: tiles } = render(REQUESTS.slice(0, 6));
    const { result: types } = render(REQUESTS.slice(6));
    await waitFor(() => expect(tiles.current.loading).toBe(false));
    await waitFor(() => expect(types.current.loading).toBe(false));

    const { result: again } = render();
    await waitFor(() => expect(again.current.loading).toBe(false));
    expect(propertyService.counts).toHaveBeenCalledTimes(2);
    expect(again.current.counts.plots).toBe(9);
  });

  it('counts on its own a filter set neither answer holds', async () => {
    const { result } = render([{ key: 'hebbal', params: { localityId: 3 } }]);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(propertyService.counts).not.toHaveBeenCalled();
    expect(propertyService.list).toHaveBeenCalledWith({ localityId: 3, perPage: 1 });
    expect(result.current.counts.hebbal).toBe(102);
  });
});

describe('an API without the counts endpoint', () => {
  it.each([404, 501])('gets the per-tile requests when the counts answer %s', async (status) => {
    propertyService.counts.mockRejectedValue(new ApiError({ status, message: 'Not found' }));
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(propertyService.list).toHaveBeenCalledTimes(REQUESTS.length);
    expect(propertyService.list).toHaveBeenCalledWith({
      listingType: 'sale',
      constructionStatus: 'ready-to-move',
      perPage: 1,
    });
    expect(propertyService.list).toHaveBeenCalledWith({ propertyTypeId: 17, perPage: 1 });
    expect(result.current.counts.plots).toBe(102);
    expect(result.current.counts['ready-to-move']).toBe(103);

    // It is not asked again: the next section goes straight to the fallback.
    const { result: later } = render([{ key: 'rent', params: { listingType: 'rent' } }]);
    await waitFor(() => expect(later.current.loading).toBe(false));
    expect(propertyService.counts).toHaveBeenCalledTimes(2);
  });

  it('asks per tile for a dimension the answer left out', async () => {
    propertyService.counts.mockResolvedValue({ data: { segment: { land: 9 } }, meta: null });
    const { result } = render([
      { key: 'plots', params: { segment: 'land' } },
      { key: '1', params: { propertyTypeId: 1 } },
    ]);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.counts).toEqual({ plots: 9, 1: 102 });
    expect(propertyService.list).toHaveBeenCalledTimes(1);
  });

  it('draws nothing, and sends no per-tile requests, when the counts fail otherwise', async () => {
    propertyService.counts.mockRejectedValue(new ApiError({ status: 500, message: 'Down' }));
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(propertyService.list).not.toHaveBeenCalled();
    expect(Object.values(result.current.counts).every((count) => count === null)).toBe(true);
  });
});
