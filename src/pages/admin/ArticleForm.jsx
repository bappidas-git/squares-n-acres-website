import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
  Divider,
  Dialog,
  DialogContent,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { Icon } from '@iconify/react';
import articleService from '../../services/articleService';
import toLegacyArticle, { toLegacyArticles } from '../../utils/adapters/legacyArticle';
import { Alert } from '../../components/ui';

import { SITE } from '../../config/site';
import { useToast } from '../../components/common/ToastProvider';

const generateSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const generateExcerpt = (content) => {
  if (!content) return '';
  // Strip markdown headings and get first paragraph
  const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  return lines[0]?.slice(0, 200) || '';
};

const emptyForm = {
  title: '',
  slug: '',
  category: 'market-trends',
  tags: [],
  image: '',
  content: '',
  excerpt: '',
  author: 'Editorial Team',
  readTime: 5,
  seoTitle: '',
  seoDescription: '',
  isActive: false,
  publishedAt: new Date().toISOString(),
  relatedArticleIds: [],
};

const MarkdownHelpModal = ({ open, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{
      sx: { borderRadius: 3, maxHeight: '90vh' },
    }}
  >
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2.5,
        pb: 1.5,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-charcoal)' }}>
        Markdown Writing Guide
      </Typography>
      <IconButton onClick={onClose} size="small" sx={{ color: 'var(--color-text-muted)' }}>
        <Icon icon="mdi:close" />
      </IconButton>
    </Box>
    <DialogContent sx={{ p: 3 }}>
      <Box
        sx={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          color: 'var(--color-text)',
          lineHeight: 1.7,
          '& h3': {
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--color-charcoal)',
            mt: 3,
            mb: 1,
          },
          '& h4': {
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--color-charcoal)',
            mt: 2,
            mb: 0.75,
          },
          '& code': {
            bgcolor: 'var(--color-surface)',
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-warning-dark)',
          },
          '& pre': {
            bgcolor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 2,
            p: 2,
            overflow: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6,
            mb: 2,
            '& code': { bgcolor: 'transparent', p: 0, color: 'var(--color-text)' },
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            mb: 2,
            '& th': {
              bgcolor: 'var(--color-surface)',
              p: 1,
              textAlign: 'left',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderBottom: '2px solid var(--color-border)',
            },
            '& td': { p: 1, fontSize: '0.8rem', borderBottom: '1px solid var(--color-surface)' },
          },
        }}
      >
        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mb: 3 }}>
          This editor supports Markdown syntax. Use the following formatting options to create rich
          article content.
        </Typography>

        <h3>Headings</h3>
        <p>
          Use <code>#</code> symbols to create headings. Headings with <code>##</code> appear in the
          Table of Contents automatically.
        </p>
        <pre>
          <code>{`## Section Heading (H2 — appears in TOC)\n### Subsection Heading (H3)`}</code>
        </pre>

        <h3>Text Formatting</h3>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Syntax</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bold</td>
              <td>
                <code>**bold text**</code>
              </td>
              <td>
                <strong>bold text</strong>
              </td>
            </tr>
            <tr>
              <td>Italic</td>
              <td>
                <code>*italic text*</code>
              </td>
              <td>
                <em>italic text</em>
              </td>
            </tr>
            <tr>
              <td>Underline</td>
              <td>
                <code>{'<u>underlined</u>'}</code>
              </td>
              <td>
                <u>underlined</u>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>Lists</h3>
        <h4>Bullet List</h4>
        <pre>
          <code>{`- First item\n- Second item\n- Third item`}</code>
        </pre>

        <h4>Numbered List</h4>
        <pre>
          <code>{`1. First item\n2. Second item\n3. Third item`}</code>
        </pre>

        <h3>Links</h3>
        <pre>
          <code>{`[Link Text](https://example.com)`}</code>
        </pre>

        <h3>Images</h3>
        <pre>
          <code>{`![Alt text](https://example.com/image.jpg)`}</code>
        </pre>

        <h3>Tables</h3>
        <p>
          Create tables using pipes <code>|</code> and dashes <code>-</code>:
        </p>
        <pre>
          <code>{`| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Data 1   | Data 2   | Data 3   |\n| Data 4   | Data 5   | Data 6   |`}</code>
        </pre>

        <h3>Blockquotes</h3>
        <pre>
          <code>{`> This is a blockquote.\n> It can span multiple lines.`}</code>
        </pre>

        <h3>Horizontal Rule</h3>
        <pre>
          <code>{`---`}</code>
        </pre>

        <h3>Line Breaks</h3>
        <p>
          Press <strong>Enter</strong> twice for a new paragraph. Use a blank line between blocks of
          content for proper spacing.
        </p>

        <Divider sx={{ my: 3 }} />

        <h3>Best Writing Practices</h3>
        <Box component="ul" sx={{ pl: 2.5, '& li': { mb: 1 } }}>
          <li>Start with a compelling introduction that hooks the reader.</li>
          <li>
            Use <code>##</code> headings to break content into scannable sections.
          </li>
          <li>Keep paragraphs short (3-4 sentences max) for readability.</li>
          <li>Use bullet points for lists of features, benefits, or steps.</li>
          <li>Include tables for comparison data (e.g., price ranges, area stats).</li>
          <li>
            Bold <strong>key terms</strong> and important numbers for emphasis.
          </li>
          <li>End with a clear "Key Takeaways" or conclusion section.</li>
          <li>Aim for 800-1500 words for optimal SEO and engagement.</li>
          <li>Add relevant tags after writing to improve discoverability.</li>
        </Box>
      </Box>
    </DialogContent>
  </Dialog>
);

// Host shown in the Google search preview (display form, no scheme).
const PREVIEW_HOST = SITE.placeholderDomain.replace(/^https?:\/\//, '');

const GooglePreview = ({ title, description }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      bgcolor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
    }}
  >
    <Typography sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', mb: 0.5 }}>
      Google Search Preview
    </Typography>
    <Typography
      sx={{
        fontSize: '1.125rem',
        color: 'var(--color-serp-title)',
        fontFamily: 'var(--font-serp)',
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {title || `Article Title — ${SITE.name}`}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.8125rem',
        color: 'var(--color-serp-url)',
        fontFamily: 'var(--font-serp)',
        mt: 0.25,
      }}
    >
      {PREVIEW_HOST}/insights/articles/...
    </Typography>
    <Typography
      sx={{
        fontSize: '0.8125rem',
        color: 'var(--color-serp-text)',
        fontFamily: 'var(--font-serp)',
        mt: 0.25,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {description ||
        'Add an SEO description to control how this article appears in search results.'}
    </Typography>
  </Paper>
);

const ArticleForm = () => {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [markdownHelpOpen, setMarkdownHelpOpen] = useState(false);
  const [allArticles, setAllArticles] = useState([]);
  const [selectedRelatedArticles, setSelectedRelatedArticles] = useState([]);
  // Categories are master data (§6.8) rather than a constant in the bundle;
  // prompt 33 rewrites this screen around the same endpoint.
  const [categories, setCategories] = useState([]);

  const fetchArticle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: record } = await articleService.adminGet(id);
      const data = toLegacyArticle(record) ?? {};
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        category: data.categorySlug || '',
        tags: data.tags || [],
        image: data.image || '',
        content: data.content || '',
        excerpt: data.excerpt || '',
        author: data.author || '',
        readTime: data.readTime || 5,
        seoTitle: record?.seo?.title || '',
        seoDescription: record?.seo?.description || '',
        isActive: data.isActive ?? false,
        publishedAt: data.publishedAt || new Date().toISOString(),
        relatedArticleIds: record?.relatedArticleIds || [],
      });
      setSlugManuallyEdited(true);
    } catch (thrown) {
      toast.error(thrown?.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  // Fetch all articles for the Related Articles selector
  const fetchAllArticles = useCallback(async () => {
    try {
      const { data } = await articleService.adminList({ perPage: 100 });
      setAllArticles(toLegacyArticles(data));
    } catch {
      setAllArticles([]);
      toast.warning('Could not load related articles');
    }
  }, [toast]);

  useEffect(() => {
    fetchArticle();
    fetchAllArticles();
  }, [fetchArticle, fetchAllArticles]);

  useEffect(() => {
    const controller = new AbortController();

    articleService
      .categories({ perPage: 100 }, { signal: controller.signal })
      .then(({ data }) => {
        setCategories(
          (Array.isArray(data) ? data : []).map((category) => ({
            value: category.slug,
            label: category.name,
          }))
        );
      })
      .catch(() => {
        // The select stays empty and the stored category is kept as it is; the
        // save does not depend on this list.
      });

    return () => controller.abort();
  }, []);

  // Sync selectedRelatedArticles when form and allArticles are ready
  useEffect(() => {
    if (allArticles.length > 0 && form.relatedArticleIds?.length > 0) {
      const selected = allArticles.filter((a) => form.relatedArticleIds.includes(a.id));
      setSelectedRelatedArticles(selected);
    }
  }, [allArticles, form.relatedArticleIds]);

  const updateField = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title
      if (field === 'title' && !slugManuallyEdited) {
        updated.slug = generateSlug(value);
      }
      // Auto-generate excerpt from content
      if (field === 'content' && !prev.excerpt) {
        updated.excerpt = generateExcerpt(value);
      }
      return updated;
    });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  /**
   * Saving is disabled while this form still speaks the boilerplate's shape.
   * An article now carries `categoryId`, `authorId`, `tagIds[]`,
   * `featuredImage{}`, `status` and a nested `seo{}` (§6.8), and the pickers
   * here offer hardcoded category and author strings that no longer exist.
   * Prompt 33 rebuilds the form against the contract; sending this payload in
   * the meantime would silently drop most of what an editor typed.
   */
  const savingDisabled = true;

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton height={40} width={300} sx={{ mb: 2 }} />
        <Skeleton height={56} sx={{ mb: 2 }} />
        <Skeleton height={56} sx={{ mb: 2 }} />
        <Skeleton height={200} sx={{ mb: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            startIcon={<Icon icon="mdi:arrow-left" />}
            onClick={() => navigate('/admin/articles')}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)' }}
          >
            Back
          </Button>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            {isEditing ? 'Edit Article' : 'New Article'}
          </Typography>
        </Box>
      </Box>

      {/* Main Form */}
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: '1px solid var(--color-surface)', mb: 3 }}
      >
        <Typography
          sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', mb: 2 }}
        >
          Article Details
        </Typography>

        {/* Title */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            Title *
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter article title..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Slug */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            Slug
            <Typography
              component="span"
              sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', ml: 1 }}
            >
              (auto-generated from title)
            </Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={form.slug}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              updateField('slug', e.target.value);
            }}
            placeholder="article-url-slug"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Category & Author */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={form.category}
              label="Category"
              onChange={(e) => updateField('category', e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {categories.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Author"
            value={form.author}
            onChange={(e) => updateField('author', e.target.value)}
            sx={{ flex: 1, minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Tags */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            Tags
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              variant="outlined"
              onClick={handleAddTag}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text)',
              }}
            >
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {form.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={() => handleRemoveTag(tag)}
                sx={{ fontSize: '0.75rem', bgcolor: 'var(--color-surface)' }}
              />
            ))}
          </Box>
        </Box>

        {/* Featured Image */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            Featured Image URL
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={form.image}
            onChange={(e) => updateField('image', e.target.value)}
            placeholder="https://example.com/image.jpg"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Content */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Content *{' '}
              <Typography
                component="span"
                sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}
              >
                (Markdown supported)
              </Typography>
            </Typography>
            <IconButton
              size="small"
              onClick={() => setMarkdownHelpOpen(true)}
              title="Markdown syntax guide"
              sx={{
                width: 22,
                height: 22,
                bgcolor: 'var(--color-info-bg)',
                color: 'var(--color-info-dark)',
                '&:hover': { bgcolor: 'var(--color-info-bg)' },
              }}
            >
              <Icon icon="mdi:help-circle-outline" width={16} />
            </IconButton>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={16}
            value={form.content}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder="Write your article content here... Markdown is supported."
            InputProps={{
              sx: { fontFamily: 'var(--font-mono)', fontSize: '0.875rem' },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Excerpt */}
        <Box>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            Excerpt
            <Typography
              component="span"
              sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', ml: 1 }}
            >
              (auto-generated from first paragraph, editable)
            </Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            value={form.excerpt}
            onChange={(e) => updateField('excerpt', e.target.value)}
            placeholder="Brief summary of the article..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>
      </Paper>

      {/* Related Articles */}
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: '1px solid var(--color-surface)', mb: 3 }}
      >
        <Typography
          sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', mb: 0.5 }}
        >
          Related Articles
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', mb: 2 }}>
          Select articles to show in the "Related Articles" section. If none selected, the system
          will auto-suggest based on category.
        </Typography>
        <Autocomplete
          multiple
          options={allArticles.filter((a) => a.id !== id)}
          getOptionLabel={(option) => option.title || ''}
          value={selectedRelatedArticles}
          onChange={(_, newValue) => setSelectedRelatedArticles(newValue)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search and select articles..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...rest } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  {...rest}
                  label={option.title}
                  size="small"
                  sx={{ fontSize: '0.75rem', bgcolor: 'var(--color-surface)', maxWidth: 280 }}
                />
              );
            })
          }
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <Box
                key={key}
                component="li"
                {...rest}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start !important',
                  gap: 0.25,
                  py: 1,
                }}
              >
                <Typography
                  sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}
                >
                  {option.title}
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                  {option.category
                    ? option.category
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')
                    : ''}{' '}
                  {option.publishedAt
                    ? `• ${new Date(option.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : ''}
                </Typography>
              </Box>
            );
          }}
          noOptionsText="No articles available"
          sx={{ mb: 1 }}
        />
        {selectedRelatedArticles.length > 0 && (
          <Typography sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            {selectedRelatedArticles.length} article
            {selectedRelatedArticles.length !== 1 ? 's' : ''} selected
          </Typography>
        )}
      </Paper>

      {/* SEO Section */}
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: '1px solid var(--color-surface)', mb: 3 }}
      >
        <Typography
          sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)', mb: 2 }}
        >
          SEO Settings
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          <GooglePreview
            title={form.seoTitle || form.title}
            description={form.seoDescription || form.excerpt}
          />
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            SEO Title
            <Typography
              component="span"
              sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', ml: 1 }}
            >
              {(form.seoTitle || '').length}/70
            </Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={form.seoTitle}
            onChange={(e) => updateField('seoTitle', e.target.value)}
            placeholder={form.title || 'SEO title...'}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        <Box>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', mb: 0.75 }}
          >
            SEO Description
            <Typography
              component="span"
              sx={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', ml: 1 }}
            >
              {(form.seoDescription || '').length}/160
            </Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            value={form.seoDescription}
            onChange={(e) => updateField('seoDescription', e.target.value)}
            placeholder={form.excerpt || 'SEO description...'}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid var(--color-surface)' }}>
        <Alert tone="info" title="Article saving is being rebuilt (prompt 33)">
          This form still uses the previous article shape. It loads and previews the real record,
          but saving stays switched off until the editor and its category, author and tag pickers
          are rebuilt against the current API.
        </Alert>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap', mt: 2 }}>
          <Button
            onClick={() => navigate('/admin/articles')}
            sx={{ textTransform: 'none', color: 'var(--color-text-muted)' }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            disabled={savingDisabled}
            startIcon={<Icon icon="mdi:content-save-outline" />}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text)',
            }}
          >
            Save draft
          </Button>
          <Button
            variant="contained"
            disabled={savingDisabled}
            startIcon={<Icon icon="mdi:publish" />}
            sx={{
              textTransform: 'none',
              bgcolor: 'var(--color-charcoal)',
              borderRadius: 2,
              px: 4,
              '&:hover': { bgcolor: 'var(--color-charcoal)' },
            }}
          >
            {isEditing ? 'Update and publish' : 'Publish'}
          </Button>
        </Box>
      </Paper>

      {/* Markdown Help Modal */}
      <MarkdownHelpModal open={markdownHelpOpen} onClose={() => setMarkdownHelpOpen(false)} />
    </Box>
  );
};

export default ArticleForm;
