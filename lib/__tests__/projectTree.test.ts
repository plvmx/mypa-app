import { describe, it, expect } from 'vitest';
import { buildProjectTree, getAncestors, getDescendantIds } from '@/lib/projectTree';
import type { Project } from '@/lib/types';

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    user_id: 'u1',
    title: overrides.id,
    description: null,
    color: null,
    status: 'active',
    parent_id: null,
    created_at: '2026-07-14T00:00:00Z',
    updated_at: '2026-07-14T00:00:00Z',
    ...overrides,
  };
}

// root1
//  ├─ child1
//  │   └─ grandchild1
//  └─ child2
// root2
const root1 = makeProject({ id: 'root1' });
const root2 = makeProject({ id: 'root2' });
const child1 = makeProject({ id: 'child1', parent_id: 'root1' });
const child2 = makeProject({ id: 'child2', parent_id: 'root1' });
const grandchild1 = makeProject({ id: 'grandchild1', parent_id: 'child1' });

const projects = [root1, root2, child1, child2, grandchild1];

describe('buildProjectTree', () => {
  it('nests projects by parent_id under multiple roots', () => {
    const tree = buildProjectTree(projects);

    expect(tree.map((n) => n.id)).toEqual(['root1', 'root2']);
    const treeRoot1 = tree[0];
    expect(treeRoot1.children.map((n) => n.id)).toEqual(['child1', 'child2']);
    expect(treeRoot1.children[0].children.map((n) => n.id)).toEqual(['grandchild1']);
    expect(tree[1].children).toEqual([]);
  });

  it('treats a project with a missing/invisible parent as a root', () => {
    const orphan = makeProject({ id: 'orphan', parent_id: 'does-not-exist' });
    const tree = buildProjectTree([orphan]);
    expect(tree.map((n) => n.id)).toEqual(['orphan']);
  });
});

describe('getAncestors', () => {
  it('returns the root-first ancestor chain, excluding the project itself', () => {
    expect(getAncestors(projects, 'grandchild1').map((p) => p.id)).toEqual(['root1', 'child1']);
    expect(getAncestors(projects, 'child1').map((p) => p.id)).toEqual(['root1']);
  });

  it('returns an empty array for a top-level project', () => {
    expect(getAncestors(projects, 'root2')).toEqual([]);
  });

  it('returns an empty array for an unknown id', () => {
    expect(getAncestors(projects, 'missing')).toEqual([]);
  });
});

describe('getDescendantIds', () => {
  it('collects all descendants, excluding the project itself', () => {
    expect(getDescendantIds(projects, 'root1')).toEqual(new Set(['child1', 'child2', 'grandchild1']));
  });

  it('returns an empty set for a leaf project', () => {
    expect(getDescendantIds(projects, 'grandchild1')).toEqual(new Set());
  });

  it('returns an empty set for a project with no children', () => {
    expect(getDescendantIds(projects, 'root2')).toEqual(new Set());
  });
});
