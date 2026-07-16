import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from '@/lib/services/noteService';
import type { Note } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

const mockFrom = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

const sampleNote: Note = {
  id: 'n1',
  user_id: 'u1',
  project_id: 'p1',
  title: 'Idea',
  body: 'Ship the MVP',
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getNotes', () => {
  it('fetches all notes newest-first when no filter is given', async () => {
    const builder = makeQueryBuilder({ data: [sampleNote], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await getNotes();

    expect(mockFrom).toHaveBeenCalledWith('notes');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.eq).not.toHaveBeenCalled();
    expect(builder.is).not.toHaveBeenCalled();
    expect(result).toEqual([sampleNote]);
  });

  it('scopes to a project when projectId is a string', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await getNotes({ projectId: 'p1' });

    expect(builder.eq).toHaveBeenCalledWith('project_id', 'p1');
    expect(builder.is).not.toHaveBeenCalled();
  });

  it('fetches only unfiled notes when projectId is null', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await getNotes({ projectId: null });

    expect(builder.is).toHaveBeenCalledWith('project_id', null);
    expect(builder.eq).not.toHaveBeenCalled();
  });
});

describe('getNoteById', () => {
  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    expect(await getNoteById('missing')).toBeNull();
  });
});

describe('createNote', () => {
  it('trims the body and defaults project_id to null', async () => {
    const builder = makeQueryBuilder({ data: sampleNote, error: null });
    mockFrom.mockReturnValue(builder);

    await createNote({ body: '  Ship the MVP  ' });

    expect(builder.insert).toHaveBeenCalledWith([
      { body: 'Ship the MVP', title: null, project_id: null },
    ]);
  });

  it('keeps the provided project_id', async () => {
    const builder = makeQueryBuilder({ data: sampleNote, error: null });
    mockFrom.mockReturnValue(builder);

    await createNote({ body: 'x', project_id: 'p1' });

    expect(builder.insert).toHaveBeenCalledWith([
      { body: 'x', title: null, project_id: 'p1' },
    ]);
  });

  it('rejects an empty body without hitting the database', async () => {
    await expect(createNote({ body: '   ' })).rejects.toThrow('needs some text');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('updateNote', () => {
  it('can move a note to the inbox by setting project_id null', async () => {
    const builder = makeQueryBuilder({ data: sampleNote, error: null });
    mockFrom.mockReturnValue(builder);

    await updateNote('n1', { project_id: null });

    expect(builder.update).toHaveBeenCalledWith({ project_id: null });
    expect(builder.eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('rejects clearing the body to blank', async () => {
    await expect(updateNote('n1', { body: '  ' })).rejects.toThrow('needs some text');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('deleteNote', () => {
  it('deletes by id', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await deleteNote('n1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'n1');
  });
});
