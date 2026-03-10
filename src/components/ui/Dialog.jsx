import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import './Dialog.css';

/* ─── Generic Modal wrapper ──────────────────────────────── */
export function Dialog({ open, onOpenChange, children }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixDialog.Root>
  );
}

export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({ children, title, description }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="dialog-overlay" />
      <RadixDialog.Content className="dialog-content">
        {title && (
          <div className="dialog-header">
            <RadixDialog.Title className="dialog-title">{title}</RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="dialog-description">
                {description}
              </RadixDialog.Description>
            )}
            <RadixDialog.Close className="dialog-close">
              <X size={16} />
            </RadixDialog.Close>
          </div>
        )}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/* ─── Confirm dialog ─────────────────────────────────────── */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', confirmVariant = 'danger', onConfirm, loading }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay" />
        <RadixDialog.Content className="dialog-content dialog-content-sm">
          <div className="dialog-confirm-icon">
            {confirmVariant === 'danger' ? '⚠️' : 'ℹ️'}
          </div>
          <RadixDialog.Title className="dialog-title dialog-title-center">{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="dialog-description dialog-description-center">
              {description}
            </RadixDialog.Description>
          )}
          <div className="dialog-actions">
            <RadixDialog.Close asChild>
              <button className="btn btn-secondary">Cancel</button>
            </RadixDialog.Close>
            <button
              className={`btn ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? <span className="confirm-spinner" /> : confirmLabel}
            </button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
