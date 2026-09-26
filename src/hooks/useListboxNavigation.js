import { useCallback, useState } from 'react';

/**
 * The keyboard of a combobox: an input that keeps the focus while a listbox it
 * controls shows the options (`aria-activedescendant`, WAI-ARIA combobox).
 *
 * One pattern for every combobox of the admin — the record pickers, the folder
 * field, the quick search (prompt 51) — so each behaves as the others do:
 *
 *   - ArrowDown / ArrowUp move the highlight across the options that can be
 *     picked, wrapping at the ends; Home / End jump to the first and last;
 *   - Enter picks the highlighted option (and only then does it keep the form
 *     from submitting);
 *   - Escape closes an open list, and only then stops there — a second Escape
 *     reaches the dialog around it.
 *
 * The focus never leaves the input, so a `blur` is always the editor leaving
 * the field — never a keyboard user reaching an option.
 *
 *   const nav = useListboxNavigation({ id, options, open, onPick, onClose });
 *   <input aria-activedescendant={nav.activeDescendant} onKeyDown={nav.onKeyDown} />
 *   <li id={nav.optionId(index)} data-active={index === nav.activeIndex} />
 *
 * @template T
 * @param {object} config
 * @param {string} config.id the listbox's own id — option ids are derived from it
 * @param {Array<T>} config.options what the list shows, in order
 * @param {boolean} config.open whether the list is showing
 * @param {(option: T, index: number) => boolean} [config.isDisabled]
 * @param {(option: T, index: number) => void} config.onPick
 * @param {() => void} [config.onClose]
 * @param {() => void} [config.onOpen] ArrowDown on a closed list
 * @param {string} [config.resetKey] what "another set of options" means — the
 *   query that produced them; the highlight starts again when it changes (and
 *   when the count of options or `open` does)
 * @returns {{activeIndex: number, setActiveIndex: Function, optionId: (index: number) => string,
 *   activeDescendant: string|undefined, onKeyDown: (event: KeyboardEvent) => void}}
 */
export default function useListboxNavigation({
  id,
  options,
  open,
  isDisabled = () => false,
  onPick,
  onClose,
  onOpen,
  resetKey = '',
}) {
  const [activeIndex, setActiveIndex] = useState(-1);

  // A new set of options — another search, another folder list — starts with
  // nothing highlighted, as does a list that has closed. Settled in the render
  // it changes in, so no frame points `aria-activedescendant` at an option
  // that is gone. Compared by value, never by the array's identity: a caller
  // that derives its options on every render must not loop.
  const signature = `${open ? 1 : 0}|${options.length}|${resetKey}`;
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    if (activeIndex !== -1) setActiveIndex(-1);
  }

  const optionId = useCallback((index) => `${id}-option-${index}`, [id]);

  const step = useCallback(
    (from, direction) => {
      const count = options.length;
      if (count === 0) return -1;
      for (let offset = 1; offset <= count; offset += 1) {
        const index = (from + direction * offset + count * 2) % count;
        if (!isDisabled(options[index], index)) return index;
      }
      return -1;
    },
    [options, isDisabled]
  );

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!open) {
          if (event.key === 'ArrowDown' && onOpen) {
            event.preventDefault();
            onOpen();
          }
          return;
        }
        event.preventDefault();
        const from = activeIndex === -1 ? (event.key === 'ArrowDown' ? -1 : 0) : activeIndex;
        setActiveIndex(step(from, event.key === 'ArrowDown' ? 1 : -1));
        return;
      }

      if (!open) return;

      if (event.key === 'Home' || event.key === 'End') {
        if (options.length === 0) return;
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? step(-1, 1) : step(options.length, -1));
        return;
      }

      if (event.key === 'Enter') {
        const option = options[activeIndex];
        if (activeIndex === -1 || option === undefined || isDisabled(option, activeIndex)) return;
        event.preventDefault();
        onPick(option, activeIndex);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex(-1);
        onClose?.();
      }
    },
    [open, onOpen, activeIndex, step, options, isDisabled, onPick, onClose]
  );

  return {
    activeIndex,
    setActiveIndex,
    optionId,
    activeDescendant: open && activeIndex !== -1 ? optionId(activeIndex) : undefined,
    onKeyDown,
  };
}
