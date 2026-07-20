import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import {
  getPaTasks,
  getPaTaskById,
  createPaTask,
  updatePaTask,
  deletePaTask,
} from '@/lib/services/paTaskService';
import type { PaTask } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockFrom = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

const sampleTask: PaTask = {
  id: 't1',
  user_id: 'u1',
  project_id: 'p1',
  title: 'Plan trip',
  steps: [
    { text: 'Book flights', completed: true, completed_at: '2026-07-01T00:00:00Z' },
    { text: 'Pack bags', completed: false, completed_at: null },
  ],
  started: true,
  started_at: '2026-06-30T00:00:00Z',
  completed: false,
  completed_at: null,
  created_at: '2026-06-29T00:00:00Z',
  updated_at: '2026-06-30T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPaTasks', () => {
  it('fetches all tasks newest-first when no projectId is given', async () => {
    const builder = makeQueryBuilder({ data: [sampleTask], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await getPaTasks();

    expect(mockFrom).toHaveBeenCalledWith('pa_tasks');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.eq).not.toHaveBeenCalled();
    expect(result).toEqual([sampleTask]);
  });

  it('scopes to a project when projectId is given', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await getPaTasks('p1');

    expect(builder.eq).toHaveBeenCalledWith('project_id', 'p1');
  });
});

describe('getPaTaskById', () => {
  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    expect(await getPaTaskById('missing')).toBeNull();
  });
});

describe('createPaTask', () => {
  it('trims the title, filters blank steps, and defaults started/completed to false with no timestamps', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await createPaTask({
      project_id: 'p1',
      title: '  Plan trip  ',
      steps: [
        { text: '  Book flights  ', completed: true, completed_at: '2026-07-01T00:00:00Z' },
        { text: '   ', completed: false, completed_at: null },
      ],
    });

    expect(builder.insert).toHaveBeenCalledWith([
      {
        project_id: 'p1',
        title: 'Plan trip',
        steps: [{ text: 'Book flights', completed: true, completed_at: '2026-07-01T00:00:00Z' }],
        started: false,
        started_at: null,
        completed: false,
        completed_at: null,
      },
    ]);
  });

  it('stamps started_at/completed_at with now when created already started/completed', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await createPaTask({ project_id: 'p1', title: 'Quick task', started: true, completed: true });

    const inserted = builder.insert.mock.calls[0][0][0];
    expect(inserted.started).toBe(true);
    expect(inserted.completed).toBe(true);
    expect(typeof inserted.started_at).toBe('string');
    expect(inserted.started_at).toBe(inserted.completed_at);
  });

  it('rejects an empty title without hitting the database', async () => {
    await expect(createPaTask({ project_id: 'p1', title: '   ' })).rejects.toThrow(
      'needs a title',
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('updatePaTask', () => {
  it('only patches provided fields when neither started nor completed change', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaTask('t1', { title: 'Renamed' });

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(builder.update).toHaveBeenCalledWith({ title: 'Renamed' });
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
  });

  it('stamps started_at with now when started flips from false to true', async () => {
    const getBuilder = makeQueryBuilder({ data: { ...sampleTask, started: false, started_at: null }, error: null });
    const updateBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValueOnce(getBuilder).mockReturnValueOnce(updateBuilder);

    await updatePaTask('t1', { started: true });

    const patch = updateBuilder.update.mock.calls[0][0];
    expect(patch.started).toBe(true);
    expect(typeof patch.started_at).toBe('string');
  });

  it('preserves the existing timestamp when re-saving an already-checked box', async () => {
    const getBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    const updateBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValueOnce(getBuilder).mockReturnValueOnce(updateBuilder);

    await updatePaTask('t1', { started: true });

    expect(updateBuilder.update).toHaveBeenCalledWith({
      started: true,
      started_at: sampleTask.started_at,
    });
  });

  it('clears completed_at back to null when completed flips to false', async () => {
    const completedTask = { ...sampleTask, completed: true, completed_at: '2026-07-05T00:00:00Z' };
    const getBuilder = makeQueryBuilder({ data: completedTask, error: null });
    const updateBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValueOnce(getBuilder).mockReturnValueOnce(updateBuilder);

    await updatePaTask('t1', { completed: false });

    expect(updateBuilder.update).toHaveBeenCalledWith({
      completed: false,
      completed_at: null,
    });
  });

  it('cleans steps, trimming text and dropping blank entries', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaTask('t1', {
      steps: [
        { text: '  a  ', completed: false, completed_at: null },
        { text: '', completed: false, completed_at: null },
      ],
    });

    expect(builder.update).toHaveBeenCalledWith({
      steps: [{ text: 'a', completed: false, completed_at: null }],
    });
  });

  it('rejects clearing the title to blank', async () => {
    await expect(updatePaTask('t1', { title: '  ' })).rejects.toThrow('needs a title');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('deletePaTask', () => {
  it('deletes the row', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await deletePaTask('t1');

    expect(mockFrom).toHaveBeenCalledWith('pa_tasks');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
  });
});
