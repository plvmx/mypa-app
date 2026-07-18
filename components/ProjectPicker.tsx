'use client';

import { buildProjectTree, type ProjectNode } from '@/lib/projectTree';
import type { Project } from '@/lib/types';

function PickerNode({
  node,
  depth,
  excludedIds,
  onSelect,
}: {
  node: ProjectNode;
  depth: number;
  excludedIds: Set<string>;
  onSelect: (id: string | null) => void;
}) {
  const disabled = excludedIds.has(node.id);
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(node.id)}
        style={{ marginLeft: depth * 16 }}
        className="w-full rounded-xl px-3 py-2 text-left text-sm enabled:hover:bg-border/40 disabled:opacity-40"
      >
        {node.title}
      </button>
      {node.children.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {node.children.map((child) => (
            <PickerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              excludedIds={excludedIds}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * A bottom-sheet picker for choosing a new parent project. `excludedIds`
 * (self + descendants) are shown disabled, since moving a project there would
 * create a cycle. Selecting null moves the project to top-level.
 */
export default function ProjectPicker({
  projects,
  excludedIds,
  onSelect,
  onClose,
}: {
  projects: Project[];
  excludedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const tree = buildProjectTree(projects);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">Move to…</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancel
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-border/40"
            >
              Top level
            </button>
          </li>
          {tree.map((node) => (
            <PickerNode
              key={node.id}
              node={node}
              depth={0}
              excludedIds={excludedIds}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
