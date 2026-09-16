import { screen } from '@testing-library/react';

import ConstructionSection, { orderedMilestones, progressPercent } from '../ConstructionSection';
import renderWith from '../../../../test-utils';

const milestone = (id, milestone, status, extra = {}) => ({
  id,
  milestone,
  status,
  date: null,
  imageUrl: null,
  note: null,
  order: id,
  ...extra,
});

const underConstruction = {
  id: 2,
  title: 'Aurelia Park Residences',
  constructionStatus: 'under-construction',
  possessionDate: '2028-02-01',
  updatedAt: '2026-09-16T09:00:00.000Z',
  constructionProgressPercent: null,
  constructionTimeline: [
    milestone(1, 'Land acquisition and approvals', 'completed', { date: '2025-07-01' }),
    milestone(2, 'Excavation and foundation', 'completed', { date: '2026-02-01' }),
    milestone(3, 'Tower framing', 'in-progress', {
      date: '2026-09-01',
      imageUrl: 'https://example.test/progress-3.jpg',
      note: 'Three of four towers topped out.',
    }),
    milestone(4, 'Finishing and handover', 'upcoming'),
  ],
};

describe('progressPercent', () => {
  it('prefers the figure the editor recorded, clamped to 0–100', () => {
    expect(progressPercent(74, [])).toBe(74);
    expect(progressPercent(0, [])).toBe(0);
    expect(progressPercent(140, [])).toBe(100);
    expect(progressPercent(-5, [])).toBe(0);
  });

  it('counts completed milestones when no figure was recorded', () => {
    expect(progressPercent(null, underConstruction.constructionTimeline)).toBe(50);
  });

  it('answers 0 or 100 for a single milestone, and never NaN or Infinity', () => {
    const none = progressPercent(null, [milestone(1, 'Approvals', 'upcoming')]);
    const done = progressPercent(null, [milestone(1, 'Approvals', 'completed')]);

    expect(none).toBe(0);
    expect(done).toBe(100);
    expect(Number.isFinite(none)).toBe(true);
    expect(Number.isFinite(done)).toBe(true);
  });

  it('hides the bar rather than dividing by zero when there are no milestones', () => {
    expect(progressPercent(null, [])).toBeNull();
    expect(progressPercent(undefined, undefined)).toBeNull();
  });
});

describe('orderedMilestones', () => {
  it('sorts by the editor’s order and drops unnamed rows', () => {
    const rows = [
      milestone(2, 'Second', 'upcoming', { order: 2 }),
      milestone(1, 'First', 'completed', { order: 1 }),
      { id: 3, milestone: '   ', status: 'upcoming', order: 3 },
    ];

    expect(orderedMilestones(rows).map((entry) => entry.milestone)).toEqual(['First', 'Second']);
  });
});

describe('ConstructionSection', () => {
  it('prints the progress bar, the milestones and when the page was updated', () => {
    renderWith(<ConstructionSection property={underConstruction} />);

    const bar = screen.getByRole('progressbar', { name: /overall construction progress/i });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('50%')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Tower framing' })).toBeInTheDocument();
    expect(screen.getByText('Three of four towers topped out.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /view the site photograph for tower framing/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Possession expected February 2028/i)).toBeInTheDocument();
    expect(screen.getByText(/Last updated 16 Sep 2026/i)).toBeInTheDocument();
  });

  it('shows a single milestone at 0% without an Infinity or a NaN', () => {
    renderWith(
      <ConstructionSection
        property={{
          ...underConstruction,
          constructionTimeline: [milestone(1, 'Approvals under way', 'in-progress')],
        }}
      />
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('renders the timeline without dates when the milestones carry none', () => {
    renderWith(
      <ConstructionSection
        property={{
          ...underConstruction,
          constructionTimeline: underConstruction.constructionTimeline.map((entry) => ({
            ...entry,
            date: null,
          })),
        }}
      />
    );

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders nothing when there is neither a figure nor a milestone', () => {
    const { container } = renderWith(
      <ConstructionSection
        property={{
          ...underConstruction,
          constructionProgressPercent: null,
          constructionTimeline: [],
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
