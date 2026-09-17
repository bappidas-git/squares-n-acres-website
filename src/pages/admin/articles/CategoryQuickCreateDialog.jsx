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
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(category: object) => void} props.onCreated the new record
 */
export default function CategoryQuickCreateDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setError('');
    setSaving(false);
  }, [open]);

  const slug = slugify(name);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('A category needs a name of at least two characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await masterDataService.articleCategories.create({
        name: trimmed,
        slug,
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setError(firstFieldMessage(thrown, 'The category could not be created.'));
      setSaving(false);
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
            onChange={(event) => setName(event.target.value)}
          />
        </FormColumn>
      </FormSection>
    </Modal>
  );
}
