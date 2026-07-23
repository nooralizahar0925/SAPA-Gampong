import { useEffect, useRef, type ReactNode } from 'react';
import { AppIcon } from '../AppIcon';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Dialog for the add/edit forms. Uses <dialog> so the browser supplies the modal
 * semantics, focus trapping, and Escape handling rather than reimplementing them.
 */
export function Modal({ title, onClose, children, footer, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();

    // The browser fires "cancel" for Escape and the backdrop close gesture.
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog className={className ? `sapa-modal ${className}` : 'sapa-modal'} ref={ref} aria-label={title}>
      <div className="sapa-modal-head">
        <h2>{title}</h2>
        <button className="ghost-button" type="button" aria-label="Tutup" onClick={onClose}>
          <AppIcon name="x" />
        </button>
      </div>

      <div className="sapa-modal-body">{children}</div>

      {footer ? <div className="sapa-modal-foot">{footer}</div> : null}
    </dialog>
  );
}
