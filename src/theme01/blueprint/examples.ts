import type { BlueprintNode, BlueprintStateSnapshot } from '../foundation/types';

function makeLeaf(id: string): BlueprintNode {
  return { id, type: 'component', children: [] } as any;
}

export const header_example: BlueprintStateSnapshot = {
  root: {
    id: 'page_hf',
    type: 'page',
    children: [
      {
        id: 'header1',
        type: 'header',
        children: [],
        // @ts-expect-error dynamic shape
        slots: { logo: ['logo1'], right: ['r1'] },
        data: {
          navItems: [
            { id: 'n1', label: 'Home', kind: 'route', slug: '' },
            { id: 'n2', label: 'Blog', kind: 'route', slug: 'blog' },
            { id: 'n3', label: 'Docs', kind: 'route', slug: 'docs' },
            { id: 'n4', label: 'About', kind: 'route', slug: 'about' },
          ],
        },
      } as any,
    ],
  },
};

// attach children under header so ids are resolvable
(header_example.root.children[0] as any).children = [
  makeLeaf('logo1'),
  makeLeaf('r1'),
];

export const footer_example: BlueprintStateSnapshot = {
  root: {
    id: 'page_ff',
    type: 'page',
    children: [
      {
        id: 'footer1',
        type: 'footer',
        children: [],
        // @ts-expect-error dynamic shape
        columns: [
          { id: 'c1', content: ['f1', 'f2'] },
          { id: 'c2', content: ['f3'] },
          { id: 'c3', content: ['f4'] },
        ],
      } as any,
    ],
  },
};

(footer_example.root.children[0] as any).children = [
  makeLeaf('f1'),
  makeLeaf('f2'),
  makeLeaf('f3'),
  makeLeaf('f4'),
];


export const not_found_example: BlueprintStateSnapshot = {
  root: {
    id: 'page_404',
    type: 'page',
    children: [
      {
        id: 'header_404',
        type: 'header',
        children: [],
        // @ts-expect-error dynamic shape
        slots: { logo: [], right: [] },
        data: {
          navItems: [
            { id: 'nav_home', label: 'Home', kind: 'route', slug: '' },
            { id: 'nav_about', label: 'About', kind: 'route', slug: 'about' },
            { id: 'nav_docs', label: 'Docs', kind: 'route', slug: 'docs' },
          ],
        },
      } as any,
      {
        id: 'section_404',
        type: 'section',
        children: [
          makeLeaf('not_found_message'),
        ],
        data: {
          heading: '404 ? Page Not Found',
          body: 'The page you were looking for does not exist.',
        },
      } as any,
    ],
  },
};


