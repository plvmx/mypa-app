'use client';

import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/errorUtils';

/**
 * Reusable image field: a button that opens the device's photo picker
 * (gallery/camera), uploads each selection immediately via the injected
 * `upload`, and shows a thumbnail grid (resolved via `getUrl`) with a
 * per-image remove button (via `remove`). `images` holds opaque Storage
 * object paths — the caller owns which bucket they live in and how the
 * owning record persists them; this component only manages the picker UI.
 */
export default function ImagePicker({
  images,
  onChange,
  upload,
  getUrl,
  remove,
  label = 'Images',
  disabled,
  disabledHint,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  upload: (file: File) => Promise<string>;
  getUrl: (path: string) => Promise<string>;
  remove: (path: string) => Promise<void>;
  /** Field label above the thumbnail grid. Pass '' to omit it (e.g. when nested under a label of its own). */
  label?: string;
  /** Block adding new images (e.g. the owning record needs a title before one exists to attach to). Existing images can still be removed. */
  disabled?: boolean;
  /** Shown next to the button while `disabled`. */
  disabledHint?: string;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const missing = images.filter((path) => !(path in urls));
    if (missing.length === 0) return;
    let active = true;
    Promise.all(missing.map((path) => getUrl(path).then((url) => [path, url] as const)))
      .then((entries) => {
        if (!active) return;
        setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const paths = await Promise.all(Array.from(files).map((file) => upload(file)));
      onChange([...images, ...paths]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove(path: string) {
    setError('');
    try {
      await remove(path);
      onChange(images.filter((p) => p !== path));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}

      {images.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {images.map((path) => (
            <div key={path} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card">
              {urls[path] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[path]} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => handleRemove(path)}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-accent disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Add image'}
        </button>
        {disabled && disabledHint && <span className="text-xs text-muted">{disabledHint}</span>}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
