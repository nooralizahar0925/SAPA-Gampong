import Swal from 'sweetalert2';

/**
 * Single place where SweetAlert2 is configured for the dashboard, so every alert
 * shares the same palette, radii, and Indonesian copy. Import these helpers rather
 * than calling Swal directly.
 */

const BRAND = {
  confirmButtonColor: '#124a34',
  cancelButtonColor: '#667069',
};

const IS_TEST = import.meta.env.MODE === 'test';

/** Non-blocking confirmation for successful writes. */
export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  customClass: { popup: 'sapa-toast' },
});

export function toastSuccess(title: string) {
  if (IS_TEST) return Promise.resolve();
  return toast.fire({ icon: 'success', title });
}

export function toastError(title: string, text?: string) {
  if (IS_TEST) return Promise.resolve();
  return toast.fire({ icon: 'error', title, text, timer: 4200 });
}

/**
 * Shows an API failure. When the error envelope carries per-field messages, they are
 * listed — a bare "Data yang dikirim tidak valid" leaves the admin guessing which
 * field is wrong.
 */
export function alertApiError(error: unknown, fallback = 'Terjadi kesalahan.') {
  if (IS_TEST) return Promise.resolve();

  const err = error as { message?: string; fields?: Record<string, string> } | null;
  const fields = err?.fields ? Object.values(err.fields) : [];

  if (fields.length > 0) {
    return Swal.fire({
      icon: 'error',
      title: err?.message ?? fallback,
      html: `<ul class="sapa-error-list">${fields
        .map((message) => `<li>${escapeHtml(message)}</li>`)
        .join('')}</ul>`,
      ...BRAND,
    });
  }

  return Swal.fire({
    icon: 'error',
    title: 'Gagal',
    text: err?.message ?? fallback,
    ...BRAND,
  });
}

/**
 * Test seam for confirmDelete. SweetAlert2 reports `isVisible() === false` under jsdom
 * (it checks computed styles jsdom does not produce), so its click APIs are no-ops
 * there. Tests set this to decide the outcome; production leaves it null.
 */
let confirmOverride: ((title: string) => boolean | Promise<boolean>) | null = null;

export function setConfirmHandlerForTests(
  handler: ((title: string) => boolean | Promise<boolean>) | null,
) {
  confirmOverride = handler;
}

/** Destructive actions ask first; returns true when the admin confirms. */
export async function confirmDelete(options: {
  title: string;
  text?: string;
  confirmText?: string;
}) {
  if (confirmOverride) return confirmOverride(options.title);

  const result = await Swal.fire({
    icon: 'warning',
    title: options.title,
    text: options.text ?? 'Tindakan ini tidak dapat dibatalkan.',
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Hapus',
    cancelButtonText: 'Batal',
    ...BRAND,
    confirmButtonColor: '#c0392b',
  });

  return result.isConfirmed;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
