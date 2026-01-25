import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';
import type { BlueprintNode, BlueprintStateSnapshot, CardNodeData } from '../../foundation/types';

function renderCard(data: CardNodeData, styles?: Record<string, unknown>): string {
  const node: BlueprintNode = {
    id: 'card_node',
    type: 'card',
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

describe('Card component acceptance', () => {
  it('renders media, title, body, and actions', () => {
    const html = renderCard({
      title: 'Card Title',
      body: 'Card body copy.',
      media: { src: 'https://example.com/hero.jpg', alt: 'Hero' },
      actions: [
        { label: 'Primary', href: { kind: 'route', slug: 'primary' } },
        { label: 'External', href: { kind: 'url', href: 'https://example.com' } },
      ],
    });
    expect(html).toContain('data-card-section="media"');
    expect(html).toContain('Card Title');
    expect(html).toContain('Card body copy.');
    expect(html).toContain('data-card-action-kind="route"');
    expect(html).toContain('data-card-action-kind="url"');
  });

  it('renders minimal card without optional fields', () => {
    const html = renderCard({ body: 'Only body text.' });
    expect(html).toContain('Only body text.');
  });
});
