'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProjectById } from '@/lib/services/projectService';
import { getPaRecs } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import PaRecCard from '@/components/PaRecCard';
import type { Project, PaRec } from '@/lib/types';

/** Records list for a project, with a link to create a new one. */
export default function ProjectRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<PaRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getProjectById(id), getPaRecs(id)])
      .then(([proj, recs]) => {
        if (!active) return;
        setProject(proj);
        setRecords(recs);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/app">Projects</Link>
        <span aria-hidden>›</span>
        <Link href={`/app/projects/${id}`}>{project?.title ?? 'Project'}</Link>
        <span aria-hidden>›</span>
        <span>Records</span>
      </div>

      <div className="mb-4 mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Records</h1>
        <Link
          href={`/app/projects/${id}/records/new`}
          className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          New
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No records yet. Tap <span className="font-medium">New</span> to add your first one.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {records.map((record) => (
            <li key={record.id}>
              <PaRecCard
                record={record}
                onDeleted={(deletedId) =>
                  setRecords((prev) => prev.filter((r) => r.id !== deletedId))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
