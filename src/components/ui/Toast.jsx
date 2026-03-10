import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

/* Re-export the Toaster to place in App.jsx */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset="16px"
      toastOptions={{
        style: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: '12px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
          padding: '14px 18px',
        },
        classNames: {
          success: 'toast-success',
          error: 'toast-error',
        },
      }}
      richColors
      closeButton
    />
  );
}

/* Convenience wrappers */
export const toast = {
  success: (msg) => sonnerToast.success(msg),
  error: (msg)   => sonnerToast.error(msg),
  info: (msg)    => sonnerToast.info(msg),
  loading: (msg) => sonnerToast.loading(msg),
  dismiss: (id)  => sonnerToast.dismiss(id),
};
