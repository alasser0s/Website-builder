import type { BlueprintNode, SelectPathResult, NodePath } from './types';

export function selectNodeById(root: BlueprintNode, nodeId: string): BlueprintNode | undefined {
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = selectNodeById(child, nodeId);
    if (found) return found;
  }
  return undefined;
}

export function selectChildren(root: BlueprintNode, nodeId: string): BlueprintNode[] | undefined {
  const node = selectNodeById(root, nodeId);
  return node?.children;
}

export function selectPath(root: BlueprintNode, nodeId: string): SelectPathResult | undefined {
  const idPath: string[] = [];
  const indexPath: number[] = [];

  const dfs = (node: BlueprintNode): boolean => {
    if (node.id === nodeId) {
      idPath.push(node.id);
      return true;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const found = dfs(child);
      if (found) {
        idPath.unshift(node.id);
        indexPath.unshift(i);
        return true;
      }
    }
    return false;
  };

  const found = dfs(root);
  if (!found) return undefined;
  return { idPath, indexPath };
}

// Stable API that never returns undefined; returns empty array when node not found or has no children
export function selectChildrenOrEmpty(root: BlueprintNode, nodeId: string): BlueprintNode[] {
  const node = selectNodeById(root, nodeId);
  return node ? node.children : [];
}

// Returns the path of node ids from root to the target node.
export function selectPathIds(root: BlueprintNode, nodeId: string): NodePath | undefined {
  if (root.id === nodeId) return [root.id];
  for (const child of root.children) {
    const childPath = selectPathIds(child, nodeId);
    if (childPath) return [root.id, ...childPath];
  }
  return undefined;
}

// Returns the array of nodes from root to the target node.
export function selectPathNodes(root: BlueprintNode, nodeId: string): BlueprintNode[] | undefined {
  if (root.id === nodeId) return [root];
  for (const child of root.children) {
    const childPath = selectPathNodes(child, nodeId);
    if (childPath) return [root, ...childPath];
  }
  return undefined;
}

// Returns true if ancestorId is an ancestor of nodeId
export function isAncestor(root: BlueprintNode, ancestorId: string, nodeId: string): boolean {
  const path = selectPath(root, nodeId);
  if (!path) return false;
  return path.idPath.includes(ancestorId) && ancestorId !== nodeId;
}

// Header helpers
export function selectHeaderSlot(
  root: BlueprintNode,
  headerId: string,
  slot: 'logo' | 'nav',
): string[] {
  const node = selectNodeById(root, headerId);
  const slots = (node as any)?.slots;
  if (!node || node.type !== 'header' || !slots) return [];
  const arr = (slots as any)[slot];
  return Array.isArray(arr) ? (arr as string[]) : [];
}

// Footer helpers
export function selectFooterColumns(root: BlueprintNode, footerId: string): Array<{ id: string; content: string[] }> {
  const node = selectNodeById(root, footerId);
  const columns = (node as any)?.columns;
  if (!node || node.type !== 'footer' || !Array.isArray(columns)) return [];
  return columns as Array<{ id: string; content: string[] }>;
}


