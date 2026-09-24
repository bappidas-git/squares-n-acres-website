import { useMemo, useReducer } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import { PropertyFormProvider } from '../PropertyFormContext';
import reducer, { actions, createFormState } from '../reducer';
import AgentTab from '../tabs/AgentTab';

const TEAM = [
  { id: 1, name: 'Priya Nair', phone: '9876543210', email: 'priya@example.com', order: 1 },
  { id: 2, name: 'Arjun Rao', phone: '9123456780', email: 'arjun@example.com', order: 2 },
];

jest.mock('../../../../../hooks/useMasterData', () => {
  const actual = jest.requireActual('../../../../../hooks/useMasterData');
  return {
    ...actual,
    useTeamMembers: () => ({
      members: global.__TEAM__ ?? [],
      loading: false,
      error: null,
      byId: () => null,
      refetch: () => {},
    }),
  };
});

function Harness({ patch = {} }) {
  const [state, dispatch] = useReducer(reducer, { propertyId: 1 }, ({ propertyId }) => {
    const base = createFormState({ propertyId });
    const values = { ...base.values, ...patch };
    return { ...base, values, initial: values };
  });

  const api = useMemo(
    () => ({
      state,
      dispatch,
      values: state.values,
      errors: state.errors,
      setField: (path, value) => dispatch(actions.set(path, value)),
      setFields: (fields) => dispatch(actions.setMany(fields)),
      disabled: false,
      isNew: false,
      propertyId: 1,
    }),
    [state]
  );

  return (
    <PropertyFormProvider value={api}>
      <AgentTab />
      <output data-testid="agent">{JSON.stringify(api.values.agent)}</output>
    </PropertyFormProvider>
  );
}

const stored = () => JSON.parse(screen.getByTestId('agent').textContent);

afterEach(() => {
  delete global.__TEAM__;
});

describe('choosing who answers the listing', () => {
  it('offers the team list when "Team member" is chosen, with several people on it', async () => {
    global.__TEAM__ = TEAM;
    renderWith(<Harness />);

    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked();
    expect(screen.queryByRole('combobox', { name: 'Team member' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Team member' }));

    // With two people nothing is linked yet — the radio used to spring back to
    // "Manual" and the list never appeared.
    expect(screen.getByRole('radio', { name: 'Team member' })).toBeChecked();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Team member' }), '2');

    expect(stored().teamMemberId).toBe(2);
    expect(stored().name).toBe('Arjun Rao');
  });

  it('links the only member there is straight away', async () => {
    global.__TEAM__ = [TEAM[0]];
    renderWith(<Harness />);

    await userEvent.click(screen.getByRole('radio', { name: 'Team member' }));

    expect(stored().teamMemberId).toBe(1);
    expect(stored().name).toBe('Priya Nair');
  });

  it('keeps the details and drops the link when switched back to "Manual"', async () => {
    global.__TEAM__ = TEAM;
    renderWith(
      <Harness
        patch={{
          agent: { ...createFormState({}).values.agent, teamMemberId: 1, name: 'Priya Nair' },
        }}
      />
    );

    expect(screen.getByRole('radio', { name: 'Team member' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Manual' }));

    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked();
    expect(stored().teamMemberId).toBeNull();
    expect(stored().name).toBe('Priya Nair');
  });
});

describe('phone numbers (QA-61)', () => {
  const shown = { ...createFormState({}).values.agent, showOnListing: true };

  it('gives both boxes room for a number as people write it', () => {
    renderWith(<Harness patch={{ agent: shown }} />);

    // Read off the boxes: the user-event this suite runs types past a cap.
    expect(screen.getByLabelText(/^Phone/)).toHaveAttribute('maxlength', '18');
    expect(screen.getByLabelText(/^WhatsApp/)).toHaveAttribute('maxlength', '18');
  });

  it('previews a number typed with its +91 as the ten digits the listing stores', async () => {
    renderWith(<Harness patch={{ agent: shown }} />);

    await userEvent.type(screen.getByLabelText(/^Phone/), '+91 98450 12345');

    // The card read "+91 +91 98450 12345".
    expect(screen.getByText('+91 9845012345')).toBeInTheDocument();
    expect(stored().phone).toBe('+91 98450 12345');
  });
});
