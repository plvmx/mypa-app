'use client';

import { useState, type FormEvent } from 'react';
import { createPaRec, updatePaRec } from '@/lib/services/paRecService';
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
  onSaved,
  onCancel,
}: {
  projectId: string;
  initial?: PaRec;
  onSaved: (rec: PaRec) => void;
  onCancel?: () => void;
}) {
  const [event, setEvent] = useState(initial?.event ?? '');
  const [site, setSite] = useState(initial?.site ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [references, setReferences] = useState<string[]>(
    initial?.references.length ? initial.references : [''],
  );
  const [points, setPoints] = useState<string[]>(
    initial?.points.length ? initial.points : [''],
  );
  const [keyLearnings, setKeyLearnings] = useState(initial?.key_learnings ?? '');
  const [images, setImages] = useState<string[]>(initial?.images ?? []);

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
      const rec = initial
        ? await updatePaRec(initial.id, fields)
        : await createPaRec({ project_id: projectId, ...fields });
      onSaved(rec);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
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

      <PaRecImagePicker images={images} onChange={setImages} />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted">
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
