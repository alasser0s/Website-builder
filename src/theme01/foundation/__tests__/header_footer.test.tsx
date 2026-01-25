import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createInitialHistory, reducer } from '../../foundation/store';
import type { BlueprintNode, NodeType } from '../../foundation/types';
import { validateTree } from '../../foundation/validators';
import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';

const CT: NodeType = 'component';

function leaf(id: string): BlueprintNode {
  return { id, type: CT, children: [] } as any;
}

function renderNode(root: BlueprintNode, nodeId?: string): string {
  return renderToString(
    <BlueprintProvider snapshot={{ root }}>
      <Renderer nodeId={nodeId ?? root.id} />
    </BlueprintProvider>,
  );
}

describe('Header/Footer — slots & columns DnD', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('Header: slots (logo/right single) + navItems DnD + wrapInContainer references', () => {
    let history = createInitialHistory();
    const root = history.present.root;
    const headerId = root.children[0]!.id; // skeleton: header at index 0

    const l1 = leaf('logo-1');
    const r1 = leaf('right-1');

    history = reducer(history, { type: 'ADD_TO_HEADER_SLOT', headerId, slot: 'logo', node: l1 });
    history = reducer(history, { type: 'ADD_TO_HEADER_SLOT', headerId, slot: 'right', node: r1 });

    // navItems: add + reorder + update + remove
    history = reducer(history, { type: 'ADD_NAV_ITEM', headerId, item: { id: 'i1', label: 'Home', kind: 'route', slug: 'home' } } as any);
    history = reducer(history, { type: 'ADD_NAV_ITEM', headerId, item: { id: 'i2', label: 'Blog', kind: 'route', slug: 'blog' } } as any);
    history = reducer(history, { type: 'ADD_NAV_ITEM', headerId, item: { id: 'i3', label: 'Docs', kind: 'route', slug: 'docs' } } as any);
    history = reducer(history, { type: 'REORDER_NAV_ITEMS', headerId, from: 2, to: 0 } as any);
    history = reducer(history, { type: 'UPDATE_NAV_ITEM', headerId, itemId: 'i2', patch: { label: 'Articles' } } as any);
    history = reducer(history, { type: 'REMOVE_NAV_ITEM', headerId, itemId: 'i1' } as any);

    // wrap logo in container to ensure refs update
    const firstLogoId = (history.present.root.children[0] as any).slots.logo[0] as string;
    history = reducer(history, { type: 'WRAP_IN_CONTAINER', nodeId: firstLogoId, containerType: 'container' } as any);
    // remove right slot content
    const rightId = (history.present.root.children[0] as any).slots.right[0] as string;
    history = reducer(history, { type: 'REMOVE_FROM_HEADER_SLOT', headerId, slot: 'right', nodeId: rightId } as any);

    validateTree(history.present);

    const html = renderNode(history.present.root, headerId);
    expect(html.includes('data-slot="logo"')).toBe(true);
    expect(html.includes('data-slot="right"')).toBe(true);
    // nav items rendered from data
    expect(html.includes('data-nav-item-id="i2"')).toBe(true);
  });

  it('Footer: columns add/reorder/remove and content DnD', () => {
    let history = createInitialHistory();
    const root = history.present.root;
    const footerId = root.children[2]!.id; // skeleton: footer at index 2

    history = reducer(history, { type: 'ADD_FOOTER_COLUMN', footerId });
    history = reducer(history, { type: 'ADD_FOOTER_COLUMN', footerId });
    history = reducer(history, { type: 'ADD_FOOTER_COLUMN', footerId });

    const footer = history.present.root.children[2] as any;
    const [c1, c2, c3] = footer.columns as Array<{ id: string; content: string[] }>;

    const a = leaf('f-a');
    const b = leaf('f-b');
    const c = leaf('f-c');

    history = reducer(history, { type: 'ADD_TO_FOOTER_COLUMN', footerId, columnId: c1.id, node: a });
    history = reducer(history, { type: 'ADD_TO_FOOTER_COLUMN', footerId, columnId: c1.id, node: b });
    history = reducer(history, { type: 'ADD_TO_FOOTER_COLUMN', footerId, columnId: c2.id, node: c });

    history = reducer(history, { type: 'REORDER_FOOTER_COLUMN', footerId, columnId: c1.id, from: 0, to: 1 });
    history = reducer(history, { type: 'REMOVE_FROM_FOOTER_COLUMN', footerId, columnId: c1.id, nodeId: b.id });

    // remove c3 column
    history = reducer(history, { type: 'REMOVE_FOOTER_COLUMN', footerId, columnId: c3.id });

    validateTree(history.present);

    const html = renderNode(history.present.root, footerId);
    expect(html.includes('data-footer-col-id=')).toBe(true);
  });

  it('Footer: renders nav via NavBar from data.navItems (no hard-coded links)', () => {
    let history = createInitialHistory();
    const root = history.present.root;
    const footerId = root.children[2]!.id; // skeleton: footer at index 2

    // Add two nav items into footer data
    const footerNode = root.children[2] as any;
    footerNode.data = { ...(footerNode.data ?? {}), navItems: [
      { id: 'f1', label: 'About', kind: 'route', slug: 'about' },
      { id: 'f2', label: 'Contact', kind: 'url', href: 'https://example.com/contact', newTab: true },
    ] };

    // Validate and render
    validateTree(history.present);
    const html = renderNode(history.present.root, footerId);
    expect(html.includes('data-role="navbar"')).toBe(true);
    expect(html.includes('data-nav-item-id="f1"')).toBe(true);
    expect(html.includes('data-nav-item-id="f2"')).toBe(true);
  });
});


