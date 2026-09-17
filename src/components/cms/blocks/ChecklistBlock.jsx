import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import storage from '../../../utils/storage';
import { Button, Container, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

/**
 * Things to tick off (§6.10 `checklist`) — the documents a home loan needs,
 * the checks before a deposit.
 *
 * It is interactive because a checklist nobody can tick is a list. Progress is
 * kept in the visitor's own browser under `sna_checklist:<pageSlug>` (§4.2,
 * D10), never sent anywhere: a half-finished document list is the visitor's
 * business, and it survives the tab being closed, which is the whole point when
 * the list takes a week to work through.
 *
 * The bar is a real `role="progressbar"` with its value announced, and each row
 * is a native checkbox, so a keyboard and a screen reader get the same list a
 * mouse does (§8.3).
 */

/** The storage key of one page's progress (§4.2). */
export const checklistStorageKey = (slug) => `sna_checklist:${slug || 'page'}`;

export default function ChecklistBlock({ data = {}, page = {}, background = 'bg' }) {
  const items = useMemo(
    () => (Array.isArray(data.items) ? data.items : []).filter((item) => item?.text),
    [data.items]
  );

  const key = checklistStorageKey(page.slug);
  const [done, setDone] = useState(() => new Set());

  // Read once per page, after mount: the value belongs to this browser, and a
  // private window that refuses storage simply starts with nothing ticked.
  useEffect(() => {
    const stored = storage.getItem(key, []);
    setDone(new Set(Array.isArray(stored) ? stored.map(String) : []));
  }, [key]);

  const persist = useCallback(
    (next) => {
      setDone(next);
      storage.setItem(key, [...next]);
    },
    [key]
  );

  if (items.length === 0) return null;

  const toggle = (index) => {
    const next = new Set(done);
    const entry = String(index);
    if (next.has(entry)) next.delete(entry);
    else next.add(entry);
    persist(next);
  };

  const checked = items.filter((_item, index) => done.has(String(index))).length;
  const percent = Math.round((checked / items.length) * 100);

  return (
    <Section background={background} spacing="lg">
      <Container size="narrow">
        {data.title ? <SectionHeader title={data.title} subtitle={data.intro} /> : null}

        <div className={styles.progress}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={checked}
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-label={`${data.title || 'Checklist'} progress`}
          >
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
          <p className={styles.progressText} aria-live="polite">
            {checked} of {items.length} done
          </p>
          {checked > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => persist(new Set())}>
              Reset
            </Button>
          ) : null}
        </div>

        <ul className={styles.checklist}>
          {items.map((item, index) => {
            const isDone = done.has(String(index));
            const inputId = `${key}-${index}`;
            return (
              <li key={`${item.text}-${index}`} className={styles.checkItem}>
                <input
                  id={inputId}
                  type="checkbox"
                  className={styles.checkBox}
                  checked={isDone}
                  onChange={() => toggle(index)}
                />
                <label
                  htmlFor={inputId}
                  className={[styles.checkLabel, isDone ? styles.checkDone : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.checkMark} aria-hidden="true">
                    <Icon icon="mdi:check" width="16" height="16" />
                  </span>
                  <span className={styles.checkText}>
                    <span className={styles.checkTitle}>{item.text}</span>
                    {item.detail ? <span className={styles.checkDetail}>{item.detail}</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

ChecklistBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.text);
