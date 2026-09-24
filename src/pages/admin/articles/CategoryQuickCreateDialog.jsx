import { useEffect, useState } from 'react';

import FormSection, { FormColumn } from '../../../components/admin/FormSection';
import masterDataService from '../../../services/masterDataService';
import { Button, Modal, TextField } from '../../../components/ui';
import { firstFieldMessage } from '../../../services/apiError';
import { slugify } from '../../../utils/slug';

/**
 * "Add a category", without leaving the article.
 *
 * A category that does not exist yet is the one classification an article
 * cannot be saved without (§6.8 makes `categoryId` required), and sending an
 * editor to `/admin/articles/categories` and back loses everything they have
 * typed. This creates the record with the two fields it needs — the
 * description, the order and the SEO branch stay on the categories screen — and
 * hands it straight back to be selected.
 *
 * The slug follows the name, which is what the API would derive anyway (§5.9);
 * it is shown rather than hidden because it is a public URL from the moment the
 * first article in the category is published.
 *
 * **A name that is already a category is that category.** The editor typed a
 * name, so "The slug has already been taken." answered a question they did not
 * ask (QA-55); the dialog now says which category it is and offers to select
 * it — before the request when the list knows it, after the API's 409 when it
 * does not.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {Array<object>} [props.categories] the categories already loaded
 * @param {() => void} props.onClose
 * @param {(category: object) => void} props.onCreated the new record — or the
 *   existing one the editor chose to select instead
 */
export default function CategoryQuickCreateDialog({ open, categories = [], onClose, onCreated }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setError('');
    setExisting(null);
    setSaving(false);
  }, [open]);

  const slug = slugify(name);

  /** The loaded category a name or its slug already belongs to. */
  const findExisting = (typed) => {
    const wanted = typed.trim().toLowerCase();
    const wantedSlug = slugify(typed);
    return (
      categories.find(
        (category) =>
          String(category.name ?? '')
            .trim()
            .toLowerCase() === wanted ||
          (wantedSlug && category.slug === wantedSlug)
      ) ?? null
    );
  };

  const refuseAsExisting = (category) => {
    setExisting(category);
    setError(`“${category.name}” is already a category.`);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('A category needs a name of at least two characters.');
      return;
    }

    const known = findExisting(trimmed);
    if (known) {
      refuseAsExisting(known);
      return;
    }

    setSaving(true);
    setError('');
    setExisting(null);
    try {
      const response = await masterDataService.articleCategories.create({
        name: trimmed,
        slug,
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setSaving(false);
      // Created elsewhere since this screen loaded its list: find it by slug.
      if (thrown?.status === 409) {
        const found = await findCategoryBySlug(slug);
        if (found) {
          refuseAsExisting(found);
          return;
        }
      }
      setError(firstFieldMessage(thrown, 'The category could not be created.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add a category"
      description="It is created in the article taxonomy and selected here. Its description and search settings can be filled in later."
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {existing ? (
            <Button variant="outline" onClick={() => onCreated?.(existing, { existing: true })}>
              Select “{existing.name}”
            </Button>
          ) : null}
          <Button onClick={submit} loading={saving}>
            Create and select
          </Button>
        </>
      }
    >
      <FormSection plain>
        <FormColumn>
          <TextField
            label="Name"
            required
            autoFocus
            value={name}
            error={error}
            maxLength={120}
            placeholder="e.g. Rental Guides"
            hint={slug ? `The archive will live at /insights/articles/category/${slug}` : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setExisting(null);
              setError('');
            }}
          />
        </FormColumn>
      </FormSection>
    </Modal>
  );
}

/**
 * The category that already holds a slug, as the API answers it — asked only
 * after a 409, the one case where it exists but the loaded list lacks it.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function findCategoryBySlug(slug) {
  try {
    const { data } = await masterDataService.articleCategories.adminList({ q: slug, perPage: 20 });
    return (Array.isArray(data) ? data : []).find((category) => category.slug === slug) ?? null;
  } catch {
    return null;
  }
}
