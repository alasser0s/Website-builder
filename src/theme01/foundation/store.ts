import { useCallback, useMemo, useReducer } from 'react';
import type { BlueprintAction, BlueprintNode, BlueprintStateSnapshot, HistoryState, NodeType } from './types';
import { validateNode, validateTree } from './validators';
import { selectPath, isAncestor } from './selectors';
import { createInitialSkeleton } from './skeleton';
import { generateNodeId } from './id';

// Note: features, gallery, slider, testimonials removed to allow children
const LEAF_NODE_TYPES: NodeType[] = [
  'component',
  'heading',
  'paragraph',
  'list',
  'image',
  'button',
  'badge',
  'divider',
  // 'features',    // Now supports children
  // 'gallery',     // Now supports children  
  // 'slider',      // Now supports children
  // 'testimonials', // Now supports children
  'map',
  'opening_hours',
  'menu_grid',
  'cart',
];

function isLeafNodeType(type: NodeType): boolean {
  return LEAF_NODE_TYPES.includes(type);
}

const CONTENT_NODE_TYPES: NodeType[] = ['section', 'container', 'column'];

function isContentNodeType(type: NodeType): boolean {
  return CONTENT_NODE_TYPES.includes(type);
}

function syncContent(node: BlueprintNode) {
  if (!isContentNodeType(node.type)) return;
  (node as any).content = node.children.map((child) => child.id);
}

function deepClone<T>(value: T): T {
  const sc: (<T>(value: T) => T) | undefined = (globalThis as any).structuredClone;
  return sc ? sc(value) : JSON.parse(JSON.stringify(value));
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeOverwrite<T extends Record<string, unknown> | undefined, U extends Record<string, unknown> | undefined>(
  target: T,
  source: U,
): T & U {
  const output: any = { ...(target ?? {}) };
  const src: any = source ?? {};
  for (const key of Object.keys(src)) {
    const dstVal = output[key];
    const srcVal = src[key];
    if (isPlainObject(dstVal) && isPlainObject(srcVal)) {
      output[key] = deepMergeOverwrite(dstVal, srcVal);
    } else {
      output[key] = srcVal;
    }
  }
  return output;
}


const MAX_HISTORY = 200;

function withHistoryCommit(history: HistoryState, nextPresent: BlueprintStateSnapshot): HistoryState {
  const nextPast = [...history.past, history.present];
  const trimmedPast = nextPast.length > MAX_HISTORY ? nextPast.slice(nextPast.length - MAX_HISTORY) : nextPast;
  return { past: trimmedPast, present: nextPresent, future: [] };
}

// internal helper to traverse using index path
// function getNodeByIndexPath(root: BlueprintNode, indexPath: number[]): BlueprintNode | undefined {
//   let node: BlueprintNode = root;
//   for (let i = 0; i < indexPath.length; i += 1) {
//     const idx = indexPath[i];
//     if (!node.children || idx < 0 || idx >= node.children.length) return undefined;
//     node = node.children[idx];
//   }
//   return node;
// }

function coreReducer(history: HistoryState, action: BlueprintAction): HistoryState {
  switch (action.type) {
    case 'HYDRATE': {
      const snapshot = deepClone(action.snapshot);
      return { past: [], present: snapshot, future: [] };
    }
    case 'UNDO': {
      if (history.past.length === 0) return history;
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      return { past: newPast, present: previous, future: [history.present, ...history.future] };
    }
    case 'REDO': {
      if (history.future.length === 0) return history;
      const [next, ...rest] = history.future;
      return { past: [...history.past, history.present], present: next, future: rest };
    }
    case 'ADD_COMPONENT': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { parentId, node, index } = action;
      const path = selectPath(snapshot.root, parentId);
      if (!path) throw new Error(`Parent not found: ${parentId}`);
      let current: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!current.children) throw new Error('Parent children missing');
        current = current.children[childIndex];
      }
      const parentNode = current;
      // Prevent adding children into a leaf component
      if (isLeafNodeType(parentNode.type)) throw new Error('Cannot add child to a leaf node');
      // Dev guard: discourage adding directly under header/footer (use slot/columns actions)
      if (process.env.NODE_ENV !== 'production') {
        if (parentNode.type === 'header' || parentNode.type === 'footer') {
          // eslint-disable-next-line no-console
          console.warn(`ADD_COMPONENT discouraged on ${parentNode.type}(${parentNode.id}); use slot/columns actions.`);
        }
      }
      const newChild = { ...node, children: node.children ?? [] } as BlueprintNode;
      if (isContentNodeType(newChild.type) && !(newChild as any).content && newChild.children.length > 0) {
        (newChild as any).content = newChild.children.map((child) => child.id);
      }
      if (typeof index === 'number') {
        const clamped = Math.max(0, Math.min(index, parentNode.children.length));
        (parentNode.children as BlueprintNode[]).splice(clamped, 0, newChild);
      } else {
        (parentNode.children as BlueprintNode[]).push(newChild);
      }
      syncContent(parentNode);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'UPDATE_DATA': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const path = selectPath(snapshot.root, action.nodeId);
      if (!path) throw new Error(`Node not found: ${action.nodeId}`);
      let current: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!current.children) throw new Error('Children missing');
        current = current.children[childIndex];
      }
      current.data = { ...(current.data ?? {}), ...action.data };
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'UPDATE_STYLES': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const path = selectPath(snapshot.root, action.nodeId);
      if (!path) throw new Error(`Node not found: ${action.nodeId}`);
      let current: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!current.children) throw new Error('Children missing');
        current = current.children[childIndex];
      }
      current.styles = deepMergeOverwrite(current.styles as any, action.styles as any);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REORDER': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { parentId, from, to } = action;
      const path = selectPath(snapshot.root, parentId);
      if (!path) throw new Error(`Parent not found: ${parentId}`);
      let parent: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!parent.children) throw new Error('Children missing');
        parent = parent.children[childIndex];
      }
      const list = parent.children;
      if (from < 0 || from >= list.length || to < 0 || to >= list.length) {
        throw new Error('Invalid reorder indices');
      }
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      syncContent(parent);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'MOVE_NODE': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { fromParentId, fromIndex, toParentId, toIndex } = action;
      if (fromParentId === toParentId && fromIndex === toIndex) return history;
      const fromPath = selectPath(snapshot.root, fromParentId);
      const toPath = selectPath(snapshot.root, toParentId);
      if (!fromPath) throw new Error(`fromParent not found: ${fromParentId}`);
      if (!toPath) throw new Error(`toParent not found: ${toParentId}`);
      let fromParent: BlueprintNode = snapshot.root;
      for (let i = 1; i < fromPath.idPath.length; i += 1) {
        const childIndex = fromPath.indexPath[i - 1];
        if (!fromParent.children) throw new Error('Children missing');
        fromParent = fromParent.children[childIndex];
      }
      let toParent: BlueprintNode = snapshot.root;
      for (let i = 1; i < toPath.idPath.length; i += 1) {
        const childIndex = toPath.indexPath[i - 1];
        if (!toParent.children) throw new Error('Children missing');
        toParent = toParent.children[childIndex];
      }
      if (!fromParent.children || !toParent.children) throw new Error('Children missing');
      if (fromIndex < 0 || fromIndex >= fromParent.children.length) throw new Error('Invalid fromIndex');
      const clampedTo = Math.max(0, Math.min(toIndex, toParent.children.length));
      // Prevent cycles: moving parent into its own descendant
      const movingNode = fromParent.children[fromIndex];
      if (isAncestor(snapshot.root, movingNode.id, toParentId)) throw new Error('Cycle detected: cannot move node into its descendant');
      const [moved] = fromParent.children.splice(fromIndex, 1);
      // Adjust index if moving within same parent and fromIndex < toIndex
      const insertIndex = fromParent === toParent && fromIndex < clampedTo ? clampedTo - 1 : clampedTo;
      toParent.children.splice(insertIndex, 0, moved);
      if (fromParent === toParent) {
        syncContent(fromParent);
      } else {
        syncContent(fromParent);
        syncContent(toParent);
      }
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'WRAP_IN_CONTAINER': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { nodeId, containerType } = action;
      const path = selectPath(snapshot.root, nodeId);
      if (!path) throw new Error(`Node not found: ${nodeId}`);

      // Find parent and index of target
      let parent: BlueprintNode | undefined = undefined;
      let node: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        parent = node;
        if (!node.children) throw new Error('Children missing');
        node = node.children[childIndex];
      }
      if (!parent || !parent.children) throw new Error('Cannot wrap root');
      const indexInParent = path.indexPath[path.indexPath.length - 1];

      // Create container and move node under it
      const container: BlueprintNode = {
        id: generateNodeId(containerType),
        type: containerType,
        children: [node],
      };
      if (isContentNodeType(container.type)) {
        (container as any).content = [node.id];
      }
      parent.children[indexInParent] = container;
      syncContent(parent);

      // Update references in header slots / footer columns to point to new container id
      const replaceRefs = (root: BlueprintNode, fromId: string, toId: string) => {
        const walk = (node: BlueprintNode) => {
          if ((node as any)?.slots && node.type === 'header') {
            const slots = (node as any).slots as { logo?: string[]; right?: string[] };
            for (const key of ['logo', 'right'] as const) {
              const arr = (slots as any)[key];
              if (Array.isArray(arr)) {
                const idx = arr.indexOf(fromId);
                if (idx !== -1) arr[idx] = toId;
              }
            }
          }
          if ((node as any)?.columns && node.type === 'footer') {
            const columns = (node as any).columns as Array<{ id: string; content: string[] }>;
            for (const col of columns) {
              const idx = col.content.indexOf(fromId);
              if (idx !== -1) col.content[idx] = toId;
            }
          }
          node.children?.forEach(walk);
        };
        walk(root);
      };
      replaceRefs(snapshot.root, nodeId, container.id);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'WRAP_AND_MOVE': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { targetId, draggingId, containerType, toIndex } = action;
      const tPath = selectPath(snapshot.root, targetId);
      const dPath = selectPath(snapshot.root, draggingId);
      if (!tPath) throw new Error(`Target not found: ${targetId}`);
      if (!dPath) throw new Error(`Dragging not found: ${draggingId}`);
      // Find target parent and index
      let tParent: BlueprintNode | undefined = undefined;
      let tNode: BlueprintNode = snapshot.root;
      for (let i = 1; i < tPath.idPath.length; i += 1) {
        const childIndex = tPath.indexPath[i - 1];
        tParent = tNode;
        if (!tNode.children) throw new Error('Children missing');
        tNode = tNode.children[childIndex];
      }
      if (!tParent || !tParent.children) throw new Error('Cannot wrap root');
      const tIndex = tPath.indexPath[tPath.indexPath.length - 1];
      // Create container and place target inside
      const container: BlueprintNode = { id: generateNodeId(containerType), type: containerType, children: [tNode] };
      if (isContentNodeType(container.type)) {
        (container as any).content = [tNode.id];
      }
      tParent.children[tIndex] = container;
      syncContent(tParent);

      // Resolve dragging node and its parent
      let dParent: BlueprintNode = snapshot.root;
      for (let i = 1; i < dPath.idPath.length - 1; i += 1) {
        const childIndex = dPath.indexPath[i - 1];
        if (!dParent.children) throw new Error('Children missing');
        dParent = dParent.children[childIndex];
      }
      const dIndex = dPath.indexPath[dPath.indexPath.length - 1];
      if (!dParent.children) throw new Error('Children missing');
      const [dragged] = dParent.children.splice(dIndex, 1);
      // Prevent cycles: dragged cannot be ancestor of container
      if (isAncestor(snapshot.root, dragged.id, container.id)) throw new Error('Cycle detected');
      const insertAt = typeof toIndex === 'number' ? Math.max(0, Math.min(toIndex, container.children.length)) : container.children.length;
      container.children.splice(insertAt, 0, dragged);
      syncContent(dParent);
      syncContent(container);

      // Update references in header/footer if needed (reuse helper)
      const replaceRefs = (root: BlueprintNode, fromId: string, toId: string) => {
        const walk = (node: BlueprintNode) => {
          if ((node as any)?.slots && node.type === 'header') {
            const slots = (node as any).slots as { logo?: string[]; right?: string[] };
            for (const key of ['logo', 'right'] as const) {
              const arr = (slots as any)[key];
              if (Array.isArray(arr)) {
                const idx = arr.indexOf(fromId);
                if (idx !== -1) arr[idx] = toId;
              }
            }
          }
          if ((node as any)?.columns && node.type === 'footer') {
            const columns = (node as any).columns as Array<{ id: string; content: string[] }>;
            for (const col of columns) {
              const idx = col.content.indexOf(fromId);
              if (idx !== -1) col.content[idx] = toId;
            }
          }
          node.children?.forEach(walk);
        };
        walk(root);
      };
      replaceRefs(snapshot.root, targetId, container.id);

      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REMOVE': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { nodeId } = action;
      const path = selectPath(snapshot.root, nodeId);
      if (!path) throw new Error(`Node not found: ${nodeId}`);
      // Cannot remove root
      if (path.idPath.length === 1) throw new Error('Cannot remove root');
      let parent: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length - 1; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!parent.children) throw new Error('Children missing');
        parent = parent.children[childIndex];
      }
      if (!parent.children) throw new Error('Children missing');
      const indexInParent = path.indexPath[path.indexPath.length - 1];
      parent.children.splice(indexInParent, 1);
      syncContent(parent);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    // ------------------------------
    // Header slot & navItems operations
    // ------------------------------
    case 'ADD_TO_HEADER_SLOT': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { headerId, slot, node } = action;
      const path = selectPath(snapshot.root, headerId);
      if (!path) throw new Error(`Header not found: ${headerId}`);
      let header: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!header.children) throw new Error('Children missing');
        header = header.children[childIndex];
      }
      if (header.type !== 'header') throw new Error('Target is not a header');
      const slots = (header as any).slots as { logo?: string[]; right?: string[] };
      if (!slots || !Array.isArray((slots as any)[slot])) throw new Error('Header slots invalid');
      // single-item slot: replace existing if present
      const newChild = { ...node, children: node.children ?? [] } as BlueprintNode;
      header.children.push(newChild);
      const arr = (slots as any)[slot] as string[];
      arr.splice(0, arr.length, newChild.id);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REMOVE_FROM_HEADER_SLOT': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { headerId, slot, nodeId } = action;
      const path = selectPath(snapshot.root, headerId);
      if (!path) throw new Error(`Header not found: ${headerId}`);
      let header: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!header.children) throw new Error('Children missing');
        header = header.children[childIndex];
      }
      const slots = (header as any).slots as { [k in 'logo' | 'right']: string[] };
      const arr = slots?.[slot];
      if (!Array.isArray(arr)) throw new Error('Header slots invalid');
      const idToRemove = nodeId ?? arr[0];
      const idx = idToRemove ? arr.indexOf(idToRemove) : -1;
      if (idx !== -1) arr.splice(idx, 1);
      // remove child node from header.children
      const cidx = header.children.findIndex((n) => n.id === idToRemove);
      if (cidx !== -1) header.children.splice(cidx, 1);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'ADD_NAV_ITEM': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { headerId, item, index } = action;
      const path = selectPath(snapshot.root, headerId);
      if (!path) throw new Error(`Header not found: ${headerId}`);
      let header: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!header.children) throw new Error('Children missing');
        header = header.children[childIndex];
      }
      if (header.type !== 'header') throw new Error('Target is not a header');
      const data = (header.data ?? {}) as any;
      const arr = (data.navItems ?? []) as any[];
      data.navItems = arr;
      const clamped = typeof index === 'number' ? Math.max(0, Math.min(index, arr.length)) : arr.length;
      arr.splice(clamped, 0, { ...item });
      header.data = data;
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'UPDATE_NAV_ITEM': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { headerId, itemId, patch } = action;
      const path = selectPath(snapshot.root, headerId);
      if (!path) throw new Error(`Header not found: ${headerId}`);
      let header: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!header.children) throw new Error('Children missing');
        header = header.children[childIndex];
      }
      const data = (header.data ?? {}) as any;
      const arr = (data.navItems ?? []) as any[];
      const idx = arr.findIndex((it) => it.id === itemId);
      if (idx !== -1) arr[idx] = { ...arr[idx], ...patch };
      header.data = data;
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REMOVE_NAV_ITEM': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { headerId, itemId } = action;
      const path = selectPath(snapshot.root, headerId);
      if (!path) throw new Error(`Header not found: ${headerId}`);
      let header: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!header.children) throw new Error('Children missing');
        header = header.children[childIndex];
      }
      const data = (header.data ?? {}) as any;
      const arr = (data.navItems ?? []) as any[];
      const idx = arr.findIndex((it) => it.id === itemId);
      if (idx !== -1) arr.splice(idx, 1);
      header.data = data;
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REORDER_NAV_ITEMS': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { headerId, from, to } = action;
      const path = selectPath(snapshot.root, headerId);
      if (!path) throw new Error(`Header not found: ${headerId}`);
      let header: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!header.children) throw new Error('Children missing');
        header = header.children[childIndex];
      }
      const data = (header.data ?? {}) as any;
      const arr = (data.navItems ?? []) as any[];
      if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) throw new Error('Invalid reorder indices');
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      header.data = data;
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    // ------------------------------
    // Footer columns operations
    // ------------------------------
    case 'ADD_FOOTER_COLUMN': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { footerId, columnId, index } = action;
      const path = selectPath(snapshot.root, footerId);
      if (!path) throw new Error(`Footer not found: ${footerId}`);
      let footer: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!footer.children) throw new Error('Children missing');
        footer = footer.children[childIndex];
      }
      if (footer.type !== 'footer') throw new Error('Target is not a footer');
      const cols = ((footer as any).columns ?? []) as Array<{ id: string; content: string[] }>;
      (footer as any).columns = cols;
      const newColId = columnId ?? generateNodeId('fcol');
      const newCol = { id: newColId, content: [] as string[] };
      const clamped = typeof index === 'number' ? Math.max(0, Math.min(index, cols.length)) : cols.length;
      cols.splice(clamped, 0, newCol);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REMOVE_FOOTER_COLUMN': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { footerId, columnId } = action;
      const path = selectPath(snapshot.root, footerId);
      if (!path) throw new Error(`Footer not found: ${footerId}`);
      let footer: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!footer.children) throw new Error('Children missing');
        footer = footer.children[childIndex];
      }
      const cols = ((footer as any).columns ?? []) as Array<{ id: string; content: string[] }>;
      const idx = cols.findIndex((c) => c.id === columnId);
      if (idx !== -1) {
        const toRemoveIds = cols[idx].content;
        // remove referenced nodes from footer.children
        footer.children = footer.children.filter((n) => !toRemoveIds.includes(n.id));
        cols.splice(idx, 1);
      }
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'ADD_TO_FOOTER_COLUMN': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { footerId, columnId, node, index } = action;
      const path = selectPath(snapshot.root, footerId);
      if (!path) throw new Error(`Footer not found: ${footerId}`);
      let footer: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!footer.children) throw new Error('Children missing');
        footer = footer.children[childIndex];
      }
      if (footer.type !== 'footer') throw new Error('Target is not a footer');
      const cols = ((footer as any).columns ?? []) as Array<{ id: string; content: string[] }>;
      const col = cols.find((c) => c.id === columnId);
      if (!col) throw new Error('Footer column not found');
      const newChild = { ...node, children: node.children ?? [] } as BlueprintNode;
      footer.children.push(newChild);
      const clamped = typeof index === 'number' ? Math.max(0, Math.min(index, col.content.length)) : col.content.length;
      col.content.splice(clamped, 0, newChild.id);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REORDER_FOOTER_COLUMN': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { footerId, columnId, from, to } = action;
      const path = selectPath(snapshot.root, footerId);
      if (!path) throw new Error(`Footer not found: ${footerId}`);
      let footer: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!footer.children) throw new Error('Children missing');
        footer = footer.children[childIndex];
      }
      const cols = ((footer as any).columns ?? []) as Array<{ id: string; content: string[] }>;
      const col = cols.find((c) => c.id === columnId);
      if (!col) throw new Error('Footer column not found');
      if (from < 0 || from >= col.content.length || to < 0 || to >= col.content.length) throw new Error('Invalid reorder indices');
      const [moved] = col.content.splice(from, 1);
      col.content.splice(to, 0, moved);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    case 'REMOVE_FROM_FOOTER_COLUMN': {
      const snapshot = deepClone(history.present);
      validateTree(snapshot);
      const { footerId, columnId, nodeId } = action;
      const path = selectPath(snapshot.root, footerId);
      if (!path) throw new Error(`Footer not found: ${footerId}`);
      let footer: BlueprintNode = snapshot.root;
      for (let i = 1; i < path.idPath.length; i += 1) {
        const childIndex = path.indexPath[i - 1];
        if (!footer.children) throw new Error('Children missing');
        footer = footer.children[childIndex];
      }
      const cols = ((footer as any).columns ?? []) as Array<{ id: string; content: string[] }>;
      const col = cols.find((c) => c.id === columnId);
      if (!col) throw new Error('Footer column not found');
      const idx = col.content.indexOf(nodeId);
      if (idx !== -1) col.content.splice(idx, 1);
      const cidx = footer.children.findIndex((n) => n.id === nodeId);
      if (cidx !== -1) footer.children.splice(cidx, 1);
      validateTree(snapshot);
      return withHistoryCommit(history, snapshot);
    }
    default:
      return history;
  }
}

export function reducer(history: HistoryState, action: BlueprintAction): HistoryState {
  if (process.env.NODE_ENV !== 'production') {
    validateTree(history.present);
    if (action.type === 'ADD_COMPONENT') validateNode(action.node);
  }
  const next = coreReducer(history, action);
  if (process.env.NODE_ENV !== 'production') {
    validateTree(next.present);
  }
  return next;
}

export function usePageBlueprintStore() {
  const initialSnapshot: BlueprintStateSnapshot = useMemo(() => ({ root: createInitialSkeleton() }), []);
  const initialHistory: HistoryState = useMemo(
    () => ({ past: [], present: initialSnapshot, future: [] }),
    [initialSnapshot],
  );

  const [state, dispatch] = useReducer(reducer, initialHistory);

  const addComponent = useCallback(
    (parentId: string, indexOrNode: number | BlueprintNode, maybeNode?: BlueprintNode) => {
      if (typeof indexOrNode === 'number') {
        if (!maybeNode) throw new Error('addComponent requires a node when index is provided');
        dispatch({ type: 'ADD_COMPONENT', parentId, index: indexOrNode, node: maybeNode });
      } else {
        dispatch({ type: 'ADD_COMPONENT', parentId, node: indexOrNode });
      }
    },
    [],
  );
  const updateData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_DATA', nodeId, data });
  }, []);
  const updateStyles = useCallback((nodeId: string, styles: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_STYLES', nodeId, styles });
  }, []);
  const reorder = useCallback((parentId: string, from: number, to: number) => {
    dispatch({ type: 'REORDER', parentId, from, to });
  }, []);
  const wrapInContainer = useCallback((nodeId: string) => {
    dispatch({ type: 'WRAP_IN_CONTAINER', nodeId, containerType: 'container' });
  }, []);
  const moveNode = useCallback((fromParentId: string, fromIndex: number, toParentId: string, toIndex: number) => {
    dispatch({ type: 'MOVE_NODE', fromParentId, fromIndex, toParentId, toIndex });
  }, []);
  const wrapAndMove = useCallback((targetId: string, draggingId: string, toIndex?: number) => {
    dispatch({ type: 'WRAP_AND_MOVE', targetId, draggingId, containerType: 'container', toIndex });
  }, []);
  const remove = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE', nodeId });
  }, []);
  const hydrate = useCallback((snapshot: BlueprintStateSnapshot) => {
    dispatch({ type: 'HYDRATE', snapshot });
  }, []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  return {
    state,
    addComponent,
    updateData,
    updateStyles,
    reorder,
    wrapInContainer,
    moveNode,
    wrapAndMove,
    remove,
    hydrate,
    undo,
    redo,
  } as const;
}

export function createInitialHistory(): HistoryState {
  const present: BlueprintStateSnapshot = { root: createInitialSkeleton() };
  return { past: [], present, future: [] };
}
