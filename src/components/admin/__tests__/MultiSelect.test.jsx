import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';

import MultiSelect from '../MultiSelect';
import theme from '../../../theme';

/**
 * The keyboard of the tag picker (QA-55): once something is typed, Enter takes
 * the exact match — or "Add …" when there is none — and a chosen option is no
 * longer in the list for a second Enter to take back out.
 */

const OPTIONS = [
  { value: 3, label: 'khata transfer' },
  { value: 2, label: 'khata' },
  { value: 1, label: 'rera' },
];

function Controlled({ initial = [], onChange, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <MultiSelect
      label="Tags"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
      {...props}
    />
  );
}

const renderSelect = (props) =>
  render(
    <ThemeProvider theme={theme}>
      <Controlled {...props} />
    </ThemeProvider>
  );

const input = () => screen.getByRole('combobox', { name: 'Tags' });

describe('MultiSelect', () => {
  // `fireEvent` goes through React's `act`, as a browser's keystroke is
  // rendered in full before the next one; `userEvent` v13 does not, and hid
  // the box emptying itself on every keystroke.
  it('keeps what is typed, and narrows the list to it', async () => {
    renderSelect();

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'rer' } });

    expect(input()).toHaveValue('rer');
    const list = await screen.findByRole('listbox');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['rera']);
  });

  it('keeps what is typed through a render of the form around it', () => {
    function Rerendering() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setTick(tick + 1)}>
            Tick
          </button>
          {/* A fresh options array with the same options, as a parent's render makes. */}
          <MultiSelect
            label="Tags"
            options={OPTIONS.map((option) => ({ ...option }))}
            value={[1]}
          />
        </>
      );
    }
    render(
      <ThemeProvider theme={theme}>
        <Rerendering />
      </ThemeProvider>
    );

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'kha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tick' }));

    expect(input()).toHaveValue('kha');
  });

  it('takes the exact match on Enter, ahead of a longer name that contains it', async () => {
    const onChange = jest.fn();
    renderSelect({ onChange });

    await userEvent.type(input(), 'khata{enter}');

    expect(onChange).toHaveBeenLastCalledWith([2]);
    expect(screen.getByRole('button', { name: /khata/ })).toBeInTheDocument();
  });

  it('picks nothing on Enter before anything is typed', async () => {
    const onChange = jest.fn();
    renderSelect({ onChange });

    await userEvent.click(input());
    await userEvent.type(input(), '{enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers only what is not chosen yet', async () => {
    renderSelect({ initial: [2] });

    await userEvent.click(input());
    const list = await screen.findByRole('listbox');

    expect(within(list).queryByRole('option', { name: 'khata' })).not.toBeInTheDocument();
    expect(within(list).getByRole('option', { name: 'khata transfer' })).toBeInTheDocument();
    expect(within(list).getByRole('option', { name: 'rera' })).toBeInTheDocument();
  });

  it('creates what is typed on Enter when nothing is called that', async () => {
    const onChange = jest.fn();
    const onCreate = jest.fn(async (label) => ({ value: 9, label }));
    renderSelect({ onChange, creatable: true, onCreate });

    await userEvent.type(input(), 'stamp act{enter}');

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([9]));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith('stamp act');
  });

  it('selects an existing name rather than offering to add it again', async () => {
    const onChange = jest.fn();
    const onCreate = jest.fn();
    renderSelect({ onChange, creatable: true, onCreate });

    await userEvent.type(input(), 'RERA{enter}');

    expect(onCreate).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith([1]);
  });

  it('keeps a chip chosen while a new tag was being created', async () => {
    let finish;
    const onCreate = jest.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onChange = jest.fn();
    renderSelect({ onChange, creatable: true, onCreate });

    await userEvent.type(input(), 'stamp act{enter}');
    // A second Enter while the first create is still out is not a second tag.
    await userEvent.type(input(), '{enter}');
    expect(onCreate).toHaveBeenCalledTimes(1);

    await userEvent.clear(input());
    await userEvent.type(input(), 'rera{enter}');
    expect(onChange).toHaveBeenLastCalledWith([1]);

    await act(async () => finish({ value: 9, label: 'stamp act' }));

    expect(onChange).toHaveBeenLastCalledWith([1, 9]);
  });
});

/*
 * QA-64: an entry `onCreate` would refuse vanished from the box with no word of
 * why, a chosen one pressed again did nothing silently, and an entry typed and
 * followed by a click elsewhere — the Save button — was dropped.
 */
describe('MultiSelect — saying why, and keeping what was typed (QA-64)', () => {
  const isEmail = (label) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(label);
  const emailProps = (onChange, onCreate = jest.fn((label) => ({ value: label, label }))) => ({
    onChange,
    creatable: true,
    onCreate,
    checkNew: (label) => (isEmail(label) ? null : `“${label}” is not an e-mail address`),
  });

  it('says why a typed entry cannot be added, and does not add it on Enter', async () => {
    const onChange = jest.fn();
    const onCreate = jest.fn();
    renderSelect(emailProps(onChange, onCreate));

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'not-an-email' } });

    const refusal = await screen.findByRole('option', {
      name: '“not-an-email” is not an e-mail address',
    });
    expect(refusal).toHaveAttribute('aria-disabled', 'true');

    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    // The text stays, to be corrected.
    expect(input()).toHaveValue('not-an-email');
  });

  it('says an entry is already chosen instead of doing nothing', async () => {
    renderSelect({ initial: [1], creatable: true, onCreate: jest.fn() });

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'RERA' } });

    expect(await screen.findByRole('option', { name: '“RERA” is already added' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('adds what was typed when the box is left, with commitOnBlur', async () => {
    const onChange = jest.fn();
    const onCreate = jest.fn((label) => ({ value: label.toLowerCase(), label }));
    renderSelect({ ...emailProps(onChange, onCreate), commitOnBlur: true });

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'Ops@SquaresNAcres.com' } });
    await screen.findByRole('option', { name: 'Add "Ops@SquaresNAcres.com"' });
    fireEvent.blur(input());

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(['ops@squaresnacres.com']));
  });

  it('leaves what cannot be added in the box when it is left', async () => {
    const onChange = jest.fn();
    renderSelect({ ...emailProps(onChange), commitOnBlur: true });

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'ops@' } });
    await screen.findByRole('option', { name: '“ops@” is not an e-mail address' });
    fireEvent.blur(input());

    expect(onChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue('ops@');
  });

  it('still clears a half-typed search when the box is left, without commitOnBlur', async () => {
    const onChange = jest.fn();
    renderSelect({ onChange, creatable: true, onCreate: jest.fn() });

    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'stamp' } });
    fireEvent.blur(input());

    expect(onChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue('');
  });
});
