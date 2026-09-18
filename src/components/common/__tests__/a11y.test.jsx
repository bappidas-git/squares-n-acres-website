/**
 * The accessibility contract of the two ways a visitor talks to us: the lead
 * form and the modal that carries it (prompt 42 §4.5).
 */

import { screen } from '@testing-library/react';

import LeadCaptureModal from '../LeadCaptureModal';
import LeadForm from '../LeadForm';
import renderWith from '../../../test-utils';
import {
  expectDialogSemantics,
  expectLabelledInputs,
  expectNamedControls,
  expectNoDuplicateIds,
} from '../../../test-utils/a11y';

jest.mock('../../../services/leadService', () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({ data: { id: 1 } }) },
}));

describe('LeadForm', () => {
  it('labels every box, names every control and repeats no id', () => {
    const { container } = renderWith(<LeadForm source="faq" />);

    expect(expectLabelledInputs(container)).toBeGreaterThan(0);
    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });

  it('keeps two forms on one page from sharing ids', () => {
    const { container } = renderWith(
      <>
        <LeadForm source="faq" />
        <LeadForm source="contact" />
      </>
    );

    expectNoDuplicateIds(container);
  });
});

describe('LeadCaptureModal', () => {
  it('is a modal dialog named by its heading, with a labelled form inside', () => {
    const { baseElement } = renderWith(
      <LeadCaptureModal open onClose={jest.fn()} source="post-requirement" />
    );

    const dialog = screen.getByRole('dialog');
    expectDialogSemantics(dialog);
    expectLabelledInputs(baseElement);
    expectNoDuplicateIds(baseElement);
  });
});
