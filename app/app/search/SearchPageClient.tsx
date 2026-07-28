'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { searchAll } from '@/lib/services/searchService';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Project, SearchResult, SearchResultType } from '@/lib/types';

const TYPE_OPTIONS: { value: SearchResultType; label: string }[] = [
  { value: 'project', label: 'Projects' },
  { value: 'note', label: 'Notes' },
  { value: 'record', label: 'Records' },
  { value: 'task', label: 'Tasks' },
];

const TYPE_BADGE: Record<SearchResultType, string> = {
  project: 'Project',
  note: 'Note',
  record: 'Record',
  task: 'Task',
};

/** Where a given result links to in the app. */
function hrefFor(result: SearchResult): string {
  switch (result.type) {
    case 'project':
      return `/app/projects/${result.id}`;
    case 'record':
      return `/app/projects/${result.project_id}/records/${result.id}`;
    case 'task':
      return `/app/projects/${result.project_id}/tasks/${result.id}`;
    case 'note':
      // Notes have no standalone page: filed notes live on their project,
      // unfiled ones in the inbox.
      return result.project_id ? `/app/projects/${result.project_id}` : '/app/notes';
  }
}

/** Split `text` around case-insensitive occurrences of `term`, wrapping hits in <mark>. */
function highlight(text: string, term: string) {
  const q = term.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const at = lower.indexOf(needle, i);
    if (at === -1) {
      out.push(text.slice(i));
      break;
    }
    if (at > i) out.push(text.slice(i, at));
    out.push(
      <mark key={key++} className="rounded bg-accent/20 text-foreground">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    i = at + needle.length;
  }
  return out;
}

/** Convert a `YYYY-MM-DD` date input to an ISO bound, or null when blank. */
function toBound(date: string, end: boolean): string | null {
  if (!date) return null;
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00'}Z`).toISOString();
}

/**
 * Global search surface: a debounced query box, type/project/archived/date
 * filters, and a flat newest-first result list linking to each item.
 */
export default function SearchPageClient({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<Set<SearchResultType>>(new Set());
  const [projectId, setProjectId] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const projectNames = useMemo(
    () => new Map(projects.map((p) => [p.id, p.title])),
    [projects],
  );

  // Bumped on every fired request so late responses from a stale query are ignored.
  const requestSeq = useRef(0);

  const typeList = useMemo(() => Array.from(types), [types]);
  const typeKey = typeList.join(',');

  useEffect(() => {
    const q = query.trim();
    const filtersActive =
      typeList.length > 0 || !!projectId || !includeArchived || !!from || !!to;
    const seq = ++requestSeq.current;

    const timer = setTimeout(async () => {
      if (!q && !filtersActive) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const hits = await searchAll(q, {
          types: typeList,
          projectIds: projectId ? [projectId] : undefined,
          includeArchived,
          from: toBound(from, false),
          to: toBound(to, true),
        });
        if (seq !== requestSeq.current) return;
        setResults(hits);
        setSearched(true);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(getErrorMessage(err));
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
    // typeKey stands in for the typeList array's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, typeKey, projectId, includeArchived, from, to]);

  function toggleType(type: SearchResultType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const hasFilters = !!projectId || !includeArchived || !!from || !!to;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Search</h1>

      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search everything…"
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base outline-none focus:border-accent"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => {
          const active = types.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleType(opt.value)}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        className="mt-3 text-sm text-muted hover:text-foreground"
      >
        {showFilters ? 'Hide filters' : 'More filters'}
        {hasFilters && !showFilters ? ' ·' : ''}
      </button>

      {showFilters && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-base"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.status === 'archived' ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-muted">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-base"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-muted">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-base"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            <span>Include archived projects</span>
          </label>
        </div>
      )}

      <div className="mt-4">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted">Searching…</p>
        ) : searched && results.length === 0 ? (
          <p className="text-sm text-muted">No matches.</p>
        ) : results.length > 0 ? (
          <>
            <p className="mb-2 text-xs text-muted">
              {results.length} result{results.length === 1 ? '' : 's'}
            </p>
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link
                    href={hrefFor(r)}
                    className="block rounded-lg border border-border bg-card p-3 hover:border-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                        {TYPE_BADGE[r.type]}
                      </span>
                      {r.project_id && projectNames.has(r.project_id) && (
                        <span className="truncate text-xs text-muted">
                          {projectNames.get(r.project_id)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium">{highlight(r.title, query)}</p>
                    {r.snippet && r.snippet !== r.title && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                        {highlight(r.snippet, query)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">
            Search across projects, notes, records and tasks — matches any part
            of a word.
          </p>
        )}
      </div>
    </div>
  );
}
