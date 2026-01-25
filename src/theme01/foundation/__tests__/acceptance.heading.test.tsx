import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import type { BlueprintNode, BlueprintStateSnapshot, HeadingNodeData } from '../../foundation/types';
import { BlueprintProvider, Renderer, HEADING_TEXT_MAX_LENGTH } from '../../foundation/renderer/Renderer';
import { theme01Tokens } from '../../styles/tokens';

function renderHeading(data: Partial<HeadingNodeData>, styles?: Record<string, unknown>): string {
  const headingNode: BlueprintNode = {
    id: 'heading_spec',
    type: 'heading',
    data: {
      text: 'Sample heading',
      level: 2,
      align: 'start',
      ...data,
    },
    styles: styles as any,
    children: [],
  } as any;

  const root: BlueprintNode = {
    id: 'page_root',
    type: 'page',
    children: [headingNode],
  } as any;

  const snapshot: BlueprintStateSnapshot = { root };

  return renderToString(
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={headingNode.id} />
    </BlueprintProvider>,
  );
}

describe('Heading component acceptance', () => {
  it('maps level to font scale tokens', () => {
    const html = renderHeading({ text: 'Hero', level: 1 });
    const expectedClass = theme01Tokens.fontSize['3xl'] ?? 'text-3xl';
    expect(html).toContain(expectedClass);
    expect(html).toContain('data-heading-level="1"');
  });

  it('applies alignment classes when provided', () => {
    const html = renderHeading({ text: 'Centered copy', level: 3, align: 'center' });
    expect(html).toContain('text-center');
    expect(html).toContain('data-heading-align="center"');
  });

  it('clamps overly long text while keeping wrapping styles', () => {
    const long = 'H'.repeat(HEADING_TEXT_MAX_LENGTH + 42);
    const html = renderHeading({ text: long, level: 3 });
    const expected = `${long.slice(0, HEADING_TEXT_MAX_LENGTH - 1).trimEnd()}…`;
    expect(html).toContain(expected);
    expect(html).not.toContain(long);
    expect(html).toContain('word-break:break-word');
    expect(html).toContain('overflow-wrap:break-word');
    expect(html).toMatch(/-webkit-line-clamp:4/);
  });

  it('respects style controls including responsive letter spacing', () => {
    const html = renderHeading(
      { text: 'Styled', level: 4 },
      { letterSpacing: 'wide', sm: { letterSpacing: 'tight' } },
    );
    expect(html).toContain('tracking-wide');
    expect(html).toContain('sm:tracking-tight');
  });
});
