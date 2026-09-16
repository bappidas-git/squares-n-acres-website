import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import TimelineRepeater, {
  STANDARD_MILESTONES,
  autoProgressFrom,
  missingStandardMilestones,
} from '../components/TimelineRepeater';
import { makeTimelineItem, resetTmpIds } from '../initialState';

/**
 * The timeline is the one repeater with arithmetic in it: the percentage a
 * visitor reads off a progress bar is derived from the milestones, and the
 * button that derives it must be inert when there is nothing to derive from
 * (§7 of prompt 20).
 *
 * The host is a plain `useState` rather than the form's reducer — the
 * component takes props, so that is all it needs to be honest about (D of
 * prompt 19 on `ImageGalleryEditor`).
 */

function Host({ initial = [], initialProgress = null, disabled = false }) {
  const [rows, setRows] = useState(initial);
  const [progress, setProgress] = useState(initialProgress);

  return (
    <>
      <TimelineRepeater
        rows={rows}
        errors={{}}
        progress={progress}
        disabled={disabled}
        onProgressChange={setProgress}
        onAdd={() => setRows((current) => [...current, makeTimelineItem()])}
        onUpdate={(id, patch) =>
          setRows((current) =>
            current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch } : row))
          )
        }
        onRemove={(id) =>
          setRows((current) => current.filter((row) => String(row.id) !== String(id)))
        }
        onMove={(from, to) =>
          setRows((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          })
        }
        onAddPresets={(milestones) =>
          setRows((current) => [
            ...current,
            ...milestones.map((milestone) => makeTimelineItem({ milestone })),
          ])
        }
      />
      <output data-testid="rows">{JSON.stringify(rows)}</output>
      <output data-testid="progress">{JSON.stringify(progress)}</output>
    </>
  );
}

const rows = (milestones) =>
  milestones.map(([milestone, status]) => makeTimelineItem({ milestone, status }));

const stored = () => JSON.parse(screen.getByTestId('rows').textContent);
const progress = () => JSON.parse(screen.getByTestId('progress').textContent);
const bar = () => screen.getByRole('progressbar', { name: 'Construction progress' });
const autoButton = () => screen.getByRole('button', { name: /Auto from milestones/ });

beforeEach(resetTmpIds);

describe('autoProgressFrom', () => {
  it('is nothing when there are no milestones (§7)', () => {
    expect(autoProgressFrom([])).toBe(0);
  });

  it('counts the completed ones as a percentage of the whole', () => {
    expect(
      autoProgressFrom(
        rows([
          ['Foundation', 'completed'],
          ['Structure', 'completed'],
          ['Masonry', 'in-progress'],
          ['Finishing', 'upcoming'],
          ['Handover', 'upcoming'],
        ])
      )
    ).toBe(40);
  });

  it('rounds rather than truncating', () => {
    expect(
      autoProgressFrom(
        rows([
          ['Foundation', 'completed'],
          ['Structure', 'completed'],
          ['Masonry', 'upcoming'],
        ])
      )
    ).toBe(67);
  });

  it('ignores a row nobody has named yet', () => {
    expect(
      autoProgressFrom([
        ...rows([['Foundation', 'completed']]),
        makeTimelineItem({ milestone: '   ' }),
      ])
    ).toBe(100);
  });
});

describe('the auto-progress button', () => {
  it('is disabled with no milestones, and reads 0% (§7)', () => {
    renderWith(<Host />);

    expect(autoButton()).toBeDisabled();
    expect(autoButton()).toHaveTextContent('Auto from milestones (0%)');
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
  });

  it('writes the derived percentage into the field and the bar', async () => {
    renderWith(
      <Host
        initial={rows([
          ['Foundation', 'completed'],
          ['Structure', 'completed'],
          ['Masonry', 'in-progress'],
          ['Finishing', 'upcoming'],
          ['Handover', 'upcoming'],
        ])}
      />
    );

    expect(autoButton()).toBeEnabled();
    await userEvent.click(autoButton());

    expect(progress()).toBe(40);
    expect(screen.getByLabelText('Construction progress (%)')).toHaveValue(40);
    expect(bar()).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('follows the statuses as they change', async () => {
    renderWith(
      <Host
        initial={rows([
          ['Foundation', 'upcoming'],
          ['Structure', 'upcoming'],
        ])}
      />
    );

    expect(autoButton()).toHaveTextContent('(0%)');

    await userEvent.selectOptions(screen.getAllByLabelText('Status')[0], 'completed');

    expect(autoButton()).toHaveTextContent('(50%)');
    await userEvent.click(autoButton());
    expect(progress()).toBe(50);
  });

  it('leaves a percentage typed by hand alone until it is pressed', async () => {
    renderWith(<Host initial={rows([['Foundation', 'completed']])} initialProgress={35} />);

    expect(progress()).toBe(35);
    expect(bar()).toHaveAttribute('aria-valuenow', '35');

    await userEvent.click(autoButton());
    expect(progress()).toBe(100);
  });

  it('clamps the bar to 0–100 whatever the field holds', () => {
    renderWith(<Host initialProgress={140} />);

    expect(bar()).toHaveAttribute('aria-valuenow', '100');
  });

  it('is disabled for a sales user even with milestones', () => {
    renderWith(<Host initial={rows([['Foundation', 'completed']])} disabled />);

    expect(autoButton()).toBeDisabled();
  });
});

describe('the standard milestones', () => {
  it('offers the five phases, once', async () => {
    renderWith(<Host />);

    await userEvent.click(screen.getByRole('button', { name: 'Add standard milestones' }));

    expect(stored().map((row) => row.milestone)).toEqual(STANDARD_MILESTONES);
    expect(
      screen.queryByRole('button', { name: 'Add standard milestones' })
    ).not.toBeInTheDocument();
  });

  it('adds only what is missing, ignoring case', () => {
    expect(missingStandardMilestones([makeTimelineItem({ milestone: 'foundation ' })])).toEqual([
      'Structure',
      'Masonry',
      'Finishing',
      'Handover',
    ]);
  });
});

describe('the rows', () => {
  it('adds, edits and removes a milestone', async () => {
    renderWith(<Host />);

    await userEvent.click(screen.getByRole('button', { name: 'Add milestone' }));
    await userEvent.type(screen.getByLabelText('Milestone'), 'Podium slab');

    expect(stored()[0].milestone).toBe('Podium slab');
    expect(stored()[0].status).toBe('upcoming');

    await userEvent.click(screen.getByRole('button', { name: 'Remove Podium slab' }));
    expect(stored()).toEqual([]);
  });

  it('carries the date, the note and the photograph', async () => {
    renderWith(<Host initial={rows([['Structure', 'in-progress']])} />);

    await userEvent.type(screen.getByLabelText('Note'), 'Eight of twelve floors cast');
    await userEvent.type(screen.getByLabelText('Site photograph'), 'https://example.com/site.jpg');

    expect(stored()[0].note).toBe('Eight of twelve floors cast');
    expect(stored()[0].imageUrl).toBe('https://example.com/site.jpg');
  });

  it('moves a milestone with the keyboard buttons', async () => {
    renderWith(
      <Host
        initial={rows([
          ['Foundation', 'completed'],
          ['Structure', 'upcoming'],
        ])}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Move Foundation down' }));

    expect(stored().map((row) => row.milestone)).toEqual(['Structure', 'Foundation']);
  });

  it('says what an empty timeline is for', () => {
    renderWith(<Host />);

    expect(screen.getByText(/No milestones yet/)).toBeInTheDocument();
  });
});
