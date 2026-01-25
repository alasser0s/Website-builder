import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';
import type { BlueprintNode, BlueprintStateSnapshot, BadgeNodeData } from '../../foundation/types';

function renderBadge(data: BadgeNodeData, styles?: Record<string, unknown>): string {
  const node: BlueprintNode = {
    id: 'badge_node',
    type: 'badge',
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

describe('Badge component acceptance', () => {
  it('renders text and variant class', () => {
    const html = renderBadge({ text: 'New', variant: 'outline' });
    expect(html).toContain('data-badge-variant="outline"');
    expect(html).toContain('New');
  });

  it('applies custom styles', () => {
    const html = renderBadge({ text: 'Sale' }, { maxWidth: 'xs', text: 'primary' });
    expect(html).toContain('max-w-xs');
    expect(html).toContain('text-primary');
  });
});
