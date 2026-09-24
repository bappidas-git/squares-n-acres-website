import Button from './Button';
import Modal from './Modal';

/**
 * The confirmation and alert dialog — the replacement for the boilerplate's
 * SweetAlert popups (D2).
 *
 * `variant="alert"` renders a single acknowledge button (the successor of
 * `Swal.fire` success alerts); `variant="confirm"` renders cancel + confirm,
 * with a red confirm button when `danger` is set.
 *
 * `Escape` and the backdrop close it, and focus returns to whatever opened it —
 * both come from `Modal`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onConfirm]
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.message]
 * @param {string} [props.confirmLabel]
 * @param {string} [props.cancelLabel]
 * @param {boolean} [props.danger]
 * @param {boolean} [props.loading]
 * @param {'confirm'|'alert'} [props.variant]
 * @param {() => void} [props.onExited] once the close transition has finished
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  okLabel = 'OK',
  danger = false,
  loading = false,
  variant = 'confirm',
  onExited,
  children,
}) {
  const isAlert = variant === 'alert';

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      dismissible={!loading}
      showClose={!loading}
      slotProps={{ transition: { onExited } }}
      footer={
        isAlert ? (
          <Button variant="primary" onClick={onClose} autoFocus>
            {okLabel}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </>
        )
      }
    >
      {message ? <p>{message}</p> : null}
      {children}
    </Modal>
  );
}
