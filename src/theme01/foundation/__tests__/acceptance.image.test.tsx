import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import type { BlueprintNode, BlueprintStateSnapshot, ImageNodeData } from '../../foundation/types';
import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';

function renderImage(data: Partial<ImageNodeData>, styles?: Record<string, unknown>): string {
  const imageNode: BlueprintNode = {
    id: 'image_spec',
    type: 'image',
    data: {
      src: 'https://example.com/placeholder.png',
      alt: 'Placeholder',
      ...data,
    },
    styles: styles as any,
    children: [],
  } as any;

  const root: BlueprintNode = {
    id: 'page_root',
    type: 'page',
    children: [imageNode],
  } as any;

  const snapshot: BlueprintStateSnapshot = { root };

  return renderToString(
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={imageNode.id} />
    </BlueprintProvider>,
  );
}

describe('Image component acceptance', () => {
  it('renders fallback placeholder when src is missing', () => {
    const html = renderImage({ src: '', alt: 'Missing artwork' });
    expect(html).toContain('data-image-fallback="true"');
    expect(html).toContain('Missing artwork');
  });

  it('renders img element with lazy loading and alt text', () => {
    const html = renderImage({ src: 'https://example.com/hero.png', alt: 'Hero shot', objectFit: 'contain', aspect: '16:9' });
    expect(html).toContain('data-image-element="true"');
    expect(html).toContain('alt="Hero shot"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-image-status="loading"');
  });
});
