'use client';

import { useState, type FormEvent } from 'react';
import { createPaRec, updatePaRec, deletePaRec, savePaRecImages } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import DynamicListInput from '@/components/DynamicListInput';
import PaRecImagePicker from '@/components/PaRecImagePicker';
import type { PaRec } from '@/lib/types';

/**
 * Create/edit form for a record. Pass `initial` to edit an existing record
 * (fields are pre-filled and saving calls `updatePaRec`); omit it to create
 * a new one under `projectId` (`createPaRec`). Both flows share this one
 * component so every field is editable after creation, not just at creation.
 */
export default function PaRecForm({
  projectId,
  initial,
  defaultEvent,
  defaultSite,
  onSaved,
  onCancel,
}: {
  projectId: string;
  initial?: PaRec;
  /** Prefill for a new record (ignored in edit mode) — e.g. the Event/Site of the last record created in this project. */
  defaultEvent?: string | null;
  defaultSite?: string | null;
  onSaved: (rec: PaRec) => void;
  onCancel?: () => void;
}) {
  const [event, setEvent] = useState(initial?.event ?? defaultEvent ?? '');
  const [site, setSite] = useState(initial?.site ?? defaultSite ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [references, setReferences] = useState<string[]>(
    initial?.references.length ? initial.references : [''],
  );
  const [points, setPoints] = useState<string[]>(
    initial?.points.length ? initial.points : [''],
  );
  const [keyLearnings, setKeyLearnings] = useState(initial?.key_learnings ?? '');
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  // Tracks the record images get attached to. Starts as `initial?.id` (editing);
  // for a new record it's set as soon as the first image forces an early save
  // (see handleImagesChange) — after that, handleSubmit updates rather than creates.
  const [recordId, setRecordId] = useState(initial?.id);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const fields = {
        title,
        event,
        site,
        references,
        points,
        key_learnings: keyLearnings,
        images,
      };
      const rec = recordId
        ? await updatePaRec(recordId, fields)
        : await createPaRec({ project_id: projectId, ...fields });
      onSaved(rec);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Attach an image-array change to the record right away rather than
   * waiting for Save — an upload that already landed in Storage shouldn't be
   * lost if the page gets torn down (e.g. the OS reclaiming a backgrounded
   * tab/PWA while the native camera is in the foreground) before Save is
   * pressed. For a brand-new record this creates it early, using whatever
   * fields are filled in so far; handleSubmit then updates it instead.
   */
  async function handleImagesChange(newImages: string[]) {
    setImages(newImages);
    setError('');
    try {
      const rec = await savePaRecImages(recordId, newImages, {
        project_id: projectId,
        title,
        event,
        site,
        references,
        points,
        key_learnings: keyLearnings,
      });
      if (!recordId) setRecordId(rec.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  /**
   * If adding an image auto-created a draft record (see handleImagesChange)
   * and the user then cancels, remove that draft instead of leaving an
   * orphaned record behind — `initial` being unset is what marks it as one
   * created by this session rather than one being edited.
   */
  async function handleCancel() {
    if (!initial && recordId) {
      try {
        await deletePaRec(recordId);
      } catch {
        // best-effort cleanup — nothing the user can act on here
      }
    }
    onCancel?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Record title"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="event" className="mb-1 block text-sm font-medium">
            Event
          </label>
          <input
            id="event"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="site" className="mb-1 block text-sm font-medium">
            Site
          </label>
          <input
            id="site"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
          />
        </div>
      </div>

      <DynamicListInput
        label="References"
        values={references}
        onChange={setReferences}
        placeholder="https://…"
      />
      <DynamicListInput label="Points" values={points} onChange={setPoints} placeholder="A point" />

      <div>
        <label htmlFor="key_learnings" className="mb-1 block text-sm font-medium">
          Key Learnings
        </label>
        <textarea
          id="key_learnings"
          value={keyLearnings}
          onChange={(e) => setKeyLearnings(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
        />
      </div>

      <PaRecImagePicker
        images={images}
        onChange={handleImagesChange}
        disabled={!recordId && !title.trim()}
        disabledHint="Add a title first"
      />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={handleCancel} className="text-sm text-muted">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create record'}
        </button>
      </div>
    </form>
  );
}
