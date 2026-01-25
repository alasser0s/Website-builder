import { describe, it, expect } from 'vitest';
import { validateNode, validateTree } from '../../foundation/validators';
import type { BlueprintNode } from '../../foundation/types';

describe('validators', () => {
  it('throws on invalid root type', () => {
    expect(() => validateNode({ id: 'x', type: 'section', children: [] } as any, true)).toThrow();
  });
  it('validates button nodes require label and valid href', () => {
    const valid: BlueprintNode = {
      id: 'page_button_valid',
      type: 'page',
      children: [
        { id: 'button_ok', type: 'button', children: [], data: { label: 'Click me', href: { kind: 'route', slug: 'home' }, size: 'md', variant: 'solid' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_button_invalid',
      type: 'page',
      children: [
        { id: 'button_bad', type: 'button', children: [], data: { label: '', href: { kind: 'route', slug: 5 as any }, size: 'xl' as any, variant: 'flat' as any } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });

  it('validates minimal node', () => {
    expect(() => validateNode({ id: 'x', type: 'container', children: [] })).not.toThrow();
  });
  it('validateTree enforces unique ids', () => {
    expect(() =>
      validateTree({
        root: {
          id: 'page_root',
          type: 'page',
          children: [
            { id: 'dup', type: 'section', children: [] },
            { id: 'dup', type: 'footer', children: [] },
          ],
        },
      }),
    ).toThrow();
  });

  it('fails when header slots missing arrays', () => {
    const invalid: BlueprintNode = {
      id: 'p',
      type: 'page',
      children: [
        { id: 'h', type: 'header', children: [], slots: { logo: 'x' as any, right: [] } as any } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });

  it('fails when footer column references unknown id', () => {
    const invalid: BlueprintNode = {
      id: 'p',
      type: 'page',
      children: [
        { id: 'f', type: 'footer', children: [], columns: [{ id: 'c1', content: ['missing'] }] } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });

  it('fails when header has orphan child not referenced in slots', () => {
    const invalid: BlueprintNode = {
      id: 'p',
      type: 'page',
      children: [
        {
          id: 'h',
          type: 'header',
          children: [{ id: 'x', type: 'component', children: [] } as any],
          slots: { logo: [], right: [] },
        } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });

  it('validates heading nodes require data', () => {
    const valid: BlueprintNode = {
      id: 'page_heading_valid',
      type: 'page',
      children: [
        { id: 'heading_ok', type: 'heading', children: [], data: { text: 'Title', level: 2 } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_heading_invalid',
      type: 'page',
      children: [
        { id: 'heading_bad', type: 'heading', children: [], data: { text: '', level: 9, align: 'middle' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });

  it('validates paragraph nodes require text', () => {
    const valid: BlueprintNode = {
      id: 'page_paragraph_valid',
      type: 'page',
      children: [
        { id: 'paragraph_ok', type: 'paragraph', children: [], data: { text: 'Body copy' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_paragraph_invalid',
      type: 'page',
      children: [
        { id: 'paragraph_bad', type: 'paragraph', children: [], data: { text: '   ' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });

  it('validates list nodes require non-empty items', () => {
    const valid: BlueprintNode = {
      id: 'page_list_valid',
      type: 'page',
      children: [
        { id: 'list_ok', type: 'list', children: [], data: { items: ['One', 'Two'], ordered: true } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_list_invalid',
      type: 'page',
      children: [
        { id: 'list_bad', type: 'list', children: [], data: { items: ['   ', 5] as any } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });
  it('validates image nodes require src and alt', () => {
    const valid: BlueprintNode = {
      id: 'page_image_valid',
      type: 'page',
      children: [
        { id: 'image_ok', type: 'image', children: [], data: { src: 'https://example.com/pic.jpg', alt: 'Example', objectFit: 'cover', aspect: '16:9' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_image_invalid',
      type: 'page',
      children: [
        { id: 'image_bad', type: 'image', children: [], data: { src: '   ', alt: '', objectFit: 'stretch' as any, aspect: '3:2' as any } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });


  it('validates badge nodes require text', () => {
    const valid: BlueprintNode = {
      id: 'page_badge_valid',
      type: 'page',
      children: [
        { id: 'badge_ok', type: 'badge', children: [], data: { text: 'Beta', variant: 'solid' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_badge_invalid',
      type: 'page',
      children: [
        { id: 'badge_bad', type: 'badge', children: [], data: { text: '', variant: 'weird' as any } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });
  it('validates divider nodes require orientation', () => {
    const valid: BlueprintNode = {
      id: 'page_divider_valid',
      type: 'page',
      children: [
        { id: 'divider_ok', type: 'divider', children: [], data: { orientation: 'horizontal' } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_divider_invalid',
      type: 'page',
      children: [
        { id: 'divider_bad', type: 'divider', children: [], data: { orientation: 'diagonal' as any } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });
  it('validates card nodes require proper data', () => {
    const valid: BlueprintNode = {
      id: 'page_card_valid',
      type: 'page',
      children: [
        { id: 'card_ok', type: 'card', children: [], data: { title: 'Title', body: 'Body', media: { src: 'https://example.com/image.jpg', alt: 'Image' }, actions: [{ label: 'Go', href: { kind: 'url', href: 'https://example.com' } }] } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: valid })).not.toThrow();

    const invalid: BlueprintNode = {
      id: 'page_card_invalid',
      type: 'page',
      children: [
        { id: 'card_bad', type: 'card', children: [], data: { title: 42 as any, media: { src: '', alt: '' }, actions: [{ label: '', href: { kind: 'url', href: '' } }] } } as any,
      ],
    } as any;
    expect(() => validateTree({ root: invalid })).toThrow();
  });




});
