import { Icon } from '@iconify/react';

import { Alert, Button, DateField, RadioGroup, SwitchField } from '../../../components/ui';
import { ARTICLE_STATUS } from '../../../config/enums';
import { formatDate, formatDateTime, formatRelative } from '../../../utils/format';

import styles from './ArticleFormPage.module.css';

/**
 * The rail's first card: what state the article is in, and when it goes live.
 *
 * The four states of §6.8 are a radio group rather than a select, because they
 * are not four values of one field to an editor — they are four different
 * things to do, and each needs a sentence saying what it means. `scheduled` is
 * the one that needs an answer as well as a choice, so the datetime field
 * appears under it and disappears with it.
 *
 * **The clock is Bengaluru's.** `datetime-local` has no timezone of its own, so
 * the value is converted to and from IST by `utils/articleUtils` (§1, D22) and
 * the helper line says so — an editor scheduling "Tuesday 06:30" means 06:30 in
 * the city the site is about, wherever their laptop happens to be.
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 */
export default function ArticleStatusCard({ form, lookup }) {
  const {
    values,
    errors,
    setField,
    readOnly,
    saving,
    previewing,
    preview,
    previewChanges,
    publicPath,
    isNew,
    record,
  } = form;
  // A published article is previewed without saving it live (prompt 51).
  const liveNow = !isNew && record?.status === 'published';

  const status = values.status ?? 'draft';
  const scheduled = status === 'scheduled';
  const published = status === 'published';
  // The API refuses a scheduled article whose moment has passed and keys the
  // refusal on the stored field; the control it belongs to is this one.
  const scheduleError = errors.scheduledAt ?? errors.publishedAt;

  return (
    <aside className={styles.card} aria-labelledby="article-status">
      <h2 className={styles.cardTitle} id="article-status">
        Status
      </h2>

      {readOnly ? (
        <Alert tone="info" icon={<Icon icon="mdi:eye-outline" width="20" height="20" />}>
          Read-only access. Your role can open an article but not change it.
        </Alert>
      ) : null}

      <RadioGroup
        label="Where this article stands"
        column
        options={STATUS_CHOICES}
        value={status}
        error={errors.status}
        // Off while a save is out: a status chosen then was silently put back
        // when the answer landed (prompt 51).
        disabled={readOnly || saving}
        onChange={(next) => setField('status', next)}
      />
      <p className={styles.cardNote}>{STATUS_HINT[status]}</p>

      {scheduled ? (
        <DateField
          type="datetime-local"
          label="Goes live at"
          required
          value={values.scheduledAt ?? ''}
          error={scheduleError}
          disabled={readOnly || saving}
          hint="Indian Standard Time. The article appears by itself the moment it arrives."
          onChange={(event) => setField('scheduledAt', event.target.value)}
        />
      ) : null}

      {published && values.publishedAt ? (
        <p className={styles.cardNote}>Live since {formatDateTime(values.publishedAt)}.</p>
      ) : null}
      {values.updatedAtDisplay ? (
        <p className={styles.cardNote}>
          Shown as updated on {formatDate(values.updatedAtDisplay)}.
        </p>
      ) : null}

      <SwitchField
        label="Featured"
        checked={values.isFeatured === true}
        disabled={readOnly || saving}
        hint="Featured articles fill the insights row on the home page."
        onChange={(next) => setField('isFeatured', next)}
      />

      <SwitchField
        label="Table of contents"
        checked={values.tableOfContents !== false}
        disabled={readOnly || saving}
        hint="Builds the in-page list from the H2 and H3 headings of the body."
        onChange={(next) => setField('tableOfContents', next)}
      />

      <div className={styles.cardActions}>
        {liveNow ? (
          <Button
            variant="outline"
            size="sm"
            disabled={saving || readOnly}
            icon={<Icon icon="mdi:eye-outline" width="16" height="16" />}
            onClick={() => previewChanges(lookup)}
          >
            Preview changes
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            loading={previewing}
            disabled={saving || readOnly}
            icon={<Icon icon="mdi:eye-outline" width="16" height="16" />}
            onClick={() => preview()}
          >
            Preview
          </Button>
        )}
        {published && publicPath && !isNew ? (
          <Button
            variant="ghost"
            size="sm"
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
          >
            View on site
          </Button>
        ) : null}
      </div>
      {!isNew && values.updatedAt ? (
        <p className={styles.cardNote}>
          {`Last saved ${formatRelative(values.updatedAt)}${
            values.updatedByName ? ` by ${values.updatedByName}` : ''
          }.`}
        </p>
      ) : null}
      <p className={styles.cardNote}>
        {liveNow
          ? 'Shows your unsaved changes on the live page in a new tab — in this browser only, and once. Nothing is saved; visitors keep seeing the saved article.'
          : isNew
            ? 'A preview saves the article first, then opens it behind a private link that lasts 24 hours.'
            : 'The preview link lasts 24 hours and works while the article is still a draft.'}
      </p>
    </aside>
  );
}

/**
 * The four states, in the order an article moves through them — which is not
 * the order the enum declares them in (§6.17 lists `scheduled` before
 * `published` because that is the order they were specified).
 */
const STATUS_CHOICES = ['draft', 'published', 'scheduled', 'archived'].map((value) => ({
  value,
  label: ARTICLE_STATUS.labelOf(value),
}));

/** What each state means for a visitor. */
const STATUS_HINT = {
  draft: 'Nobody but you can read it. Its URL answers 404.',
  published: 'Live now. The date it first went live is kept.',
  scheduled: 'Live from the moment below, without anybody pressing anything.',
  archived: 'Taken down. The URL answers 404 and the article leaves every list.',
};
