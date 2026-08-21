'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PaTaskCard from '@/components/PaTaskCard';
import type { PaTask, Project } from '@/lib/types';

/** Six-dot grip icon for the drag handle. */
function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/**
 * Drag-reorderable wrapper around PaTaskCard, for use inside a dnd-kit
 * `SortableContext`. Only the grip handle is draggable (not the whole card)
 * so the card's own Link/buttons keep working normally.
 */
export default function SortableTaskItem({
  task,
  projects,
  onDeleted,
  onUpdated,
}: {
  task: PaTask;
  projects?: Project[];
  onDeleted: (id: string) => void;
  onUpdated?: (task: PaTask) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <PaTaskCard
        task={task}
        projects={projects}
        onDeleted={onDeleted}
        onUpdated={onUpdated}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="mt-0.5 flex shrink-0 touch-none items-center text-muted active:cursor-grabbing"
          >
            <GripIcon />
          </button>
        }
      />
    </li>
  );
}
