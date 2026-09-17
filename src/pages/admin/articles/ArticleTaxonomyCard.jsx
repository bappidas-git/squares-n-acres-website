import { useCallback, useState } from 'react';
import { Icon } from '@iconify/react';

import CategoryQuickCreateDialog from './CategoryQuickCreateDialog';
import MultiSelect from '../../../components/admin/MultiSelect';
import masterDataService from '../../../services/masterDataService';
import { Button, SelectField } from '../../../components/ui';
import { firstFieldMessage } from '../../../services/apiError';
import { slugify } from '../../../utils/slug';
import { toTaxonomyOptions } from './useArticleTaxonomy';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './ArticleFormPage.module.css';

/**
 * The rail's classification card: the category, the tags and the author
 * (§6.8).
 *
 * **Tags are created as they are typed.** An editor writing about khata
 * transfers should not have to open a second screen to add the tag, so the
 * multi-select is creatable: an unknown entry becomes a `POST
 * /admin/article-tags` and the record it returns is selected. The name is
 * trimmed and lower-cased on the way in because `Khata `, `khata` and `KHATA`
 * are one tag, and its slug is the one the API would derive anyway (§5.9) — so
 * the archive at `/insights/articles/tag/khata` never splits in two.
 *
 * The category has a quick-create of its own rather than a creatable select: a
 * category is a section of the site with a URL and a landing page, so it is
 * worth the one dialog that says so.
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 * @param {ReturnType<import('./useArticleTaxonomy').default>} props.taxonomy
 */
export default function ArticleTaxonomyCard({ form, taxonomy }) {
  const { values, errors, setField, readOnly, saving } = form;
  const { categories, tags, authors, addCategory, addTag } = taxonomy;
  const toast = useToast();

  const [creatingCategory, setCreatingCategory] = useState(false);
  const disabled = readOnly || saving;

  /**
   * Creates a tag from what was typed, or selects the one that already exists
   * under that name — a duplicate is the same tag, not an error.
   *
   * `Khata `, `khata` and `KHATA` are one tag, so the name is trimmed and
   * lower-cased and the loaded list is checked first. A 409 means the tag exists
   * on the server but not in the list this screen loaded, so it is looked up and
   * selected rather than reported: the editor asked for a tag, and the tag is
   * there.
   *
   * @param {string} label
   * @returns {Promise<{value: number, label: string}|null>}
   */
  const createTag = useCallback(
    async (label) => {
      const name = String(label ?? '')
        .trim()
        .toLowerCase();
      const slug = slugify(name);
      if (!slug) return null;

      const known = tags.find(
        (tag) => tag.slug === slug || String(tag.name).trim().toLowerCase() === name
      );
      if (known) return { value: known.id, label: known.name };

      try {
        const { data } = await masterDataService.articleTags.create({ name, slug });
        if (!data?.id) return null;
        addTag(data);
        return { value: data.id, label: data.name };
      } catch (thrown) {
        if (thrown?.status === 409) {
          const found = await findTagBySlug(slug);
          if (found) {
            addTag(found);
            return { value: found.id, label: found.name };
          }
        }
        toast.error(firstFieldMessage(thrown, 'The tag could not be created.'));
        return null;
      }
    },
    [addTag, tags, toast]
  );

  return (
    <aside className={styles.card} aria-labelledby="article-taxonomy">
      <h2 className={styles.cardTitle} id="article-taxonomy">
        Classification
      </h2>

      <SelectField
        label="Category"
        required
        placeholder="Select a category"
        options={toTaxonomyOptions(categories)}
        value={values.categoryId ?? ''}
        error={errors.categoryId}
        disabled={disabled}
        hint="One category per article; it decides the archive the article appears in."
        onChange={(event) => setField('categoryId', event.target.value)}
      />
      {readOnly ? null : (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
          onClick={() => setCreatingCategory(true)}
        >
          Add a category
        </Button>
      )}

      <MultiSelect
        label="Tags"
        options={toTaxonomyOptions(tags)}
        value={Array.isArray(values.tagIds) ? values.tagIds : []}
        error={errors.tagIds}
        disabled={disabled}
        creatable={!readOnly}
        onCreate={createTag}
        placeholder="Type to search or add"
        hint="Lower case, one idea each — khata, rera, home loan."
        // De-duplicated here as well as in the payload: `onCreate` returning a
        // tag that is already selected — "stamp-duty" typed over the chosen
        // "Stamp Duty", which is the same slug — appends it a second time, and
        // two identical chips are a worse answer than one.
        onChange={(next) => setField('tagIds', [...new Set(next)])}
      />

      <SelectField
        label="Author"
        required
        placeholder="Select an author"
        // Only active authors are offered — but an article already signed by one
        // who has since been retired keeps showing their name rather than a
        // blank select.
        options={toTaxonomyOptions(
          authors.filter(
            (author) =>
              author.isActive !== false || String(author.id) === String(values.authorId ?? '')
          )
        )}
        value={values.authorId ?? ''}
        error={errors.authorId}
        disabled={disabled}
        hint="Shown on the article and on the author's own page."
        onChange={(event) => setField('authorId', event.target.value)}
      />

      <CategoryQuickCreateDialog
        open={creatingCategory}
        onClose={() => setCreatingCategory(false)}
        onCreated={(created) => {
          setCreatingCategory(false);
          if (!created?.id) return;
          addCategory(created);
          setField('categoryId', created.id);
          toast.success(`“${created.name}” created and selected.`);
        }}
      />
    </aside>
  );
}

/**
 * The tag that already holds a slug, as the API answers it.
 *
 * Asked only after a 409, which is the one case where a tag exists but this
 * screen's list does not know it.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function findTagBySlug(slug) {
  try {
    const { data } = await masterDataService.articleTags.adminList({ q: slug, perPage: 20 });
    return (Array.isArray(data) ? data : []).find((tag) => tag.slug === slug) ?? null;
  } catch {
    // The lookup is a nicety; the refusal is still reported by the caller.
    return null;
  }
}
