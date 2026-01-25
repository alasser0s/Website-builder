import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import type { BlueprintNode, BlueprintStateSnapshot, ParagraphNodeData } from '../../foundation/types';
import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';

function renderParagraph(data: Partial<ParagraphNodeData>, styles?: Record<string, unknown>): string {
  const paragraphNode: BlueprintNode = {
    id: 'paragraph_spec',
    type: 'paragraph',
    data: {
      text: 'Fallback text',
      ...data,
    },
    styles: styles as any,
    children: [],
  } as any;

  const root: BlueprintNode = {
    id: 'page_root',
    type: 'page',
    children: [paragraphNode],
  } as any;

  const snapshot: BlueprintStateSnapshot = { root };

  return renderToString(
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={paragraphNode.id} />
    </BlueprintProvider>,
  );
}

describe('Paragraph component acceptance', () => {
  it('renders multiple paragraphs from double newlines', () => {
    const text = 'First block.\n\nSecond block with\nline break.';
    const html = renderParagraph({ text });
    expect(html).toContain('data-paragraph-count="2"');
    expect(html).toContain('data-paragraph-index="0"');
    expect(html).toContain('data-paragraph-index="1"');
    expect(html).toMatch(/Second block with<br\s*\/>line break/);
  });

  it('ensures long words wrap safely', () => {
    const longWord = 'Supercalifragilisticexpialidocious'.repeat(8);
    const html = renderParagraph({ text: longWord });
    expect(html).toContain('word-break:break-word');
    expect(html).toContain('overflow-wrap:break-word');
  });

  it('supports style tokens for max-width and responsive overrides', () => {
    const html = renderParagraph(
      { text: 'Responsive copy' },
      { maxWidth: 'lg', lineHeight: 'relaxed', m: 4, text: 'muted', sm: { maxWidth: '2xl' } },
    );
    expect(html).toContain('max-w-lg');
    expect(html).toContain('sm:max-w-2xl');
    expect(html).toContain('leading-relaxed');
    expect(html).toContain('m-4');
    expect(html).toContain('text-muted');
  });
});
