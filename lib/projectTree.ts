import { DEFAULT_PROJECT_COLOR, getIntensifiedColor } from '@/lib/colors';
import type { Project } from '@/lib/types';

/** A project plus its nested children, for tree rendering. */
export interface ProjectNode extends Project {
  children: ProjectNode[];
}

/**
 * Nest a flat project list by `parent_id`. Projects whose `parent_id` points
 * at a missing/invisible project are treated as roots, so a partial or
 * filtered list never silently drops rows.
 */
export function buildProjectTree(projects: Project[]): ProjectNode[] {
  const nodes: ProjectNode[] = projects.map((p) => ({ ...p, children: [] }));
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const roots: ProjectNode[] = [];

  for (const node of nodes) {
    const parent = node.parent_id ? nodesById.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

/** The chain of ancestors for `id`, root-first (for breadcrumbs). Excludes `id` itself. */
export function getAncestors(projects: Project[], id: string): Project[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const chain: Project[] = [];
  let cursor = byId.get(id)?.parent_id ?? null;
  while (cursor !== null) {
    const project = byId.get(cursor);
    if (!project) break;
    chain.unshift(project);
    cursor = project.parent_id;
  }
  return chain;
}

/**
 * The color to display for a project: only top-level projects store a color,
 * so a sub-project's display color is derived from its top-level ancestor's
 * color, intensified per level of nesting (see `getIntensifiedColor`).
 */
export function resolveProjectColor(project: Project, allProjects: Project[]): string {
  const ancestors = getAncestors(allProjects, project.id);
  const root = ancestors[0] ?? project;
  return getIntensifiedColor(root.color ?? DEFAULT_PROJECT_COLOR, ancestors.length);
}

/** All descendant ids of `id` (children, grandchildren, ...). Excludes `id` itself. */
export function getDescendantIds(projects: Project[], id: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const project of projects) {
    if (!project.parent_id) continue;
    const siblings = childrenByParent.get(project.parent_id) ?? [];
    siblings.push(project.id);
    childrenByParent.set(project.parent_id, siblings);
  }

  const descendants = new Set<string>();
  const queue = [...(childrenByParent.get(id) ?? [])];
  while (queue.length > 0) {
    const next = queue.pop();
    if (next === undefined || descendants.has(next)) continue;
    descendants.add(next);
    queue.push(...(childrenByParent.get(next) ?? []));
  }
  return descendants;
}
