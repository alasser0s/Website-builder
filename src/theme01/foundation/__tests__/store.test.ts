import { describe, it, expect } from 'vitest';
import { createInitialHistory, reducer } from '../../foundation/store';
import { validateTree } from '../../foundation/validators';
import { generateNodeId } from '../../foundation/id';
import type { BlueprintNode, NodeType } from '../../foundation/types';
const componentType: NodeType = 'component';

describe('Theme01 Foundation store', () => {
  it('initializes with page root and history present', () => {
    const history = createInitialHistory();
    expect(history.present.root.type).toBe('page');
    validateTree(history.present);
  });

  it('addComponent adds a child and validates', () => {
    let history = createInitialHistory();
    const sectionId = history.present.root.children?.[1]?.id!;
    const child: BlueprintNode = { id: generateNodeId('component'), type: componentType, data: { t: 1 }, children: [] };
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: child });
    const section = history.present.root.children?.[1]!;
    expect(section.children?.some((n) => n.id === child.id)).toBe(true);
    validateTree(history.present);
  });

  it('throws when adding node missing id or type (dev guard)', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const history = createInitialHistory();
    const sectionId = history.present.root.children?.[1]?.id!;
    // missing id
    expect(() =>
      reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: { type: 'component', children: [] } as any }),
    ).toThrow();
    // missing type
    expect(() =>
      reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: { id: 'x', children: [] } as any }),
    ).toThrow();
    process.env.NODE_ENV = prevEnv;
  });

  it('header navItems add/update/remove/reorder works and maintains ids', () => {
    let history = createInitialHistory();
    const headerId = history.present.root.children?.[0]?.id!;
    history = reducer(history, { type: 'ADD_NAV_ITEM', headerId, item: { id: 'a', label: 'A', kind: 'route', slug: 'a' } } as any);
    history = reducer(history, { type: 'ADD_NAV_ITEM', headerId, item: { id: 'b', label: 'B', kind: 'route', slug: 'b' } } as any);
    history = reducer(history, { type: 'ADD_NAV_ITEM', headerId, item: { id: 'c', label: 'C', kind: 'route', slug: 'c' } } as any);
    history = reducer(history, { type: 'REORDER_NAV_ITEMS', headerId, from: 2, to: 0 } as any);
    history = reducer(history, { type: 'UPDATE_NAV_ITEM', headerId, itemId: 'b', patch: { slug: 'b-updated' } } as any);
    history = reducer(history, { type: 'REMOVE_NAV_ITEM', headerId, itemId: 'a' } as any);
    const header = history.present.root.children?.[0] as any;
    const navItems = header.data.navItems as Array<any>;
    expect(navItems.length).toBe(2);
    expect(navItems[0].id).toBe('c');
    expect(navItems[1].id).toBe('b');
    expect(navItems[1].slug).toBe('b-updated');
  });

  it('pre/post validateTree dev hook runs around every action', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    let history = createInitialHistory();
    // A valid flow should not throw due to pre/post hooks
    const sectionId = history.present.root.children?.[1]?.id!;
    const child: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    expect(() => {
      history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: child });
      history = reducer(history, { type: 'UPDATE_DATA', nodeId: child.id, data: { z: 1 } });
      history = reducer(history, { type: 'UPDATE_STYLES', nodeId: child.id, styles: { color: 'blue' } });
    }).not.toThrow();
    process.env.NODE_ENV = prevEnv;
  });

  it('updateData and updateStyles only touch targeted node', () => {
    let history = createInitialHistory();
    const sectionId = history.present.root.children?.[1]?.id!;
    const child: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: child });
    history = reducer(history, { type: 'UPDATE_DATA', nodeId: child.id, data: { a: 1 } });
    history = reducer(history, { type: 'UPDATE_STYLES', nodeId: child.id, styles: { color: 'red' } });
    const node = history.present.root.children?.[1]?.children?.find((n) => n.id === child.id)!;
    expect(node.data?.a).toBe(1);
    expect(node.styles?.color).toBe('red');
    validateTree(history.present);
  });

  it('reorder keeps ids and changes order', () => {
    let history = createInitialHistory();
    const sectionId = history.present.root.children?.[1]?.id!;
    const a: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    const b: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    const c: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: a });
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: b });
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: c });
    const beforeIds = history.present.root.children?.[1]?.children?.map((n) => n.id) ?? [];
    history = reducer(history, { type: 'REORDER', parentId: sectionId, from: 0, to: 2 });
    const afterIds = history.present.root.children?.[1]?.children?.map((n) => n.id) ?? [];
    expect(new Set(beforeIds)).toEqual(new Set(afterIds));
    expect(afterIds[2]).toBe(beforeIds[0]);
    validateTree(history.present);
  });

  it('wrapInContainer nests a node under new container', () => {
    let history = createInitialHistory();
    const sectionId = history.present.root.children?.[1]?.id!;
    const child: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: child });
    history = reducer(history, { type: 'WRAP_IN_CONTAINER', nodeId: child.id, containerType: 'container' });
    const section = history.present.root.children?.[1]!;
    const container = section.children?.find((n) => n.children?.[0]?.id === child.id)!;
    expect(container.type).toBe('container');
    validateTree(history.present);
  });

  it('remove deletes node subtree with no orphans', () => {
    let history = createInitialHistory();
    const sectionId = history.present.root.children?.[1]?.id!;
    const child: BlueprintNode = { id: generateNodeId('component'), type: componentType, children: [] };
    history = reducer(history, { type: 'ADD_COMPONENT', parentId: sectionId, node: child });
    history = reducer(history, { type: 'REMOVE', nodeId: child.id });
    const section = history.present.root.children?.[1]!;
    expect(section.children?.some((n) => n.id === child.id)).toBeFalsy();
    validateTree(history.present);
  });
});


