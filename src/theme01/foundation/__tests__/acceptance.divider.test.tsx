import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';
import type { BlueprintNode, BlueprintStateSnapshot, DividerNodeData } from '../../foundation/types';

function renderDivider(data: DividerNodeData, styles?: Record<string, unknown>): string {
  const node: BlueprintNode = {
    id: 'divider_node',
    type: 'divider',
    children: [],
    data,
    styles: styles as any,
  } as any;

  const snapshot: BlueprintStateSnapshot = {
    root: {
      id: 'page_root',
      type: 'page',
      children: [node],
    } as any,
  };

  return renderToString(
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={node.id} />
    </BlueprintProvider>,
  );
}

describe('Divider component acceptance', () => {
  it('renders horizontal divider occupying width', () => {
    const html = renderDivider({ orientation: 'horizontal' });
    expect(html).toContain('data-divider-orientation="horizontal"');
    expect(html).toContain('divider-horizontal w-full');
  });

  it('renders vertical divider with custom thickness and color', () => {
    const html = renderDivider(
      { orientation: 'vertical' },
      { thickness: 4, bg: 'primary', height: '50%' },
    );
    expect(html).toContain('data-divider-orientation="vertical"');
    expect(html).toContain('width:4px');
  });
});
