import { useEffect, useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SlugField, { CHECK_DEBOUNCE_MS } from '../SlugField';
import renderWith from '../../../test-utils';

/** A controlled host, because the field's whole job is to drive one value. */
function Harness({
  initialSlug = '',
  title = '',
  checkSlug,
  onChangeSpy,
  disabled = false,
  excludeId,
}) {
  const [slug, setSlug] = useState(initialSlug);
  return (
    <>
      <SlugField
        value={slug}
        source={title}
        base="/localities/"
        checkSlug={checkSlug}
        disabled={disabled}
        excludeId={excludeId}
        onChange={(next) => {
          setSlug(next);
          onChangeSpy?.(next);
        }}
      />
      <output data-testid="value">{slug}</output>
    </>
  );
}

/**
 * A render as long as a real form's. React commits it and then yields before
 * running its effects — the gap a keystroke can land in.
 */
function Heavy({ busy }) {
  if (busy) {
    const until = Date.now() + 20;
    while (Date.now() < until) {
      // A long render, on purpose.
    }
  }
  return null;
}

/**
 * A form whose record arrives a moment after its fields mount, the way the
 * article form's does: the field mounts over an empty slug, then the record's
 * slug and title land together, in a render long enough to be yielded after.
 */
function LoadingHarness({ record }) {
  const [values, setValues] = useState({ title: '', slug: '' });
  useEffect(() => {
    const timer = setTimeout(() => setValues(record), 20);
    return () => clearTimeout(timer);
  }, [record]);
  return (
    <>
      <label>
        Headline
        <input
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
        />
      </label>
      <SlugField
        value={values.slug}
        source={values.title}
        base="/insights/articles/"
        excludeId={7}
        onChange={(next) => setValues((current) => ({ ...current, slug: next }))}
      />
      <output data-testid="value">{values.slug}</output>
      <Heavy busy={values.slug === record.slug} />
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
    // A saved record is the one with an id to exclude from the check.
    renderWith(<Harness initialSlug="whitefield" title="Whitefield" excludeId={4} />);
    expect(screen.getByLabelText('Slug')).toBeEnabled();
  });

  it('keeps following the title on a new record whose slug is still the generated one', async () => {
    // A long form unmounts the field on every tab switch; mounting it again
    // over a slug that is exactly what the title makes must not freeze it.
    const { rerender } = renderWith(<Harness initialSlug="whitefield" title="Whitefield" />);
    expect(screen.getByLabelText('Slug')).toBeDisabled();

    rerender(<Harness initialSlug="whitefield" title="Whitefield East" />);
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('whitefield-east'));
  });

  it('keeps a loaded record’s URL when the title is typed straight after it arrives (QA-55)', async () => {
    renderWith(
      <LoadingHarness
        record={{
          title: 'Khata Transfer: The Complete Checklist',
          slug: 'khata-transfer-checklist',
        }}
      />
    );
    // The first keystroke can land before the field has let go of the title:
    // it used to write the title's slug over the live URL.
    await screen.findByDisplayValue('khata-transfer-checklist');
    fireEvent.change(screen.getByLabelText('Headline'), {
      target: { value: 'Khata Transfer: The Complete Checklist (2026)' },
    });

    await waitFor(() => expect(screen.getByLabelText('Slug')).toBeEnabled());
    expect(screen.getByTestId('value')).toHaveTextContent('khata-transfer-checklist');
  });

  it('starts unlocked on a new record whose slug was changed by hand', () => {
    renderWith(<Harness initialSlug="my-own-slug" title="Whitefield" />);
    expect(screen.getByLabelText('Slug')).toBeEnabled();
  });

  it('does not overwrite a slug that has been edited by hand', async () => {
    renderWith(<Harness initialSlug="whitefield" title="Whitefield" excludeId={4} />);

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
