/**
 * The per-field "Generate" buttons beside the SEO title and the meta
 * description (prompt 51). An empty box is filled at once; a box somebody
 * wrote in is replaced only after a confirmation — never with the same text in
 * silence, which is what made the button look dead on every seeded record.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SnippetEditor from '../SnippetEditor';
import renderWith from '../../../../../test-utils';
import { SeoPanelProvider } from '../../SeoPanelContext';
import { generateDefaults } from '../../../../../seo';
import { withSeoDefaults } from '../../../seoValues';

const SETTINGS = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  titleTemplates: { default: '%title% %sep% %sitename%' },
  defaults: {},
  knowledgeGraph: { name: 'Squares N Acres' },
};

const ARTICLE = {
  id: 9,
  title: 'Khata Transfer in Bengaluru: The Complete Checklist',
  slug: 'khata-transfer-checklist',
  excerpt: 'What the BBMP asks for, and in what order.',
  content: '<p>Every khata transfer starts at the ward office with the sale deed.</p>',
};

function mountEditor(seo, entity = ARTICLE) {
  const full = withSeoDefaults(seo);
  const api = {
    entityType: 'article',
    entity: { ...entity, seo: full },
    seo: full,
    setSeo: jest.fn(),
    setField: jest.fn(),
    seoSettings: SETTINGS,
    siteUrl: SETTINGS.siteUrl,
    context: { seoSettings: SETTINGS },
    errors: {},
    disabled: false,
    variant: 'full',
    resolved: { title: 'Khata Transfer | Squares N Acres', description: '' },
  };

  renderWith(
    <SeoPanelProvider value={api}>
      <SnippetEditor />
    </SeoPanelProvider>
  );
  return api;
}

/** The two Generate buttons: the title's first, the description's second. */
const generateButtons = () => screen.getAllByRole('button', { name: 'Generate' });

const generated = (key) =>
  generateDefaults('article', ARTICLE, SETTINGS, {
    context: { seoSettings: SETTINGS },
    overwrite: true,
  })[key];

describe('SnippetEditor — Generate', () => {
  it('fills an empty title at once and says where it came from', async () => {
    const api = mountEditor({});

    await userEvent.click(generateButtons()[0]);

    expect(api.setField).toHaveBeenCalledWith('title', generated('title'));
    expect(await screen.findByText('Generated from the page’s own facts.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fills an empty description at once', async () => {
    const api = mountEditor({ title: 'Something written' });

    await userEvent.click(generateButtons()[1]);

    expect(api.setField).toHaveBeenCalledWith('description', generated('description'));
  });

  it('asks before replacing a title somebody wrote, then overwrites it', async () => {
    const api = mountEditor({ title: 'My own careful title' });

    await userEvent.click(generateButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Replace the SEO title you wrote with a generated one?')
    ).toBeInTheDocument();
    expect(api.setField).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace it' }));

    expect(api.setField).toHaveBeenCalledWith('title', generated('title'));
    expect(await screen.findByText('Generated from the page’s own facts.')).toBeInTheDocument();
  });

  it('keeps a written description when the replacement is cancelled', async () => {
    const api = mountEditor({ description: 'A description I wrote myself.' });

    await userEvent.click(generateButtons()[1]);
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Replace the meta description you wrote with a generated one?')
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(api.setField).not.toHaveBeenCalled();
  });

  it('says so instead of rewriting the same text', async () => {
    const api = mountEditor({ title: generated('title') });

    await userEvent.click(generateButtons()[0]);

    expect(
      await screen.findByText('The generated SEO title is the one already in the box.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.setField).not.toHaveBeenCalled();
  });

  it('says why when there is nothing to generate from', async () => {
    const api = mountEditor(
      {},
      { id: 10, title: 'A title', slug: 'a-title', content: '', excerpt: '' }
    );

    await userEvent.click(generateButtons()[1]);

    expect(
      await screen.findByText(
        'No meta description could be generated — the record has no summary or body text to take one from.'
      )
    ).toBeInTheDocument();
    expect(api.setField).not.toHaveBeenCalled();
  });
});
