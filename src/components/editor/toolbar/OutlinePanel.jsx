import { Icon } from '@iconify/react';

import styles from '../RichTextEditor.module.css';

/**
 * The document's headings and its counters.
 *
 * An article is judged on its structure before it is read, so the person
 * writing it should be able to see that structure without scrolling: the
 * outline is the H2/H3 list as a search engine will read it, and the counters
 * are the length as a visitor will feel it.
 *
 * @param {object} props
 * @param {Array<{id: string, level: number, text: string, pos: number}>} props.outline
 * @param {{words: number, characters: number, readingTime: number}} props.stats
 * @param {(pos: number) => void} props.onJump
 * @param {number} [props.maxWords] a target, not a limit
 */
export default function OutlinePanel({ outline = [], stats, onJump, maxWords }) {
  const overTarget = Boolean(maxWords) && stats.words > maxWords;

  return (
    <aside className={styles.outline} aria-label="Outline and counters">
      <h3 className={styles.outlineTitle}>Outline</h3>

      {outline.length === 0 ? (
        <p className={styles.outlineEmpty}>
          No headings yet. A heading every few paragraphs is how a long piece stays readable.
        </p>
      ) : (
        <ol className={styles.outlineList}>
          {outline.map((heading) => (
            <li key={heading.id} data-level={heading.level}>
              <button
                type="button"
                className={styles.outlineItem}
                onClick={() => onJump(heading.pos)}
              >
                {heading.text || 'Untitled heading'}
              </button>
            </li>
          ))}
        </ol>
      )}

      <dl className={styles.outlineStats}>
        <div>
          <dt>Words</dt>
          <dd className={overTarget ? styles.outlineOver : undefined}>
            {stats.words.toLocaleString('en-IN')}
            {maxWords ? ` / ${maxWords.toLocaleString('en-IN')}` : ''}
          </dd>
        </div>
        <div>
          <dt>Characters</dt>
          <dd>{stats.characters.toLocaleString('en-IN')}</dd>
        </div>
        <div>
          <dt>Reading time</dt>
          <dd>
            <Icon icon="mdi:clock-outline" width="14" height="14" aria-hidden="true" />{' '}
            {stats.readingTime} min
          </dd>
        </div>
      </dl>
    </aside>
  );
}
