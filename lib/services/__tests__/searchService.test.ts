import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/lib/supabaseClient';
import { searchAll } from '@/lib/services/searchService';
import type { SearchResult } from '@/lib/types';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}));

const mockRpc = vi.mocked(supabase.rpc) as unknown as ReturnType<typeof vi.fn>;

const sampleHit: SearchResult = {
  type: 'note',
  id: 'n1',
  project_id: 'p1',
  title: 'Campaign idea',
  snippet: 'Launch the campaign in Q3',
  created_at: '2026-07-20T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('searchAll', () => {
  it('calls the RPC with the trimmed query and default args', async () => {
    mockRpc.mockResolvedValue({ data: [sampleHit], error: null });

    const result = await searchAll('  campaign  ');

    expect(mockRpc).toHaveBeenCalledWith('search_everything', {
      q: 'campaign',
      types: null,
      project_ids: null,
      include_archived: true,
      from_date: null,
      to_date: null,
      max_results: 100,
    });
    expect(result).toEqual([sampleHit]);
  });

  it('forwards filters, sending empty arrays as null', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await searchAll('x', {
      types: ['note', 'task'],
      projectIds: ['p1'],
      includeArchived: false,
      from: '2026-01-01T00:00:00Z',
      to: '2026-12-31T00:00:00Z',
      limit: 25,
    });

    expect(mockRpc).toHaveBeenCalledWith('search_everything', {
      q: 'x',
      types: ['note', 'task'],
      project_ids: ['p1'],
      include_archived: false,
      from_date: '2026-01-01T00:00:00Z',
      to_date: '2026-12-31T00:00:00Z',
      max_results: 25,
    });
  });

  it('coerces empty type/project arrays to null', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await searchAll('x', { types: [], projectIds: [] });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_everything',
      expect.objectContaining({ types: null, project_ids: null }),
    );
  });

  it('short-circuits without hitting the DB when query and filters are empty', async () => {
    const result = await searchAll('   ');

    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('still searches on an empty query when a filter is active', async () => {
    mockRpc.mockResolvedValue({ data: [sampleHit], error: null });

    const result = await searchAll('', { types: ['task'] });

    expect(mockRpc).toHaveBeenCalledOnce();
    expect(result).toEqual([sampleHit]);
  });

  it('treats includeArchived:false as an active filter on an empty query', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await searchAll('', { includeArchived: false });

    expect(mockRpc).toHaveBeenCalledOnce();
  });

  it('throws when the RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(searchAll('x')).rejects.toEqual({ message: 'boom' });
  });

  it('returns an empty array when the RPC yields no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    expect(await searchAll('x')).toEqual([]);
  });
});
