import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import {
  getPaTasks,
  getPaTaskById,
  createPaTask,
  updatePaTask,
  deletePaTask,
  startTimer,
  stopTimer,
  savePaTaskSteps,
  uploadPaTaskStepImage,
  getPaTaskStepImageUrl,
  removePaTaskStepImage,
} from '@/lib/services/paTaskService';
import type { PaTask } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    auth: { getUser: vi.fn() },
  },
}));

const mockFrom = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;
const mockStorageFrom = vi.mocked(supabase.storage.from) as unknown as ReturnType<typeof vi.fn>;
const mockGetUser = vi.mocked(supabase.auth.getUser) as unknown as ReturnType<typeof vi.fn>;

const sampleTask: PaTask = {
  id: 't1',
  user_id: 'u1',
  project_id: 'p1',
  title: 'Plan trip',
  steps: [
    { text: 'Book flights', completed: true, completed_at: '2026-07-01T00:00:00Z', images: [] },
    { text: 'Pack bags', completed: false, completed_at: null, images: [] },
  ],
  started: true,
  started_at: '2026-06-30T00:00:00Z',
  completed: false,
  completed_at: null,
  due_at: null,
  remind_at: null,
  time_entries: [],
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

  it('backfills a missing images field on steps saved before it existed', async () => {
    const legacyRow = {
      ...sampleTask,
      steps: [{ text: 'Book flights', completed: true, completed_at: '2026-07-01T00:00:00Z' }],
    };
    mockFrom.mockReturnValue(makeQueryBuilder({ data: legacyRow, error: null }));

    const task = await getPaTaskById('t1');

    expect(task?.steps[0].images).toEqual([]);
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
        {
          text: '  Book flights  ',
          completed: true,
          completed_at: '2026-07-01T00:00:00Z',
          images: [],
        },
        { text: '   ', completed: false, completed_at: null, images: [] },
      ],
    });

    expect(builder.insert).toHaveBeenCalledWith([
      {
        project_id: 'p1',
        title: 'Plan trip',
        steps: [
          { text: 'Book flights', completed: true, completed_at: '2026-07-01T00:00:00Z', images: [] },
        ],
        started: false,
        started_at: null,
        completed: false,
        completed_at: null,
        due_at: null,
        remind_at: null,
      },
    ]);
  });

  it('passes due_at and remind_at through when provided', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await createPaTask({
      project_id: 'p1',
      title: 'Renew passport',
      due_at: '2026-08-01T00:00:00Z',
      remind_at: '2026-07-25T00:00:00Z',
    });

    const inserted = builder.insert.mock.calls[0][0][0];
    expect(inserted.due_at).toBe('2026-08-01T00:00:00Z');
    expect(inserted.remind_at).toBe('2026-07-25T00:00:00Z');
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
        { text: '  a  ', completed: false, completed_at: null, images: [] },
        { text: '', completed: false, completed_at: null, images: [] },
      ],
    });

    expect(builder.update).toHaveBeenCalledWith({
      steps: [{ text: 'a', completed: false, completed_at: null, images: [] }],
    });
  });

  it('keeps a step that has images even when its text is blank', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaTask('t1', {
      steps: [{ text: '   ', completed: false, completed_at: null, images: ['u1/photo.jpg'] }],
    });

    expect(builder.update).toHaveBeenCalledWith({
      steps: [{ text: '', completed: false, completed_at: null, images: ['u1/photo.jpg'] }],
    });
  });

  it('rejects clearing the title to blank', async () => {
    await expect(updatePaTask('t1', { title: '  ' })).rejects.toThrow('needs a title');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('patches due_at and remind_at, including clearing them back to null', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaTask('t1', { due_at: '2026-08-01T00:00:00Z', remind_at: null });

    expect(builder.update).toHaveBeenCalledWith({
      due_at: '2026-08-01T00:00:00Z',
      remind_at: null,
    });
  });

  it('patches project_id to move the task to another project', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaTask('t1', { project_id: 'p2' });

    expect(builder.update).toHaveBeenCalledWith({ project_id: 'p2' });
  });
});

describe('startTimer', () => {
  it('appends an open time entry stamped with now', async () => {
    const getBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    const updateBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValueOnce(getBuilder).mockReturnValueOnce(updateBuilder);

    await startTimer('t1');

    const patch = updateBuilder.update.mock.calls[0][0];
    expect(patch.time_entries).toHaveLength(1);
    expect(patch.time_entries[0].ended_at).toBeNull();
    expect(typeof patch.time_entries[0].started_at).toBe('string');
  });

  it('rejects starting a timer that is already running', async () => {
    const running = { ...sampleTask, time_entries: [{ started_at: '2026-07-01T00:00:00Z', ended_at: null }] };
    mockFrom.mockReturnValue(makeQueryBuilder({ data: running, error: null }));

    await expect(startTimer('t1')).rejects.toThrow('already running');
  });

  it('rejects starting a timer on a task that does not exist', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    await expect(startTimer('missing')).rejects.toThrow('Task not found');
  });
});

describe('stopTimer', () => {
  it('sets ended_at on the open entry, preserving closed ones', async () => {
    const running = {
      ...sampleTask,
      time_entries: [
        { started_at: '2026-07-01T00:00:00Z', ended_at: '2026-07-01T01:00:00Z' },
        { started_at: '2026-07-02T00:00:00Z', ended_at: null },
      ],
    };
    const getBuilder = makeQueryBuilder({ data: running, error: null });
    const updateBuilder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValueOnce(getBuilder).mockReturnValueOnce(updateBuilder);

    await stopTimer('t1');

    const patch = updateBuilder.update.mock.calls[0][0];
    expect(patch.time_entries[0]).toEqual(running.time_entries[0]);
    expect(patch.time_entries[1].ended_at).not.toBeNull();
    expect(typeof patch.time_entries[1].ended_at).toBe('string');
  });

  it('rejects stopping when no timer is running', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: sampleTask, error: null }));
    await expect(stopTimer('t1')).rejects.toThrow('No timer is running');
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

  it("removes every step's images from storage", async () => {
    const taskWithImages = {
      ...sampleTask,
      steps: [
        { text: 'Book flights', completed: false, completed_at: null, images: ['u1/a.jpg'] },
        { text: 'Pack bags', completed: false, completed_at: null, images: ['u1/b.jpg', 'u1/c.jpg'] },
      ],
    };
    mockFrom.mockReturnValue(makeQueryBuilder({ data: taskWithImages, error: null }));
    const remove = vi.fn().mockResolvedValue({ data: null, error: null });
    mockStorageFrom.mockReturnValue({ remove });

    await deletePaTask('t1');

    expect(mockStorageFrom).toHaveBeenCalledWith('pa-task-step-images');
    expect(remove).toHaveBeenCalledWith(['u1/a.jpg', 'u1/b.jpg', 'u1/c.jpg']);
  });

  it('skips the storage call when no step has images', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: sampleTask, error: null }));

    await deletePaTask('t1');

    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
});

describe('savePaTaskSteps', () => {
  const draft = { project_id: 'p1', title: 'Plan trip' };

  it('patches just the steps field on an existing task', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);
    const newSteps = [{ text: 'Book flights', completed: false, completed_at: null, images: ['u1/a.jpg'] }];

    await savePaTaskSteps('t1', newSteps, draft);

    expect(builder.update).toHaveBeenCalledWith({ steps: newSteps });
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it('creates the task from the draft fields when it does not exist yet', async () => {
    const builder = makeQueryBuilder({ data: sampleTask, error: null });
    mockFrom.mockReturnValue(builder);
    const newSteps = [{ text: 'Book flights', completed: false, completed_at: null, images: ['u1/a.jpg'] }];

    await savePaTaskSteps(undefined, newSteps, draft);

    const inserted = builder.insert.mock.calls[0][0][0];
    expect(inserted.project_id).toBe('p1');
    expect(inserted.title).toBe('Plan trip');
    expect(inserted.steps).toEqual(newSteps);
    expect(builder.update).not.toHaveBeenCalled();
  });
});

describe('uploadPaTaskStepImage', () => {
  it('uploads under the current user id and returns the storage path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const upload = vi.fn().mockResolvedValue({ data: { path: 'ignored' }, error: null });
    mockStorageFrom.mockReturnValue({ upload });

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const path = await uploadPaTaskStepImage(file);

    expect(mockStorageFrom).toHaveBeenCalledWith('pa-task-step-images');
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^u1\/.+-photo\.jpg$/), file);
    expect(path).toMatch(/^u1\/.+-photo\.jpg$/);
  });

  it('rejects when there is no signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(uploadPaTaskStepImage(new File(['x'], 'a.jpg'))).rejects.toThrow('signed in');
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
});

describe('getPaTaskStepImageUrl', () => {
  it('returns a signed url for the given path', async () => {
    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example/a.jpg' }, error: null });
    mockStorageFrom.mockReturnValue({ createSignedUrl });

    const url = await getPaTaskStepImageUrl('u1/a.jpg');

    expect(mockStorageFrom).toHaveBeenCalledWith('pa-task-step-images');
    expect(createSignedUrl).toHaveBeenCalledWith('u1/a.jpg', 60 * 60);
    expect(url).toBe('https://signed.example/a.jpg');
  });
});

describe('removePaTaskStepImage', () => {
  it('removes the given path from storage', async () => {
    const remove = vi.fn().mockResolvedValue({ data: null, error: null });
    mockStorageFrom.mockReturnValue({ remove });

    await removePaTaskStepImage('u1/a.jpg');

    expect(mockStorageFrom).toHaveBeenCalledWith('pa-task-step-images');
    expect(remove).toHaveBeenCalledWith(['u1/a.jpg']);
  });
});
