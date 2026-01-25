import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { BlueprintNode, BlueprintStateSnapshot } from '../../foundation/types';
import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';

function renderSnapshot(root: BlueprintNode, startId?: string): string {
  const snapshot: BlueprintStateSnapshot = { root };
  return renderToString(
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={startId ?? root.id} />
    </BlueprintProvider>,
  );
}

describe('Renderer — recursion registry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('يرسم شجرة متداخلة (3+ مستويات) بترتيب حتمي ومفاتيح ثابتة', () => {
    const c1: BlueprintNode = { id: 'c1', type: 'component', children: [] } as any;
    const c2: BlueprintNode = { id: 'c2', type: 'component', children: [] } as any;
    const c3: BlueprintNode = { id: 'c3', type: 'component', children: [] } as any;

    const col1: BlueprintNode = { id: 'col1', type: 'column', children: [c1], content: ['c1'] } as any;
    const col2: BlueprintNode = { id: 'col2', type: 'column', children: [c2], content: ['c2'] } as any;
    const col3: BlueprintNode = { id: 'col3', type: 'column', children: [c3], content: ['c3'] } as any;
    const row: BlueprintNode = {
      id: 'row1',
      type: 'row',
      children: [col1, col2, col3],
      columns: [
        { span: 4, offset: 0, content: ['col1'] },
        { span: 4, offset: 0, content: ['col2'] },
        { span: 4, offset: 0, content: ['col3'] },
      ],
    } as any;
    const container: BlueprintNode = { id: 'cont', type: 'container', children: [row], content: ['row1'] } as any;
    const section: BlueprintNode = { id: 'sec', type: 'section', children: [container], content: ['cont'] } as any;
    const page: BlueprintNode = { id: 'page', type: 'page', children: [section] } as any;

    const html = renderSnapshot(page);

    const order = ['page', 'sec', 'cont', 'row1', 'col1', 'c1', 'col2', 'c2', 'col3', 'c3'];
    let lastIndex = -1;
    for (const id of order) {
      const idx = html.indexOf(`data-node-id="${id}"`);
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it('يعرض Unknown للنوع غير المعروف بدون رمي استثناء', () => {
    const unknown: BlueprintNode = { id: 'u1', type: 'widget' as any, children: [] } as any;
    const page: BlueprintNode = { id: 'p2', type: 'page', children: [unknown] } as any;
    const html = renderSnapshot(page);
    expect(html.includes('Unknown type: widget (id: u1)')).toBe(true);
  });

  it('يعرض صندوق مفقود عند تمرير nodeId غير موجود', () => {
    const page: BlueprintNode = { id: 'p3', type: 'page', children: [] } as any;
    const html = renderSnapshot(page, 'missing-id');
    expect(html.includes('Unknown id="missing-id"')).toBe(true);
  });

  it('Header: يعرض logo/right من السلوّتس وnavItems من data', () => {
    const logo: BlueprintNode = { id: 'lg', type: 'component', children: [] } as any;
    const right: BlueprintNode = { id: 'rt', type: 'component', children: [] } as any;
    const header: BlueprintNode = {
      id: 'hdr',
      type: 'header',
      children: [logo, right],
      slots: { logo: ['lg'], right: ['rt'] },
      data: { navItems: [{ id: 'n1', label: 'Home', kind: 'route', slug: 'home' }, { id: 'n2', label: 'Docs', kind: 'route', slug: 'docs' }] },
    } as any;
    const page: BlueprintNode = { id: 'p4', type: 'page', children: [header] } as any;
    const html = renderSnapshot(page, 'hdr');
    expect(html.includes('data-slot="logo"')).toBe(true);
    expect(html.includes('data-slot="right"')).toBe(true);
    expect(html.includes('data-nav-item-id="n1"')).toBe(true);
    expect(html.includes('data-nav-item-id="n2"')).toBe(true);
  });
});


