'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resolveProjectColor, type ProjectNode } from '@/lib/projectTree';
import type { Project } from '@/lib/types';

function ProjectTreeItem({
  node,
  depth,
  allProjects,
  expandedIds,
  onToggle,
}: {
  node: ProjectNode;
  depth: number;
  allProjects: Project[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);

  return (
    <li>
      <div
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-border/40"
        style={{ marginLeft: depth * 16 }}
      >
        <Link href={`/app/projects/${node.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: resolveProjectColor(node, allProjects) }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{node.title}</span>
            {node.description && (
              <span className="block truncate text-sm text-muted">{node.description}</span>
            )}
          </span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse sub-projects' : 'Expand sub-projects'}
            className="flex shrink-0 items-center gap-1 text-muted hover:text-accent"
          >
            <span
              aria-hidden
              className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}
            >
              ›
            </span>
            <span className="text-xs font-medium">{node.children.length}</span>
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="mt-2 flex flex-col gap-2">
          {node.children.map((child) => (
            <ProjectTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              allProjects={allProjects}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Renders a nested project list (from `buildProjectTree`), indenting
 * sub-projects under their parent. Hierarchies start collapsed; each level
 * with children gets its own expand/collapse toggle.
 */
export default function ProjectTree({ nodes, projects }: { nodes: ProjectNode[]; projects: Project[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function handleToggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {nodes.map((node) => (
        <ProjectTreeItem
          key={node.id}
          node={node}
          depth={0}
          allProjects={projects}
          expandedIds={expandedIds}
          onToggle={handleToggle}
        />
      ))}
    </ul>
  );
}
