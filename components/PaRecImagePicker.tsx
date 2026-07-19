'use client';

import { useEffect, useRef, useState } from 'react';
import { getPaRecImageUrl, removePaRecImage, uploadPaRecImage } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';

/**
 * Image field for a record: a button that opens the device's photo
 * picker (gallery/camera), uploads each selection to Storage immediately,
 * and shows a thumbnail grid with a per-image remove button. `images` holds
 * Storage object paths — this component resolves them to signed URLs for
 * display.
 */
export default function PaRecImagePicker({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const missing = images.filter((path) => !(path in urls));
    if (missing.length === 0) return;
    let active = true;
    Promise.all(missing.map((path) => getPaRecImageUrl(path).then((url) => [path, url] as const)))
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
      const paths = await Promise.all(Array.from(files).map((file) => uploadPaRecImage(file)));
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
      await removePaRecImage(path);
      onChange(images.filter((p) => p !== path));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Images</label>

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
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-accent disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '+ Add image'}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
