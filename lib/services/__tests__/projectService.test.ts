import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  moveProject,
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
  parent_id: null,
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
      { title: 'AFJ', description: null, color: null, parent_id: null },
    ]);
  });

  it('passes parent_id through when creating a sub-project', async () => {
    const builder = makeQueryBuilder({ data: sampleProject, error: null });
    mockFrom.mockReturnValue(builder);

    await createProject({ title: 'Sub', parent_id: 'root1' });

    expect(builder.insert).toHaveBeenCalledWith([
      { title: 'Sub', description: null, color: null, parent_id: 'root1' },
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

describe('moveProject', () => {
  const root1: Project = { ...sampleProject, id: 'root1', parent_id: null };
  const child1: Project = { ...sampleProject, id: 'child1', parent_id: 'root1' };

  it('rejects a project being its own parent without querying', async () => {
    await expect(moveProject('root1', 'root1')).rejects.toThrow('cannot be its own parent');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects moving a project into its own sub-project', async () => {
    const listBuilder = makeQueryBuilder({ data: [root1, child1], error: null });
    mockFrom.mockReturnValueOnce(listBuilder);

    await expect(moveProject('root1', 'child1')).rejects.toThrow(
      "Cannot move a project into one of its own sub-projects",
    );
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('updates parent_id when moving under a different, non-descendant parent', async () => {
    const otherRoot: Project = { ...sampleProject, id: 'root2', parent_id: null };
    const listBuilder = makeQueryBuilder({ data: [root1, otherRoot, child1], error: null });
    const updateBuilder = makeQueryBuilder({
      data: { ...child1, parent_id: 'root2' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(listBuilder).mockReturnValueOnce(updateBuilder);

    const result = await moveProject('child1', 'root2');

    expect(updateBuilder.update).toHaveBeenCalledWith({ parent_id: 'root2' });
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'child1');
    expect(result.parent_id).toBe('root2');
  });

  it('moves to top-level without walking the tree', async () => {
    const updateBuilder = makeQueryBuilder({ data: { ...child1, parent_id: null }, error: null });
    mockFrom.mockReturnValueOnce(updateBuilder);

    const result = await moveProject('child1', null);

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(result.parent_id).toBeNull();
  });
});

describe('deleteProject', () => {
  it('deletes by id when there are no sub-projects', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await deleteProject('p1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('throws and skips the delete when the project has sub-projects', async () => {
    const childCheckBuilder = makeQueryBuilder({ data: [{ id: 'child1' }], error: null });
    mockFrom.mockReturnValueOnce(childCheckBuilder);

    await expect(deleteProject('p1')).rejects.toThrow('sub-projects first');
    expect(childCheckBuilder.delete).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
