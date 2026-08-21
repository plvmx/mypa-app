/**
 * Fractional-indexing helper for drag-reordering open tasks. Each task has a
 * `position` (a plain float); the list renders in ascending `position` order.
 * Moving a task only ever rewrites *that* task's position — never its
 * neighbours' — by picking a value that falls between its new neighbours.
 */

/** Gap between manually-appended positions, large enough to keep splitting for a very long time before floats lose precision. */
const GAP = 1000;

/**
 * Position for a task dropped between `before` and `after` (either end's
 * neighbour may be absent). Halves the gap between them; dropped at the very
 * start/end of the list, it steps `GAP` beyond the current edge.
 */
export function computeReorderPosition(before: number | undefined, after: number | undefined): number {
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (after !== undefined) return after - GAP;
  if (before !== undefined) return before + GAP;
  return 0;
}
