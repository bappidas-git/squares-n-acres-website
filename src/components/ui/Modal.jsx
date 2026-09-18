import { useId } from 'react';
import Dialog from '@mui/material/Dialog';

import useBreakpoint from '../../hooks/useBreakpoint';
import useScrollLock from '../../hooks/useScrollLock';

import BottomSheet from './BottomSheet';
import IconButton from './IconButton';
import styles from './Modal.module.css';

/**
 * The dialog of the design system.
 *
 * MUI's `Dialog` provides the focus trap, the `Escape` handler, the backdrop
 * click, `role="dialog"`, `aria-modal` and the restore-focus-to-trigger
 * behaviour; this wrapper adds the house chrome and the mobile presentations:
 * `mobile="sheet"` renders a `BottomSheet` below 900px, `mobile="fullscreen"`
 * makes the dialog fill the screen.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.footer]
 * @param {'sheet'|'fullscreen'|'dialog'} [props.mobile]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.dismissible] `false` blocks Escape and backdrop clicks
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  mobile = 'dialog',
  size = 'sm',
  dismissible = true,
  closeLabel = 'Close',
  showClose = true,
  children,
  ...rest
}) {
  const { isMobile } = useBreakpoint();
  const titleId = useId();
  const descriptionId = useId();
  useScrollLock(open);

  const handleClose = (event, reason) => {
    if (!dismissible && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    onClose?.(event, reason);
  };

  if (isMobile && mobile === 'sheet') {
    return (
      <BottomSheet open={open} onClose={handleClose} title={title} footer={footer} {...rest}>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
      </BottomSheet>
    );
  }

  const fullScreen = isMobile && mobile === 'fullscreen';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth={size}
      fullWidth
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      PaperProps={{
        className: [styles.paper, fullScreen ? styles.fullscreen : ''].filter(Boolean).join(' '),
      }}
      sx={{ zIndex: 'var(--z-modal)' }}
      {...rest}
    >
      {title || showClose ? (
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            {title ? (
              <h2 className={styles.title} id={titleId}>
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className={styles.description} id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          {showClose ? (
            <IconButton label={closeLabel} size="sm" onClick={onClose}>
              &times;
            </IconButton>
          ) : null}
        </div>
      ) : null}
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </Dialog>
  );
}
