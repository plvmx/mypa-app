import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import { getProjects } from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import {
  getSnapshots,
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
} from '@/lib/services/snapshotService';
import type { Project, Note, Snapshot } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

vi.mock('@/lib/services/projectService', () => ({
  getProjects: vi.fn(),
}));

vi.mock('@/lib/services/noteService', () => ({
  getNotes: vi.fn(),
}));

const mockFrom = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;
const mockRpc = vi.mocked(supabase.rpc) as unknown as ReturnType<typeof vi.fn>;
const mockGetProjects = vi.mocked(getProjects);
const mockGetNotes = vi.mocked(getNotes);

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
  body: 'Ship the MVP',
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

const sampleSnapshot: Snapshot = {
  id: 's1',
  user_id: 'u1',
  label: 'Before cleanup',
  data: { projects: [sampleProject], notes: [sampleNote] },
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
  it('captures all projects and notes into the insert payload', async () => {
    mockGetProjects.mockResolvedValue([sampleProject]);
    mockGetNotes.mockResolvedValue([sampleNote]);
    const builder = makeQueryBuilder({ data: sampleSnapshot, error: null });
    mockFrom.mockReturnValue(builder);

    await createSnapshot('  Before cleanup  ');

    expect(mockGetProjects).toHaveBeenCalledWith({ status: 'all' });
    expect(mockGetNotes).toHaveBeenCalledWith();
    expect(builder.insert).toHaveBeenCalledWith([
      { label: 'Before cleanup', data: { projects: [sampleProject], notes: [sampleNote] } },
    ]);
  });

  it('stores a null label when none is given', async () => {
    mockGetProjects.mockResolvedValue([]);
    mockGetNotes.mockResolvedValue([]);
    const builder = makeQueryBuilder({ data: sampleSnapshot, error: null });
    mockFrom.mockReturnValue(builder);

    await createSnapshot();

    expect(builder.insert).toHaveBeenCalledWith([
      { label: null, data: { projects: [], notes: [] } },
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
