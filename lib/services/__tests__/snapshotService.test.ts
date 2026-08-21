import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import { getProjects } from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import { getPaRecs } from '@/lib/services/paRecService';
import { getPaTasks } from '@/lib/services/paTaskService';
import {
  getSnapshots,
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
} from '@/lib/services/snapshotService';
import type { Project, Note, PaRec, PaTask, Snapshot } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

vi.mock('@/lib/services/projectService', () => ({
  getProjects: vi.fn(),
}));

vi.mock('@/lib/services/noteService', () => ({
  getNotes: vi.fn(),
}));

vi.mock('@/lib/services/paRecService', () => ({
  getPaRecs: vi.fn(),
}));

vi.mock('@/lib/services/paTaskService', () => ({
  getPaTasks: vi.fn(),
}));

const mockFrom = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;
const mockRpc = vi.mocked(supabase.rpc) as unknown as ReturnType<typeof vi.fn>;
const mockGetProjects = vi.mocked(getProjects);
const mockGetNotes = vi.mocked(getNotes);
const mockGetPaRecs = vi.mocked(getPaRecs);
const mockGetPaTasks = vi.mocked(getPaTasks);

const sampleProject: Project = {
  id: 'p1',
  user_id: 'u1',
  title: 'AFJ',
  description: null,
  color: null,
  status: 'active',
  parent_id: null,
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

const sampleNote: Note = {
  id: 'n1',
  user_id: 'u1',
  project_id: 'p1',
  title: null,
  reference: null,
  body: 'Ship the MVP',
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

const sampleRec: PaRec = {
  id: 'r1',
  user_id: 'u1',
  project_id: 'p1',
  event: null,
  site: null,
  title: 'Talk notes',
  references: [],
  points: [],
  key_learnings: null,
  images: [],
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

const sampleTask: PaTask = {
  id: 't1',
  user_id: 'u1',
  project_id: 'p1',
  title: 'Plan trip',
  steps: [],
  started: false,
  started_at: null,
  completed: false,
  completed_at: null,
  due_at: null,
  remind_at: null,
  position: 0,
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

const sampleSnapshot: Snapshot = {
  id: 's1',
  user_id: 'u1',
  label: 'Before cleanup',
  data: {
    projects: [sampleProject],
    notes: [sampleNote],
    pa_recs: [sampleRec],
    pa_tasks: [sampleTask],
  },
  created_at: '2026-07-17T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSnapshots', () => {
  it('lists snapshots newest first', async () => {
    const builder = makeQueryBuilder({ data: [sampleSnapshot], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await getSnapshots();

    expect(mockFrom).toHaveBeenCalledWith('snapshots');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([sampleSnapshot]);
  });
});

describe('createSnapshot', () => {
  it('captures all projects, notes, records, and tasks into the insert payload', async () => {
    mockGetProjects.mockResolvedValue([sampleProject]);
    mockGetNotes.mockResolvedValue([sampleNote]);
    mockGetPaRecs.mockResolvedValue([sampleRec]);
    mockGetPaTasks.mockResolvedValue([sampleTask]);
    const builder = makeQueryBuilder({ data: sampleSnapshot, error: null });
    mockFrom.mockReturnValue(builder);

    await createSnapshot('  Before cleanup  ');

    expect(mockGetProjects).toHaveBeenCalledWith({ status: 'all' });
    expect(mockGetNotes).toHaveBeenCalledWith();
    expect(mockGetPaRecs).toHaveBeenCalledWith();
    expect(mockGetPaTasks).toHaveBeenCalledWith();
    expect(builder.insert).toHaveBeenCalledWith([
      {
        label: 'Before cleanup',
        data: {
          projects: [sampleProject],
          notes: [sampleNote],
          pa_recs: [sampleRec],
          pa_tasks: [sampleTask],
        },
      },
    ]);
  });

  it('stores a null label when none is given', async () => {
    mockGetProjects.mockResolvedValue([]);
    mockGetNotes.mockResolvedValue([]);
    mockGetPaRecs.mockResolvedValue([]);
    mockGetPaTasks.mockResolvedValue([]);
    const builder = makeQueryBuilder({ data: sampleSnapshot, error: null });
    mockFrom.mockReturnValue(builder);

    await createSnapshot();

    expect(builder.insert).toHaveBeenCalledWith([
      { label: null, data: { projects: [], notes: [], pa_recs: [], pa_tasks: [] } },
    ]);
  });
});

describe('deleteSnapshot', () => {
  it('deletes by id', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await deleteSnapshot('s1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 's1');
  });
});

describe('restoreSnapshot', () => {
  it('calls the restore_snapshot RPC with the snapshot id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await restoreSnapshot('s1');

    expect(mockRpc).toHaveBeenCalledWith('restore_snapshot', { snapshot_id: 's1' });
  });

  it('throws when the RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Snapshot not found' } });

    await expect(restoreSnapshot('missing')).rejects.toEqual({
      message: 'Snapshot not found',
    });
  });
});
