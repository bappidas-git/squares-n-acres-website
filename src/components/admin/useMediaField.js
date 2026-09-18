import { useCallback, useMemo, useState } from 'react';

import useCloudinaryConfig from '../../hooks/useCloudinaryConfig';

/**
 * The two buttons an image or file field offers, and the dialog behind them.
 *
 * `ImageField` renders "Media library" and "Upload" only when it is handed a
 * handler for each — a button that does nothing is worse than no button at
 * all — so this hook is what decides whether they appear. "Media library"
 * always does: its Library and URL tabs need no configuration, and pasting a
 * link is how every seed picture and every client-supplied asset gets in.
 * "Upload" appears only once a cloud name and an unsigned preset exist (§7),
 * and it opens the same dialog on its Upload tab rather than being a second
 * mechanism with its own queue, its own limits and its own way of failing.
 *
 *   const media = useMediaField({ accept: 'image', onPick: (one) => onChange(one.url) });
 *   <ImageField … onOpenMedia={media.onOpenMedia} onUpload={media.onUpload} />
 *   <MediaPickerDialog {...media.dialogProps} />
 *
 * The dialog is rendered by the caller, never by this module: the hook lives
 * in every admin form and the picker pulls in the whole library, so importing
 * one from the other would put the library in every form's bundle. `ImageField`
 * loads it lazily, which is why no other form has to think about it.
 *
 * @param {object} [options]
 * @param {(picked: object|object[], all: object[]) => void} [options.onPick]
 * @param {'image'|'document'|'video'|'any'} [options.accept]
 * @param {string} [options.folder] where uploads started from this field are filed
 * @param {boolean} [options.multiple]
 * @returns {{configured: boolean, isOpen: boolean, close: () => void,
 *            onOpenMedia: () => void, onUpload: (() => void)|undefined,
 *            dialogProps: object}}
 */
export default function useMediaField({
  onPick,
  accept = 'image',
  folder = '',
  multiple = false,
} = {}) {
  const { configured } = useCloudinaryConfig();
  const [tab, setTab] = useState(null);

  const close = useCallback(() => setTab(null), []);

  const onSelect = useCallback(
    (items = []) => {
      if (items.length === 0) return;
      // A single-select field wants the item it asked for; a multiple one
      // wants the list, in the order the tiles were pressed (§7).
      onPick?.(multiple ? items : items[0], items);
    },
    [onPick, multiple]
  );

  const dialogProps = useMemo(
    () => ({
      open: tab !== null,
      defaultTab: tab ?? 'library',
      accept,
      folder,
      multiple,
      onSelect,
      onClose: close,
    }),
    [tab, accept, folder, multiple, onSelect, close]
  );

  return {
    configured,
    isOpen: tab !== null,
    close,
    onOpenMedia: useCallback(() => setTab('library'), []),
    // `undefined` rather than a no-op: it is what hides the button (§7).
    onUpload: configured ? () => setTab('upload') : undefined,
    dialogProps,
  };
}
