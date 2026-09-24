import { useCallback, useRef } from 'react';

/**
 * Stable keys for the rows of a list of plain values — a locality's
 * highlights, a job's requirements — which carry no id of their own.
 *
 * Keyed by index, a row that moved took the key of the place it moved to, so
 * `SortableList`, which finds the moved row by its key to hand it the focus,
 * found the neighbour now sitting in its old place: the second Alt+↓ moved the
 * neighbour back and undid the first, and a second Enter on a "Move down"
 * arrow did the same (QA-60, QA-59's A1 in the lists of a form). A key here
 * follows its value through a move and a removal; a row added at the end gets
 * a new one.
 *
 *   const rows = useRowKeys(values.length);
 *   const items = values.map((text, index) => ({ id: rows.keys[index], text }));
 *   // onReorder: rows.move(move.from, move.to); onChange(next values)
 *   // remove:    rows.remove(index);            onChange(values without it)
 *
 * A list replaced from outside — a form reset to the record it saved — keeps
 * its keys by position, which is all such a list can promise.
 *
 * @param {number} length how many rows the list holds now
 * @returns {{keys: Array<string>, move: (from: number, to: number) => void,
 *   remove: (index: number) => void}}
 */
export default function useRowKeys(length) {
  const keys = useRef([]);
  const counter = useRef(0);

  // Brought in line with the list during render: a row added at the end gets
  // a fresh key, and rows gone from the end take theirs with them. Both are
  // idempotent, so a render that runs twice changes nothing the second time.
  const list = keys.current;
  while (list.length < length) {
    counter.current += 1;
    list.push(`row-${counter.current}`);
  }
  if (list.length > length) list.length = Math.max(0, length);

  const move = useCallback((from, to) => {
    const current = keys.current;
    if (from === to || from < 0 || from >= current.length) return;
    const [key] = current.splice(from, 1);
    current.splice(Math.min(Math.max(to, 0), current.length), 0, key);
  }, []);

  const remove = useCallback((index) => {
    if (index < 0 || index >= keys.current.length) return;
    keys.current.splice(index, 1);
  }, []);

  return { keys: list.slice(0, length), move, remove };
}
