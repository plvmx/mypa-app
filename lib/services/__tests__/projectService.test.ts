import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '@/lib/services/projectService';
import type { Project } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

const mockFrom = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

const sampleProject: Project = {
  id: 'p1',
  user_id: 'u1',
  title: 'AFJ',
  description: 'Campaign work',
  color: '#3b82f6',
  status: 'active',
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getProjects', () => {
  it('returns active projects by default and filters by status', async () => {
    const builder = makeQueryBuilder({ data: [sampleProject], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await getProjects();

    expect(mockFrom).toHaveBeenCalledWith('projects');
    expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    expect(result).toEqual([sampleProject]);
  });

  it('does not filter by status when status is "all"', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await getProjects({ status: 'all' });

    expect(builder.eq).not.toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockReturnValue(
      makeQueryBuilder({ data: null, error: { message: 'boom' } }),
    );
    await expect(getProjects()).rejects.toEqual({ message: 'boom' });
  });
});

describe('getProjectById', () => {
  it('returns the project when found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: sampleProject, error: null }));
    const result = await getProjectById('p1');
    expect(result).toEqual(sampleProject);
  });

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    const result = await getProjectById('missing');
    expect(result).toBeNull();
  });
});

describe('createProject', () => {
  it('trims the title and nulls empty optional fields before inserting', async () => {
    const builder = makeQueryBuilder({ data: sampleProject, error: null });
    mockFrom.mockReturnValue(builder);

    await createProject({ title: '  AFJ  ', description: '   ' });

    expect(builder.insert).toHaveBeenCalledWith([
      { title: 'AFJ', description: null, color: null },
    ]);
  });

  it('rejects a blank title without hitting the database', async () => {
    await expect(createProject({ title: '   ' })).rejects.toThrow('needs a title');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('updateProject', () => {
  it('builds a patch of only the provided fields', async () => {
    const builder = makeQueryBuilder({ data: sampleProject, error: null });
    mockFrom.mockReturnValue(builder);

    await updateProject('p1', { status: 'archived' });

    expect(builder.update).toHaveBeenCalledWith({ status: 'archived' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('rejects clearing the title to blank', async () => {
    await expect(updateProject('p1', { title: '  ' })).rejects.toThrow('needs a title');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('deleteProject', () => {
  it('deletes by id', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await deleteProject('p1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });
});
