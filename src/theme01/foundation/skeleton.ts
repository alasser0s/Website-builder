import type { BlueprintNode, HeaderNode, FooterNode } from './types';
import { generateNodeId } from './id';

export function createInitialSkeleton(): BlueprintNode {
  const header: HeaderNode = {
    id: generateNodeId('header'),
    type: 'header',
    children: [],
    slots: { logo: [], right: [] },
    data: { navItems: [] },
  };
  const section: BlueprintNode = {
    id: generateNodeId('section'),
    type: 'section',
    children: [],
  };
  const footer: FooterNode = {
    id: generateNodeId('footer'),
    type: 'footer',
    children: [],
    data: { navItems: [], socialLinks: [], legal: { text: '', links: [] } },
    columns: [],
  };
  const page: BlueprintNode = {
    id: 'page_root',
    type: 'page',
    children: [header, section, footer],
  };
  return page;
}

