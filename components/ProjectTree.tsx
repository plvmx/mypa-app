import Link from 'next/link';
import { resolveProjectColor, type ProjectNode } from '@/lib/projectTree';
import type { Project } from '@/lib/types';

function ProjectTreeItem({
  node,
  depth,
  allProjects,
}: {
  node: ProjectNode;
  depth: number;
  allProjects: Project[];
}) {
  return (
    <li>
      <Link
        href={`/app/projects/${node.id}`}
        style={{ marginLeft: depth * 16 }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-border/40"
      >
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
        <span aria-hidden className="text-muted">
          ›
        </span>
      </Link>
      {node.children.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {node.children.map((child) => (
            <ProjectTreeItem key={child.id} node={child} depth={depth + 1} allProjects={allProjects} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Renders a nested project list (from `buildProjectTree`), indenting sub-projects under their parent. */
export default function ProjectTree({ nodes, projects }: { nodes: ProjectNode[]; projects: Project[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {nodes.map((node) => (
        <ProjectTreeItem key={node.id} node={node} depth={0} allProjects={projects} />
      ))}
    </ul>
  );
}
