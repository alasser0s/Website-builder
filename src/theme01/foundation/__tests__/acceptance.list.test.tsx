import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import type { BlueprintNode, BlueprintStateSnapshot, ListNodeData } from '../../foundation/types';
import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';

function renderList(data: Partial<ListNodeData>, styles?: Record<string, unknown>): string {
  const listNode: BlueprintNode = {
    id: 'list_spec',
    type: 'list',
    data: {
      items: ['Fallback item'],
      ordered: false,
      ...data,
    },
    styles: styles as any,
    children: [],
  } as any;

  const root: BlueprintNode = {
    id: 'page_root',
    type: 'page',
    children: [listNode],
  } as any;

  const snapshot: BlueprintStateSnapshot = { root };

  return renderToString(
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={listNode.id} />
    </BlueprintProvider>,
  );
}

describe('List component acceptance', () => {
  it('renders unordered lists with item structure', () => {
    const html = renderList({ items: ['Alpha', 'Beta'] });
    expect(html).toContain('<ul');
    expect(html).toContain('data-list-ordered="false"');
    expect(html).toContain('list-disc');
    expect(html).toContain('data-list-index="0"');
    expect(html).toContain('data-list-index="1"');
  });

  it('renders ordered lists and preserves line breaks within items', () => {
    const html = renderList({ ordered: true, items: ['First line\nSecond line', 'Third'] });
    expect(html).toContain('<ol');
    expect(html).toContain('data-list-ordered="true"');
    expect(html).toMatch(/First line<br\s*\/>Second line/);
  });

  it('applies style controls for list style, indent, and item gap (with responsive overrides)', () => {
    const html = renderList(
      { items: ['Styled item one', 'Styled item two'] },
      { listStyle: 'none', indent: 8, itemGap: 4, sm: { indent: 12 } },
    );
    expect(html).toContain('list-none');
    expect(html).toContain('pl-8');
    expect(html).toContain('space-y-4');
    expect(html).toContain('sm:pl-12');
  });
});
