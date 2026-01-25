import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { BlueprintProvider, Renderer } from '../../foundation/renderer/Renderer';
import type {
  BlueprintNode,
  BlueprintStateSnapshot,
  InputNodeData,
  TextareaNodeData,
  SelectNodeData,
} from '../../foundation/types';

function renderField(node: BlueprintNode): string {
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

describe('Form field components acceptance', () => {
  it('renders inputs with a11y label, focus ring, and required indicator', () => {
    const data: InputNodeData = {
      label: 'Work Email',
      placeholder: 'name@example.com',
      required: true,
      type: 'email',
    };

    const node: BlueprintNode = {
      id: 'input_node',
      type: 'input',
      children: [],
      data,
    } as BlueprintNode;

    const html = renderField(node);

    expect(html).toContain('data-field-kind="input"');
    expect(html).toContain('data-field-required="true"');
    expect(html).toContain('for="input_node-control"');
    expect(html).toContain('id="input_node-control"');
    expect(html).toContain('type="email"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('form-field-required text-primary">*');

    const labelIndex = html.indexOf('<label');
    const inputIndex = html.indexOf('<input');
    expect(labelIndex).toBeGreaterThan(-1);
    expect(inputIndex).toBeGreaterThan(labelIndex);
  });

  it('renders textarea safely when optional data is missing', () => {
    const data: TextareaNodeData = {
      label: 'Message',
    };

    const node: BlueprintNode = {
      id: 'textarea_node',
      type: 'textarea',
      children: [],
      data,
    } as BlueprintNode;

    const html = renderField(node);

    expect(html).toContain('data-field-kind="textarea"');
    expect(html).not.toContain('form-field-required');
    expect(html).toContain('rows="4"');
    expect(html).toContain('for="textarea_node-control"');
    expect(html).toContain('focus-visible:ring-2');
  });

  it('renders select options with required state and focus styles', () => {
    const data: SelectNodeData = {
      label: 'Country',
      required: true,
      options: [
        { label: 'USA', value: 'us' },
        { label: 'Canada', value: 'ca' },
        { label: '', value: '' },
      ],
    };

    const node: BlueprintNode = {
      id: 'select_node',
      type: 'select',
      children: [],
      data,
    } as BlueprintNode;

    const html = renderField(node);

    expect(html).toContain('data-field-kind="select"');
    expect(html).toContain('data-field-required="true"');
    expect(html).toContain('for="select_node-control"');
    expect(html).toMatch(/<option[^>]+value="us"[^>]*>USA<\/option>/);
    expect(html).toMatch(/<option[^>]+value="ca"[^>]*>Canada<\/option>/);
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('option-3');
  });
});
