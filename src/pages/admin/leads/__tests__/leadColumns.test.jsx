/**
 * The CRM table's cells and phone card (prompt 29, QA-53).
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  buildLeadColumns,
  duplicatesPathOf,
  isFollowUpOverdue,
  leadTelLink,
  renderLeadCard,
} from '../leadColumns';

const LEAD = {
  id: 7,
  name: 'Geetha Srinivasan',
  phone: '9876500130',
  email: 'geetha.srinivasan@example.com',
  source: 'call-click',
  status: 'new',
  priority: 'high',
  assignedTo: null,
  assignedUser: null,
  followUpAt: '2026-09-20T04:30:00.000Z',
  createdAt: '2026-09-14T12:30:00.000Z',
  property: { id: 3, title: 'Prakriti Earth Villas – 3 BHK Villa', slug: 'prakriti-earth' },
  isPossibleDuplicate: true,
};

const renderCell = (key, lead = LEAD) => {
  const column = buildLeadColumns().find((entry) => entry.key === key);
  return render(<MemoryRouter>{column.render(lead)}</MemoryRouter>);
};

describe('isFollowUpOverdue', () => {
  const now = Date.parse('2026-09-21T00:00:00.000Z');

  it('is late once the date has passed on an open lead', () => {
    expect(isFollowUpOverdue(LEAD, now)).toBe(true);
    expect(isFollowUpOverdue({ ...LEAD, followUpAt: '2026-09-25T04:30:00.000Z' }, now)).toBe(false);
  });

  it('is never late on a lead that is closed either way', () => {
    expect(isFollowUpOverdue({ ...LEAD, status: 'converted' }, now)).toBe(false);
    expect(isFollowUpOverdue({ ...LEAD, status: 'lost' }, now)).toBe(false);
  });
});

describe('the name cell', () => {
  it('prints the number in one shape and lets the address break after its @', () => {
    renderCell('name');

    expect(screen.getByText('+91 98765 00130')).toBeInTheDocument();
    const email = screen.getByText(
      (_, node) => node?.textContent === LEAD.email && node.tagName === 'SPAN'
    );
    expect(email.innerHTML).toContain('@<wbr>');
    expect(screen.getByRole('link', { name: LEAD.name })).toHaveAttribute('href', '/admin/leads/7');
  });

  it('turns "Possible duplicate" into the list searched for the number', () => {
    renderCell('name');

    expect(screen.getByRole('link', { name: /Possible duplicate/ })).toHaveAttribute(
      'href',
      '/admin/leads?q=9876500130'
    );
    expect(duplicatesPathOf({ phone: '+919876500130' })).toBe('/admin/leads?q=9876500130');
  });
});

describe('the property cell', () => {
  it('names the listing, and the form the lead came through under it', () => {
    renderCell('property');

    expect(screen.getByRole('link', { name: LEAD.property.title })).toHaveAttribute(
      'href',
      '/admin/properties/edit/3'
    );
    expect(screen.getByText('via Call Click')).toBeInTheDocument();
  });

  it('says where a lead without a listing came from', () => {
    renderCell('property', { ...LEAD, property: null, source: 'contact-page' });

    expect(screen.getByText('via Contact Page')).toBeInTheDocument();
  });
});

describe('the columns', () => {
  it('sort by the five keys the API answers, and fold narrow ones away', () => {
    const columns = buildLeadColumns();

    expect(columns.filter((column) => column.sortable).map((column) => column.key)).toEqual([
      'status',
      'priority',
      'followUpAt',
      'createdAt',
    ]);
    expect(columns.find((column) => column.key === 'source').hideBelow).toBe('xl');
    expect(columns.find((column) => column.key === 'priority').hideBelow).toBe('lg');
  });
});

describe('the phone card', () => {
  it('carries the listing and the follow-up, and dials with the country code', () => {
    render(<MemoryRouter>{renderLeadCard(LEAD)}</MemoryRouter>);

    expect(screen.getByRole('link', { name: LEAD.property.title })).toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    expect(screen.getByText('20 Sep 2026, 10:00 am')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:+919876500130');
    expect(leadTelLink({ phone: '' })).toBe('');
  });
});
