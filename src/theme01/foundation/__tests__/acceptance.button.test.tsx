import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';
import type { BlueprintNode, BlueprintStateSnapshot, ButtonNodeData } from '../../foundation/types';

function renderButton(data: ButtonNodeData, styles?: Record<string, unknown>): string {
  const node: BlueprintNode = {
    id: 'button_node',
    type: 'button',
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

describe('Button component acceptance', () => {
  it('renders route buttons with link markup', () => {
    const html = renderButton({ label: 'Go About', href: { kind: 'route', slug: 'about' } });
    expect(html).toContain('data-button-kind="route"');
    expect(html).toContain('href="/about"');
  });

  it('renders external buttons opening new tab', () => {
    const html = renderButton({ label: 'Docs', href: { kind: 'url', href: 'https://example.com/docs', newTab: true } });
    expect(html).toContain('data-button-kind="url"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
