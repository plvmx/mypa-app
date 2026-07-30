import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeQueryBuilder } from './supabaseMock';
import { supabase } from '@/lib/supabaseClient';
import {
  getPaRecs,
  getPaRecById,
  createPaRec,
  updatePaRec,
  deletePaRec,
  uploadPaRecImage,
  getPaRecImageUrl,
  removePaRecImage,
} from '@/lib/services/paRecService';
import type { PaRec } from '@/lib/types';

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

const sampleRec: PaRec = {
  id: 'r1',
  user_id: 'u1',
  project_id: 'p1',
  event: 'Conference',
  site: 'example.com',
  title: 'Talk notes',
  references: ['https://example.com'],
  points: ['first point'],
  key_learnings: 'Learned things',
  images: ['u1/photo.jpg'],
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPaRecs', () => {
  it('fetches all records newest-first when no projectId is given', async () => {
    const builder = makeQueryBuilder({ data: [sampleRec], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await getPaRecs();

    expect(mockFrom).toHaveBeenCalledWith('pa_recs');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.eq).not.toHaveBeenCalled();
    expect(result).toEqual([sampleRec]);
  });

  it('scopes to a project when projectId is given', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await getPaRecs('p1');

    expect(builder.eq).toHaveBeenCalledWith('project_id', 'p1');
  });
});

describe('getPaRecById', () => {
  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    expect(await getPaRecById('missing')).toBeNull();
  });
});

describe('createPaRec', () => {
  it('trims fields and filters blank list entries', async () => {
    const builder = makeQueryBuilder({ data: sampleRec, error: null });
    mockFrom.mockReturnValue(builder);

    await createPaRec({
      project_id: 'p1',
      title: '  Talk notes  ',
      event: '  Conference  ',
      site: '',
      references: ['  https://example.com  ', '   ', ''],
      points: ['  first point  ', ''],
      key_learnings: '  Learned things  ',
    });

    expect(builder.insert).toHaveBeenCalledWith([
      {
        project_id: 'p1',
        title: 'Talk notes',
        event: 'Conference',
        site: null,
        references: ['https://example.com'],
        points: ['first point'],
        key_learnings: 'Learned things',
        images: [],
      },
    ]);
  });

  it('rejects an empty title without hitting the database', async () => {
    await expect(createPaRec({ project_id: 'p1', title: '   ' })).rejects.toThrow(
      'needs a title',
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('updatePaRec', () => {
  it('only patches provided fields', async () => {
    const builder = makeQueryBuilder({ data: sampleRec, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaRec('r1', { points: ['  a  ', '', 'b'] });

    expect(builder.update).toHaveBeenCalledWith({ points: ['a', 'b'] });
    expect(builder.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('rejects clearing the title to blank', async () => {
    await expect(updatePaRec('r1', { title: '  ' })).rejects.toThrow('needs a title');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('patches project_id to move the record to another project', async () => {
    const builder = makeQueryBuilder({ data: sampleRec, error: null });
    mockFrom.mockReturnValue(builder);

    await updatePaRec('r1', { project_id: 'p2' });

    expect(builder.update).toHaveBeenCalledWith({ project_id: 'p2' });
  });
});

describe('deletePaRec', () => {
  it('deletes the row and removes its images from storage', async () => {
    const dbBuilder = makeQueryBuilder({ data: sampleRec, error: null });
    mockFrom.mockReturnValue(dbBuilder);
    const remove = vi.fn().mockResolvedValue({ data: null, error: null });
    mockStorageFrom.mockReturnValue({ remove });

    await deletePaRec('r1');

    expect(dbBuilder.delete).toHaveBeenCalled();
    expect(mockStorageFrom).toHaveBeenCalledWith('pa-rec-images');
    expect(remove).toHaveBeenCalledWith(['u1/photo.jpg']);
  });

  it('skips the storage call when there are no images', async () => {
    const noImageRec = { ...sampleRec, images: [] };
    mockFrom.mockReturnValue(makeQueryBuilder({ data: noImageRec, error: null }));

    await deletePaRec('r1');

    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
});

describe('uploadPaRecImage', () => {
  it('uploads under the current user id and returns the storage path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const upload = vi.fn().mockResolvedValue({ data: { path: 'ignored' }, error: null });
    mockStorageFrom.mockReturnValue({ upload });

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const path = await uploadPaRecImage(file);

    expect(mockStorageFrom).toHaveBeenCalledWith('pa-rec-images');
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^u1\/.+-photo\.jpg$/), file);
    expect(path).toMatch(/^u1\/.+-photo\.jpg$/);
  });

  it('rejects when there is no signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(uploadPaRecImage(new File(['x'], 'a.jpg'))).rejects.toThrow('signed in');
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
});

describe('getPaRecImageUrl', () => {
  it('returns a signed url for the given path', async () => {
    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example/a.jpg' }, error: null });
    mockStorageFrom.mockReturnValue({ createSignedUrl });

    const url = await getPaRecImageUrl('u1/a.jpg');

    expect(createSignedUrl).toHaveBeenCalledWith('u1/a.jpg', 60 * 60);
    expect(url).toBe('https://signed.example/a.jpg');
  });
});

describe('removePaRecImage', () => {
  it('removes the given path from storage', async () => {
    const remove = vi.fn().mockResolvedValue({ data: null, error: null });
    mockStorageFrom.mockReturnValue({ remove });

    await removePaRecImage('u1/a.jpg');

    expect(remove).toHaveBeenCalledWith(['u1/a.jpg']);
  });
});
