import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SlugField, { CHECK_DEBOUNCE_MS } from '../SlugField';
import renderWith from '../../../test-utils';

/** A controlled host, because the field's whole job is to drive one value. */
function Harness({ initialSlug = '', title = '', checkSlug, onChangeSpy, disabled = false }) {
  const [slug, setSlug] = useState(initialSlug);
  return (
    <>
      <SlugField
        value={slug}
        source={title}
        base="/localities/"
        checkSlug={checkSlug}
        disabled={disabled}
        onChange={(next) => {
          setSlug(next);
          onChangeSpy?.(next);
        }}
      />
      <output data-testid="value">{slug}</output>
    </>
  );
}

const available = () => Promise.resolve({ data: { available: true } });
const taken = () =>
  Promise.resolve({ data: { available: false, suggestion: 'whitefield-east-2' } });

describe('SlugField', () => {
  it('generates the slug from the title while it is locked', async () => {
    renderWith(<Harness title="Whitefield East" />);

    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('whitefield-east'));
    expect(screen.getByLabelText('Slug')).toBeDisabled();
  });

  it('keeps following the title until it is unlocked', async () => {
    const { rerender } = renderWith(<Harness title="Whitefield" />);
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('whitefield'));

    rerender(<Harness title="Whitefield East" />);
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('whitefield-east'));
  });

  it('starts unlocked for a record that already has a slug', () => {
    renderWith(<Harness initialSlug="whitefield" title="Whitefield" />);
    expect(screen.getByLabelText('Slug')).toBeEnabled();
  });

  it('does not overwrite a slug that has been edited by hand', async () => {
    renderWith(<Harness initialSlug="whitefield" title="Whitefield" />);

    const input = screen.getByLabelText('Slug');
    await userEvent.clear(input);
    await userEvent.type(input, 'my-own-slug');
    expect(screen.getByTestId('value')).toHaveTextContent('my-own-slug');

    // The title changing after a manual edit must leave the URL alone.
    await userEvent.click(screen.getByRole('button', { name: 'Generate the slug from the title' }));
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('whitefield'));
  });

  it('slugifies what is typed', async () => {
    renderWith(<Harness initialSlug="x" />);

    const input = screen.getByLabelText('Slug');
    await userEvent.clear(input);
    await userEvent.type(input, 'Some Title');

    expect(screen.getByTestId('value')).toHaveTextContent('some-title');
  });

  describe('availability', () => {
    it('says so when the slug is free', async () => {
      renderWith(<Harness initialSlug="whitefield" checkSlug={available} />);
      expect(await screen.findByText('This URL is available.')).toBeInTheDocument();
    });

    it('says so when it is taken, and offers the suggestion', async () => {
      renderWith(<Harness initialSlug="whitefield-east" checkSlug={taken} />);
      expect(await screen.findByText('Already taken.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Use .whitefield-east-2./ })).toBeInTheDocument();
    });

    it('fills the field from the suggestion and checks the new one', async () => {
      const checkSlug = jest.fn().mockImplementationOnce(taken).mockImplementation(available);

      renderWith(<Harness initialSlug="whitefield-east" checkSlug={checkSlug} />);

      await userEvent.click(await screen.findByRole('button', { name: /Use / }));

      await waitFor(() =>
        expect(screen.getByTestId('value')).toHaveTextContent('whitefield-east-2')
      );
      expect(await screen.findByText('This URL is available.')).toBeInTheDocument();
      expect(checkSlug).toHaveBeenCalledTimes(2);
      expect(checkSlug.mock.calls[1][0]).toBe('whitefield-east-2');
    });

    it('stays quiet rather than claiming a slug is free when the check fails', async () => {
      const checkSlug = jest.fn().mockRejectedValue(new Error('offline'));
      renderWith(<Harness initialSlug="whitefield" checkSlug={checkSlug} />);

      await waitFor(() => expect(checkSlug).toHaveBeenCalled());
      expect(screen.queryByText('This URL is available.')).not.toBeInTheDocument();
      expect(screen.queryByText('Already taken.')).not.toBeInTheDocument();
    });

    it('asks nothing when there is no slug to ask about', async () => {
      const checkSlug = jest.fn(available);
      renderWith(<Harness checkSlug={checkSlug} />);

      await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent(''));
      expect(checkSlug).not.toHaveBeenCalled();
    });

    // MB-01: `check-slug` belongs to the area's `create` permission (§7), so a
    // role that opens a form read-only was answered 403 and the browser logged
    // it — for a question whose answer it could not have acted on anyway.
    it('asks nothing at all while the field is read-only', async () => {
      const checkSlug = jest.fn(available);
      renderWith(<Harness initialSlug="whitefield" checkSlug={checkSlug} disabled />);

      await new Promise((settle) => setTimeout(settle, CHECK_DEBOUNCE_MS + 60));
      expect(checkSlug).not.toHaveBeenCalled();
      expect(screen.queryByText('This URL is available.')).not.toBeInTheDocument();
      expect(screen.queryByText('Already taken.')).not.toBeInTheDocument();
    });

    it('starts asking the moment the field becomes editable again', async () => {
      const checkSlug = jest.fn(available);
      const { rerender } = renderWith(
        <Harness initialSlug="whitefield" checkSlug={checkSlug} disabled />
      );

      await new Promise((settle) => setTimeout(settle, CHECK_DEBOUNCE_MS + 60));
      expect(checkSlug).not.toHaveBeenCalled();

      rerender(<Harness initialSlug="whitefield" checkSlug={checkSlug} />);
      await waitFor(() => expect(checkSlug).toHaveBeenCalledWith('whitefield', expect.any(Object)));
    });
  });
});
