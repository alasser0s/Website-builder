import { describe, it, expect } from 'vitest';
import { createInitialHistory, reducer } from '../../foundation/store';
import { validateTree } from '../../foundation/validators';
import { generateNodeId } from '../../foundation/id';

function randomInt(n: number) {
  return Math.floor(Math.random() * n);
}

describe('Fuzz: random sequences maintain valid tree', () => {
  it('200 random ops preserve validity', () => {
    let history = createInitialHistory();
    for (let i = 0; i < 200; i += 1) {
      // collect all nodes with their parent ids
      const nodes: { id: string; parentId?: string }[] = [];
      const walk = (node: any, parentId?: string) => {
        nodes.push({ id: node.id, parentId });
        node.children?.forEach((c: any) => walk(c, node.id));
      };
      walk(history.present.root);

      const op = randomInt(5);
      if (op === 0) {
        // add under a random parent
        const parent = nodes[randomInt(nodes.length)]!.id;
        const node = { id: generateNodeId('component'), type: 'component', children: [] as any[] } as const;
        try {
          history = reducer(history, { type: 'ADD_COMPONENT', parentId: parent, node });
        } catch {}
      } else if (op === 1) {
        // update data of a random node (avoid root sometimes)
        const target = nodes[randomInt(nodes.length)]!.id;
        try {
          history = reducer(history, { type: 'UPDATE_DATA', nodeId: target, data: { rnd: Math.random() } });
        } catch {}
      } else if (op === 2) {
        // wrap random non-root node
        const candidates = nodes.filter((n) => n.parentId);
        if (candidates.length) {
          const target = candidates[randomInt(candidates.length)]!.id;
          try {
            history = reducer(history, { type: 'WRAP_IN_CONTAINER', nodeId: target, containerType: 'container' });
          } catch {}
        }
      } else if (op === 3) {
        // remove random non-root node
        const candidates = nodes.filter((n) => n.parentId);
        if (candidates.length) {
          const target = candidates[randomInt(candidates.length)]!.id;
          try {
            history = reducer(history, { type: 'REMOVE', nodeId: target });
          } catch {}
        }
      } else if (op === 4) {
        // reorder within random parent with >=2 children
        const parents: any[] = [];
        const collectParents = (node: any) => {
          if (node.children?.length >= 2) parents.push(node);
          node.children?.forEach(collectParents);
        };
        collectParents(history.present.root);
        if (parents.length) {
          const parent = parents[randomInt(parents.length)];
          const from = randomInt(parent.children.length);
          let to = randomInt(parent.children.length);
          if (to === from) to = (to + 1) % parent.children.length;
          try {
            history = reducer(history, { type: 'REORDER', parentId: parent.id, from, to });
          } catch {}
        }
      }
      validateTree(history.present);
    }
  });
});


