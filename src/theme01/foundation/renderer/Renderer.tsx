import React, { createContext, useContext, useMemo, useCallback, useState, useEffect, useId, useRef } from 'react';
import { useLocation, useNavigate, useInRouterContext, NavLink } from 'react-router-dom';
import type { BlueprintNode, BlueprintStateSnapshot, NodeType, NavItem, RouteNavItem, UrlNavItem, HeadingNode, HeadingLevel, HeadingAlignment, HeadingNodeData, ParagraphNode, ParagraphNodeData, ListNode, ListNodeData, ImageNode, ImageNodeData, ButtonNode, ButtonNodeData, BadgeNode, BadgeNodeData, DividerNode, DividerNodeData, CardNode, CardNodeData, CardAction, ButtonHref, FeaturesNode, FeaturesNodeData, FeatureItem, FeaturesLayout, GalleryNode, GalleryNodeData, SliderNode, SliderNodeData, MediaItem, MediaAspect, TestimonialsNode, TestimonialsNodeData, TestimonialItem, TestimonialsLayout, InputNode, InputNodeData, TextareaNode, TextareaNodeData, SelectNode, SelectNodeData, MapNode, MapNodeData, OpeningHoursNode, OpeningHoursNodeData, OpeningHoursEntry, OpeningHoursRange, MenuGridNode, CartNode, SocialLink, FooterLegal, HeaderNodeData, HeaderLayout, MobileNavBehavior } from '../types';
import { mapStylesToClasses } from '../../styles/mapper';
import { ensureRuntimeStylesInjected } from '../../styles/runtime';
import { theme01Tokens } from '../../styles/tokens';
import type { ThemeNavTokens, ThemeNavStateTokens } from '../../styles/tokens';
import { selectNodeById, selectPath } from '../selectors';
import { CartPanel, MenuGrid } from '../../commerce/kitchenx';

interface BlueprintActionsContext {
  addComponent?: (parentId: string, indexOrNode: number | BlueprintNode, maybeNode?: BlueprintNode) => void;
  reorder?: (parentId: string, from: number, to: number) => void;
  wrapInContainer?: (nodeId: string) => void;
  remove?: (nodeId: string) => void;
  moveNode?: (fromParentId: string, fromIndex: number, toParentId: string, toIndex: number) => void;
  wrapAndMove?: (targetId: string, draggingId: string, toIndex?: number) => void;
}

interface DndState {
  draggingId?: string;
  sourceParentId?: string;
  sourceIndex?: number;
}

interface BlueprintContextValue {
  snapshot: BlueprintStateSnapshot;
  actions?: BlueprintActionsContext;
  dnd?: {
    state: DndState;
    beginDrag: (nodeId: string) => void;
    endDrag: () => void;
  };
  nav?: {
    currentPath: string;
    navigate: (path: string, options?: { replace?: boolean }) => void;
  };
}

const BlueprintContext = createContext<BlueprintContextValue | undefined>(undefined);

interface BlueprintProviderProps {
  snapshot: BlueprintStateSnapshot;
  actions?: BlueprintActionsContext;
  children: React.ReactNode;
}

type BlueprintNav = {
  currentPath: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
};

export function BlueprintProvider(props: BlueprintProviderProps) {
  const inRouter = useInRouterContext();
  if (inRouter) return <BlueprintProviderWithRouter {...props} />;
  return <BlueprintProviderLegacy {...props} />;
}

function BlueprintProviderWithRouter(props: BlueprintProviderProps) {
  const location = useLocation();
  const routerNavigate = useNavigate();

  const currentPath = useMemo(() => {
    try {
      const raw = `${location.pathname}${location.search}${location.hash}` || '/';
      return normalizePath(raw);
    } catch {
      return '/';
    }
  }, [location]);

  const navigate = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      const target = typeof path === 'string' && path.trim() !== '' ? normalizePath(path) : '/';
      if (target === currentPath) return;
      routerNavigate(target, { replace: options?.replace });
    },
    [routerNavigate, currentPath],
  );

  return <BlueprintProviderRuntime {...props} nav={{ currentPath, navigate }} />;
}

function BlueprintProviderLegacy(props: BlueprintProviderProps) {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const raw = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
        return normalizePath(raw);
      }
    } catch {
      // noop
    }
    return '/';
  });

  useEffect(() => {
    const onPop = () => {
      try {
        const raw = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
        setCurrentPath(normalizePath(raw));
      } catch {
        // noop
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const safe = typeof path === 'string' && path.trim() !== '' ? normalizePath(path) : '/';
    setCurrentPath(safe);
    try {
      if (typeof window !== 'undefined' && window.history && safe.startsWith('/')) {
        if (options?.replace) window.history.replaceState({}, '', safe);
        else window.history.pushState({}, '', safe);
        try {
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore history errors in non-browser envs
    }
  }, []);

  return <BlueprintProviderRuntime {...props} nav={{ currentPath, navigate }} />;
}

interface BlueprintProviderRuntimeProps extends BlueprintProviderProps {
  nav: BlueprintNav;
}

function BlueprintProviderRuntime({ snapshot, actions, children, nav }: BlueprintProviderRuntimeProps) {
  const { currentPath, navigate } = nav;
  const [dndState, setDndState] = useState<DndState>({});

  const beginDrag = useCallback((nodeId: string) => {
    const path = selectPath(snapshot.root, nodeId);
    if (!path || path.idPath.length < 2) return;
    const sourceParentId = path.idPath[path.idPath.length - 2];
    const sourceIndex = path.indexPath[path.indexPath.length - 1];
    setDndState({ draggingId: nodeId, sourceParentId, sourceIndex });
  }, [snapshot]);

  const endDrag = useCallback(() => setDndState({}), []);

  const value = useMemo(
    () => ({
      snapshot,
      actions,
      dnd: { state: dndState, beginDrag, endDrag },
      nav: { currentPath, navigate },
    }),
    [snapshot, actions, dndState, beginDrag, endDrag, currentPath, navigate],
  );

  return <BlueprintContext.Provider value={value}>{children}</BlueprintContext.Provider>;
}

export function useBlueprintRoot(): BlueprintStateSnapshot {
  const ctx = useContext(BlueprintContext);
  if (!ctx) throw new Error('BlueprintProvider is missing');
  return ctx.snapshot;
}

function useBlueprintActions(): BlueprintActionsContext {
  const ctx = useContext(BlueprintContext);
  if (!ctx) throw new Error('BlueprintProvider is missing');
  return ctx.actions ?? {};
}

function useDnd() {
  const ctx = useContext(BlueprintContext);
  if (!ctx) throw new Error('BlueprintProvider is missing');
  return ctx.dnd ?? { state: {}, beginDrag: () => { }, endDrag: () => { } };
}

function useNav() {
  const ctx = useContext(BlueprintContext);
  if (!ctx) throw new Error('BlueprintProvider is missing');
  return ctx.nav ?? { currentPath: '/', navigate: () => { } };
}

interface RendererProps {
  nodeId: string;
}

export function Renderer({ nodeId }: RendererProps) {
  // Already ensured in main.tsx; keep as no-op call safe in SSR
  ensureRuntimeStylesInjected();
  const snapshot = useBlueprintRoot();
  const node = selectNodeById(snapshot.root, nodeId);
  if (!node) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`Renderer: Unknown id="${nodeId}"`);
    }
    return <DevBox text={`Unknown id="${nodeId}"`} />;
  }

  const RegistryComponent = resolveComponentFromRegistry(node.type);
  if (RegistryComponent) {
    return (
      <WithDnD nodeId={node.id}>
        <RegistryComponent node={node} />
      </WithDnD>
    );
  }

  // Fallback only for leaf components to keep current behavior
  if (node.type === 'component') {
    const Leaf = LeafComponent;
    return (
      <WithDnD nodeId={node.id}>
        <Leaf nodeId={node.id} />
      </WithDnD>
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`Unknown type: ${node.type} (id: ${node.id})`);
  }
  return (
    <WithDnD nodeId={node.id}>
      <Unknown type={node.type} id={node.id} />
    </WithDnD>
  );
}

// Registry
type RegisteredComponent = (props: { nodeId: string }) => React.ReactElement | null;

// Utilities
function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// -----------------------------
// Nav token → utility classes mapping
// -----------------------------
function mapNavStateToClasses(state: ThemeNavStateTokens | undefined): string[] {
  if (!state) return [];
  const classes: string[] = [];
  const { color, weight, decoration } = state;
  if (typeof color === 'string' && color in theme01Tokens.color) classes.push(`text-${color}`);
  if (typeof weight === 'string') classes.push(`font-${weight}`);
  if (typeof decoration === 'string') {
    if (decoration === 'none') classes.push('no-underline');
    else classes.push(decoration); // underline | line-through | overline
  }
  return classes;
}

function prefixHover(classes: string[]): string[] {
  return classes.map((c) => `hover:${c}`);
}

function prefixFocusVisible(classes: string[]): string[] {
  return classes.map((c) => `focus-visible:${c}`);
}

function mapNavTokensToClasses(nav: ThemeNavTokens | undefined): { base: string; hover: string; focus: string; active: string } {
  const base = mapNavStateToClasses(nav?.default).join(' ');
  const hover = prefixHover(mapNavStateToClasses(nav?.hover)).join(' ');
  const focus = prefixFocusVisible(mapNavStateToClasses(nav?.hover)).join(' ');
  const active = mapNavStateToClasses(nav?.active).join(' ');
  return { base, hover, focus, active };
}

const SOCIAL_PLATFORM_LABELS: Record<SocialLink['platform'], string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  website: 'Website',
};

const SOCIAL_PLATFORM_BADGES: Record<SocialLink['platform'], string> = {
  instagram: 'IG',
  facebook: 'FB',
  x: 'X',
  tiktok: 'TT',
  snapchat: 'SC',
  youtube: 'YT',
  whatsapp: 'WA',
  linkedin: 'IN',
  website: 'WEB',
};

// -----------------------------
// NAV story adapter & helpers
// -----------------------------
type NavRouteTarget = { kind: 'route'; slug: string };
type NavUrlTarget = { kind: 'url'; href: string };
type StoryNavItem =
  | NavItem
  | { id: string; label: string; target: NavRouteTarget | NavUrlTarget; newTab?: boolean; href?: string };

function resolveHref(item: StoryNavItem | any): string | undefined {
  if (!item) return undefined;
  if (item.kind === 'route') {
    const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
    const cleaned = slug.replace(/^\/+/, '');
    return cleaned ? `/${cleaned}` : '/';
  }
  if (item.kind === 'url') {
    return typeof item.href === 'string' && item.href.length > 0 ? item.href : undefined;
  }
  if (item?.href) return item.href; // backward compatibility with older schemas
  const t = item?.target;
  if (!t) return undefined;
  if (t.kind === 'route') {
    const slug = String(t.slug || '').trim();
    const cleaned = slug.replace(/^\/+/, '');
    return cleaned ? `/${cleaned}` : '/';
  }
  if (t.kind === 'url') return t.href;
  return undefined;
}

function resolveAnchorTarget(item: StoryNavItem | any): '_self' | '_blank' | undefined {
  if (!item) return undefined;
  if (item.kind === 'url') {
    return item.newTab ? '_blank' : undefined;
  }
  if (item.kind === 'route') {
    return undefined;
  }
  if (typeof item.newTab === 'boolean') {
    return item.newTab ? '_blank' : undefined;
  }
  const target = item?.target;
  if (!target) return undefined;
  if (target.kind === 'url') {
    return item?.newTab ? '_blank' : undefined;
  }
  if (target.kind === 'route') {
    return undefined;
  }
  if (typeof target === 'string') {
    return target as '_self' | '_blank' | undefined;
  }
  return undefined;
}

function normalizePath(p: string): string {
  try {
    const url = new URL(p, typeof window !== 'undefined' ? window.location.origin : 'http://local');
    let pathname = url.pathname || '/';
    if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    return pathname; // ignore search/hash
  } catch {
    if (!p) return '/';
    let s = p.split('#')[0].split('?')[0] || '/';
    if (s !== '/' && s.endsWith('/')) s = s.slice(0, -1);
    return s;
  }
}

// map node.styles into classNames using theme tokens
function mapNodeStyles(record: Record<string, unknown> | undefined): string {
  return mapStylesToClasses(record, theme01Tokens);
}

// Extract inline styles for properties that aren't mapped via utility classes
// Also pass through typography/layout properties for direct popup control
function mapInlineStyles(record: Record<string, unknown> | undefined): React.CSSProperties | undefined {
  if (!record) return undefined;
  const style: React.CSSProperties = {};

  // Typography pass-through (inline styles override utility classes)
  // Handle fontSize - accept numbers or numeric strings for direct pixel values
  const fontSize = record.fontSize;
  if (typeof fontSize === 'number' && Number.isFinite(fontSize) && fontSize > 0) {
    style.fontSize = `${fontSize}px`;
  } else if (typeof fontSize === 'string' && /^\d+$/.test(fontSize.trim())) {
    style.fontSize = `${fontSize.trim()}px`;
  }

  // Handle fontWeight
  const fontWeight = record.fontWeight;
  if (typeof fontWeight === 'string' && fontWeight.trim() !== '') {
    style.fontWeight = fontWeight as React.CSSProperties['fontWeight'];
  }

  // Handle fontStyle
  const fontStyle = record.fontStyle;
  if (typeof fontStyle === 'string' && fontStyle.trim() !== '') {
    style.fontStyle = fontStyle as React.CSSProperties['fontStyle'];
  }

  // Handle textDecoration
  const textDecoration = record.textDecoration;
  if (typeof textDecoration === 'string' && textDecoration.trim() !== '') {
    style.textDecoration = textDecoration as React.CSSProperties['textDecoration'];
  }

  // Handle textAlign
  const textAlign = record.textAlign;
  if (typeof textAlign === 'string' && textAlign.trim() !== '') {
    style.textAlign = textAlign as React.CSSProperties['textAlign'];
  }

  // Handle color (only hex colors for direct pass-through)
  const color = record.color;
  if (typeof color === 'string' && color.startsWith('#')) {
    style.color = color;
  }

  // Handle backgroundColor (only hex colors for direct pass-through)
  const backgroundColor = record.backgroundColor;
  if (typeof backgroundColor === 'string' && backgroundColor.startsWith('#')) {
    style.backgroundColor = backgroundColor;
  }

  // Handle fontFamily (for non-token fonts)
  const fontFamily = record.fontFamily;
  if (typeof fontFamily === 'string' && fontFamily !== 'inherit' && fontFamily.trim() !== '') {
    style.fontFamily = fontFamily;
  }

  // Handle layout & spacing pass-through
  const layoutProps = [
    'width', 'minWidth', 'maxWidth',
    'height', 'minHeight', 'maxHeight',
    'borderRadius', 'opacity', 'lineHeight'
  ];

  layoutProps.forEach((prop) => {
    const val = record[prop];
    if (typeof val === 'string' && val.trim() !== '') {
      (style as any)[prop] = val;
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      (style as any)[prop] = val;
    }
  });

  // Handle objectFit (for images)
  const objectFit = record.objectFit;
  if (typeof objectFit === 'string' && objectFit.trim() !== '') {
    style.objectFit = objectFit as React.CSSProperties['objectFit'];
  }

  // Background image handling
  const bgImage = (record as any)['bgImage'];
  if (typeof bgImage === 'string' && bgImage.trim() !== '') {
    style.backgroundImage = /^url\(/.test(bgImage) ? (bgImage as any) : `url("${bgImage}")`;
    const bgRepeat = (record as any)['bgRepeat'];
    const bgSize = (record as any)['bgSize'];
    const bgPosition = (record as any)['bgPosition'];
    if (typeof bgRepeat === 'string' && bgRepeat) style.backgroundRepeat = bgRepeat as any;
    if (typeof bgSize === 'string' && bgSize) style.backgroundSize = bgSize as any;
    if (typeof bgPosition === 'string' && bgPosition) style.backgroundPosition = bgPosition as any;
    if (!style.backgroundRepeat) style.backgroundRepeat = 'no-repeat';
    if (!style.backgroundSize) style.backgroundSize = 'cover';
    if (!style.backgroundPosition) style.backgroundPosition = 'center';
  }

  return Object.keys(style).length ? style : undefined;
}

// Leaf guard
function isLeafType(type: NodeType): boolean {
  return type === 'component'
    || type === 'heading'
    || type === 'paragraph'
    || type === 'list'
    || type === 'image'
    || type === 'button'
    || type === 'badge'
    || type === 'divider'
    || type === 'card'
    || type === 'features'
    || type === 'gallery'
    || type === 'slider'
    || type === 'testimonials'
    || type === 'input'
    || type === 'textarea'
    || type === 'select'
    || type === 'map'
    || type === 'opening_hours'
    || type === 'menu_grid'
    || type === 'cart';
}

// Base hook to get node from id
function useNode(nodeId: string): BlueprintNode | undefined {
  const snapshot = useBlueprintRoot();
  return selectNodeById(snapshot.root, nodeId);
}

// Remove unused PassThroughContainer to avoid fallback rendering from children

// Section renders by content only (no children fallback)
const SectionComponent: RegisteredComponent = ({ nodeId }) => {
  const node = useNode(nodeId);
  if (!node) return null;
  const styles = classNames('section', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const children = readContentOnly(node, 'section');
  return (
    <section data-node-id={node.id} data-node-type={node.type} className={styles} style={inline}>
      {children.map((cid) => (
        <Renderer key={cid} nodeId={cid} />
      ))}
    </section>
  );
};

// Container renders by content only (no children fallback)
const ContainerComponent: RegisteredComponent = ({ nodeId }) => {
  const node = useNode(nodeId);
  if (!node) return null;
  const maxWidth = (node.data?.['maxWidth'] as string) || 'full';
  const styles = classNames('container', mapMaxWidth(maxWidth), 'mx-auto', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const children = readContentOnly(node, 'container');
  return (
    <div data-node-id={node.id} data-node-type={node.type} className={styles} style={inline}>
      {children.map((cid) => (
        <Renderer key={cid} nodeId={cid} />
      ))}
    </div>
  );
};

// Row renders by columns[] in data only (no children fallback)
const RowComponent: RegisteredComponent = ({ nodeId }) => {
  const node = useNode(nodeId);
  if (!node) return null;
  const gap = toNumber(node.data?.['gap'], 0);
  const align = (node.data?.['align'] as string | undefined) || undefined; // items-*
  const justify = (node.data?.['justify'] as string | undefined) || undefined; // justify-*
  const rowStyles = classNames(
    'grid grid-cols-12',
    mapGap(gap),
    align ? `items-${align}` : '',
    justify ? `justify-${justify}` : '',
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles);

  // If columns defined in data, render from there
  const columnsData = (node as any)?.columns;
  if (columnsData !== undefined && !Array.isArray(columnsData)) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`Row(${node.id}) columns is not an array. Ignored.`);
    }
  }

  let content: React.ReactNode = null;
  if (Array.isArray(columnsData)) {
    content = (
      <>
        {columnsData.map((col, index) => {
          const span = toNumber((col as any)?.span, 12);
          const offset = toNumber((col as any)?.offset, 0);
          const colContent: string[] = Array.isArray((col as any)?.content)
            ? ((col as any)?.content as string[])
            : [];
          const colClass = classNames(mapColStart(offset + 1), mapColSpan(span));
          return (
            <div key={`c${index}`} className={colClass} data-col-index={index}>
              {colContent.map((cid) => (
                <Renderer key={cid} nodeId={cid} />
              ))}
            </div>
          );
        })}
      </>
    );
  } else {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`Row(${node.id}) renders nothing because columns is missing/invalid; expected array.`);
    }
    content = null;
  }

  return (
    <div data-node-id={node.id} data-node-type={node.type} className={rowStyles} style={inline}>
      {content}
    </div>
  );
};

// Column renders by content only (no children fallback)
const ColumnComponent: RegisteredComponent = ({ nodeId }) => {
  const node = useNode(nodeId);
  if (!node) return null;
  const span = toNumber(node.data?.['span'], 12);
  const offset = toNumber(node.data?.['offset'], 0);
  const className = classNames(
    mapColStart(offset + 1),
    mapColSpan(span),
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles);

  const children = readContentOnly(node, 'column');

  return (
    <div data-node-id={node.id} data-node-type={node.type} className={className} style={inline}>
      {children.map((cid) => (
        <Renderer key={cid} nodeId={cid} />
      ))}
    </div>
  );
};

// Leaf component: render minimal placeholder; ignore any children from data
const LeafComponent: RegisteredComponent = ({ nodeId }) => {
  const node = useNode(nodeId);
  if (!node) return null;
  const contentIds = readExplicitContent(node);
  if (contentIds && contentIds.length > 0 && isLeafType(node.type)) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`Leaf node(${node.id}) ignores provided content.`);
    }
  }
  const styles = mapNodeStyles(node.styles);
  const inline = mapInlineStyles(node.styles);
  return <div data-node-id={node.id} data-node-type={node.type} className={styles} style={inline} />;
};

// Helpers to read children ids
function readExplicitContent(node: BlueprintNode): string[] | undefined {
  const content = (node as any)?.content;
  if (Array.isArray(content)) return content as string[];
  return undefined;
}

function readContentOnly(node: BlueprintNode, type: 'section' | 'container' | 'column'): string[] {
  const content = readExplicitContent(node);
  if (Array.isArray(content)) {
    if (node.children && node.children.length > 0 && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`${type}(${node.id}) renders from content only; children are ignored.`);
    }
    return content;
  }
  if (node.children && node.children.length > 0 && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`${type}(${node.id}) missing content; children are ignored and nothing is rendered.`);
  }
  return [];
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return fallback;
}

// Tailwind mappings (static)
const MAX_WIDTH_MAP: Record<string, string> = {
  full: 'max-w-full',
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
};

function mapMaxWidth(value: unknown): string {
  if (typeof value === 'string' && value in MAX_WIDTH_MAP) return MAX_WIDTH_MAP[value];
  return MAX_WIDTH_MAP.full;
}

function mapGap(value: number): string {
  const allowed = new Set([0, 1, 2, 3, 4, 6, 8]);
  return allowed.has(value) ? `gap-${value}` : 'gap-0';
}

const COL_SPAN_CLASSES = [
  'col-span-1',
  'col-span-2',
  'col-span-3',
  'col-span-4',
  'col-span-5',
  'col-span-6',
  'col-span-7',
  'col-span-8',
  'col-span-9',
  'col-span-10',
  'col-span-11',
  'col-span-12',
] as const;

const COL_START_CLASSES = [
  'col-start-1',
  'col-start-2',
  'col-start-3',
  'col-start-4',
  'col-start-5',
  'col-start-6',
  'col-start-7',
  'col-start-8',
  'col-start-9',
  'col-start-10',
  'col-start-11',
  'col-start-12',
] as const;

function mapColSpan(spanRaw: number): string {
  const span = Math.min(12, Math.max(1, Math.floor(spanRaw)));
  return COL_SPAN_CLASSES[span - 1];
}

function mapColStart(startRaw: number): string | '' {
  if (!Number.isFinite(startRaw) || startRaw <= 0) return '';
  const start = Math.min(12, Math.max(1, Math.floor(startRaw)));
  return COL_START_CLASSES[start - 1];
}

export type { RendererProps };

// -----------------------------
// Registry mapping to correct views (content-only, no children fallback)
// -----------------------------

type RegistryView = React.FC<{ node: BlueprintNode }>;

export const HEADING_TEXT_MAX_LENGTH = 320;
const DEFAULT_HEADING_LEVEL: HeadingLevel = 2;
const DEFAULT_HEADING_ALIGN: HeadingAlignment = 'start';

const headingFontSizeByLevel: Record<HeadingLevel, string> = {
  1: theme01Tokens.fontSize['3xl'] ?? 'text-3xl',
  2: theme01Tokens.fontSize['2xl'] ?? 'text-2xl',
  3: theme01Tokens.fontSize['xl'] ?? 'text-xl',
  4: theme01Tokens.fontSize['lg'] ?? 'text-lg',
  5: theme01Tokens.fontSize['base'] ?? 'text-base',
  6: theme01Tokens.fontSize['sm'] ?? 'text-sm',
};

const headingLineClampByLevel: Record<HeadingLevel, number> = {
  1: 3,
  2: 3,
  3: 4,
  4: 4,
  5: 5,
  6: 6,
};

const headingAlignClass: Record<HeadingAlignment, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

function normalizeHeadingLevel(level: unknown): HeadingLevel {
  const numeric = typeof level === 'number' ? level : typeof level === 'string' ? Number(level) : Number.NaN;
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 6) return numeric as HeadingLevel;
  return DEFAULT_HEADING_LEVEL;
}

function normalizeHeadingAlign(align: unknown): HeadingAlignment {
  if (align === 'center' || align === 'end') return align;
  return DEFAULT_HEADING_ALIGN;
}

function clampHeadingText(text: unknown): string {
  if (typeof text !== 'string') return '';
  if (text.length <= HEADING_TEXT_MAX_LENGTH) return text;
  const truncated = text.slice(0, HEADING_TEXT_MAX_LENGTH - 1).trimEnd();
  return `${truncated}…`;
}

function buildHeadingStyle(level: HeadingLevel, inline: React.CSSProperties | undefined): React.CSSProperties {
  const clamp = headingLineClampByLevel[level] ?? headingLineClampByLevel[DEFAULT_HEADING_LEVEL];
  const clampStyles: React.CSSProperties = {
    overflow: 'hidden',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: String(clamp),
    textWrap: 'balance' as React.CSSProperties['textWrap'],
  };
  return inline ? { ...inline, ...clampStyles } : clampStyles;
}

const renderHeading: RegistryView = ({ node }) => {
  const heading = node as HeadingNode;
  const data = (heading.data ?? {}) as HeadingNodeData;
  const level = normalizeHeadingLevel(data.level);
  const align = normalizeHeadingAlign(data.align);
  const text = clampHeadingText(data.text);
  const nav = useNav();
  const href = data.href as ButtonHref | undefined;
  const targetHref = href ? resolveHref(href) : undefined;
  const isRoute = href?.kind === 'route';
  const isUrl = href?.kind === 'url';
  const newTab = isUrl && href?.newTab === true;
  const fontClass = headingFontSizeByLevel[level] ?? headingFontSizeByLevel[DEFAULT_HEADING_LEVEL];
  const classes = classNames('heading', fontClass, headingAlignClass[align], mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const style = buildHeadingStyle(level, inline);
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isRoute && targetHref && typeof nav.navigate === 'function') {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        nav.navigate(targetHref);
      }
    },
    [isRoute, targetHref, nav],
  );
  const content = targetHref ? (
    <a
      href={targetHref}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      style={INLINE_LINK_STYLE}
    >
      {text}
    </a>
  ) : text;
  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-heading-level={level}
      data-heading-align={align}
      className={classes}
      style={style}
    >
      {content}
    </div>
  );
};

const PARAGRAPH_SEPARATOR = /\r?\n\s*\r?\n/;
const PARAGRAPH_LINE_BREAK = /\r?\n/;
const paragraphBaseStyle: React.CSSProperties = {
  margin: 0,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  hyphens: 'auto',
  textWrap: 'balance' as React.CSSProperties['textWrap'],
};

const INLINE_LINK_STYLE: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
  textUnderlineOffset: '0.18em',
};

function splitParagraphs(value: string): string[] {
  return value
    .split(PARAGRAPH_SEPARATOR)
    .map((chunk) => chunk.replace(/\r/g, '').trim())
    .filter((chunk) => chunk.length > 0);
}


function normalizeThickness(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const safe = Math.max(1, Math.abs(value));
    return `${safe}px`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return '1px';
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }
  return '1px';
}

const IMAGE_ASPECT_PADDING: Record<NonNullable<ImageNodeData['aspect']>, string> = {
  '1:1': '100%',
  '4:3': '75%',
  '16:9': '56.25%',
};

const IMAGE_OBJECT_FIT: Record<NonNullable<ImageNodeData['objectFit']>, React.CSSProperties['objectFit']> = {
  cover: 'cover',
  contain: 'contain',
};

const IMAGE_SKELETON_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  backgroundColor: '#e5e7eb',
};

const IMAGE_FALLBACK_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  backgroundColor: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  color: '#475569',
  fontSize: 12,
  textAlign: 'center',
  padding: '8px',
};

const listItemBaseStyle: React.CSSProperties = {
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  hyphens: 'auto',
  textWrap: 'balance' as React.CSSProperties['textWrap'],
};

const renderParagraph: RegistryView = ({ node }) => {
  const paragraph = node as ParagraphNode;
  const data = (paragraph.data ?? {}) as ParagraphNodeData;
  const raw = typeof data?.text === 'string' ? data.text : '';
  const chunks = splitParagraphs(raw);
  if (chunks.length === 0) return null;
  const nav = useNav();
  const href = data.href as ButtonHref | undefined;
  const targetHref = href ? resolveHref(href) : undefined;
  const isRoute = href?.kind === 'route';
  const isUrl = href?.kind === 'url';
  const newTab = isUrl && href?.newTab === true;
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isRoute && targetHref && typeof nav.navigate === 'function') {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        nav.navigate(targetHref);
      }
    },
    [isRoute, targetHref, nav],
  );
  const classes = classNames('paragraph', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const total = chunks.length;
  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-paragraph-count={String(total)}
      className={classes}
      style={inline}
    >
      {chunks.map((chunk, index) => {
        const lines = chunk.split(PARAGRAPH_LINE_BREAK).map((line) => line.replace(/\r/g, ''));
        const paragraphStyle: React.CSSProperties = {
          ...paragraphBaseStyle,
          marginTop: index === 0 ? 0 : '1em',
          marginBottom: index === total - 1 ? 0 : '1em',
        };
        return (
          <p key={`paragraph-${index}`} data-paragraph-index={index} style={paragraphStyle}>
            {targetHref ? (
              <a
                href={targetHref}
                target={newTab ? '_blank' : undefined}
                rel={newTab ? 'noopener noreferrer' : undefined}
                onClick={handleClick}
                style={INLINE_LINK_STYLE}
              >
                {lines.map((line, lineIndex) => (
                  <React.Fragment key={`line-${lineIndex}`}>
                    {line}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </React.Fragment>
                ))}
              </a>
            ) : (
              lines.map((line, lineIndex) => (
                <React.Fragment key={`line-${lineIndex}`}>
                  {line}
                  {lineIndex < lines.length - 1 ? <br /> : null}
                </React.Fragment>
              ))
            )}
          </p>
        );
      })}
    </div>
  );
};


const BUTTON_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-5 py-3',
};

const BUTTON_VARIANT_CLASSES: Record<'solid' | 'outline' | 'ghost', string> = {
  solid: 'bg-primary text-surface hover:opacity-90 shadow-sm',
  outline: 'border border-primary text-primary hover:bg-primary hover:text-surface',
  ghost: 'text-primary hover:bg-primary/10',
};

const renderButton: RegistryView = ({ node }) => {
  const button = node as ButtonNode;
  const data = (button.data ?? {}) as ButtonNodeData;
  const label = typeof data?.label === 'string' && data.label.trim() !== '' ? data.label.trim() : 'Button';
  const href = data?.href;
  const nav = useNav();
  const size = (data?.size ?? 'md') as 'sm' | 'md' | 'lg';
  const variant = (data?.variant ?? 'solid') as 'solid' | 'outline' | 'ghost';
  const iconLeft = typeof data?.iconLeft === 'string' && data.iconLeft.length > 0 ? data.iconLeft : undefined;
  const iconRight = typeof data?.iconRight === 'string' && data.iconRight.length > 0 ? data.iconRight : undefined;
  const kind: 'route' | 'url' | 'action' = href?.kind === 'route' ? 'route' : href?.kind === 'url' ? 'url' : 'action';

  const targetHref = href ? resolveHref(href) : undefined;
  const isUrl = href?.kind === 'url' && typeof href.href === 'string' && href.href.trim() !== '';
  const newTab = href?.kind === 'url' && href.newTab === true;

  const [pressed, setPressed] = useState(false);

  const baseClasses = classNames(
    'button-component inline-flex items-center justify-center gap-2 font-medium transition duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary select-none relative rounded-md',
    BUTTON_SIZE_CLASSES[size] ?? BUTTON_SIZE_CLASSES.md,
    BUTTON_VARIANT_CLASSES[variant] ?? BUTTON_VARIANT_CLASSES.solid,
    mapNodeStyles(node.styles),
  );

  const inline = mapInlineStyles(node.styles) ?? {};
  const style: React.CSSProperties = { ...inline };
  if (pressed) {
    const existing = inline.transform;
    style.transform = existing ? `${existing} scale(0.98)` : 'scale(0.98)';
  }

  const startPress = () => setPressed(true);
  const endPress = () => setPressed(false);
  const cancelPress = () => setPressed(false);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (kind === 'route' && targetHref && typeof nav.navigate === 'function') {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        nav.navigate(targetHref);
      }
    },
    [kind, targetHref, nav],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      setPressed(true);
      if (event.key === ' ') event.preventDefault();
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      setPressed(false);
      if (event.key === ' ' && kind === 'route' && targetHref && typeof nav.navigate === 'function') {
        event.preventDefault();
        nav.navigate(targetHref);
      }
    }
  };

  const content = (
    <>
      {iconLeft ? (
        <span aria-hidden="true" className="pointer-events-none opacity-80">
          {iconLeft}
        </span>
      ) : null}
      <span>{label}</span>
      {iconRight ? (
        <span aria-hidden="true" className="pointer-events-none opacity-80">
          {iconRight}
        </span>
      ) : null}
    </>
  );

  if (kind === 'url' && isUrl) {
    const hrefValue = targetHref ?? href!.href;
    return (
      <a
        data-node-id={node.id}
        data-node-type={node.type}
        data-button-kind="url"
        className={baseClasses}
        style={style}
        href={hrefValue}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={cancelPress}
        onBlur={cancelPress}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        {content}
      </a>
    );
  }

  const commonProps = {
    'data-node-id': node.id,
    'data-node-type': node.type,
    'data-button-kind': kind,
    className: baseClasses,
    style,
    onPointerDown: startPress,
    onPointerUp: endPress,
    onPointerLeave: cancelPress,
    onBlur: cancelPress,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onClick: handleClick,
  } as const;

  if (kind === 'route' && targetHref) {
    return (
      <a {...commonProps} href={targetHref} data-button-target={targetHref}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" {...commonProps} data-button-target={targetHref}>
      {content}
    </button>
  );
};



const BADGE_VARIANT_CLASSES: Record<'solid' | 'outline' | 'ghost', string> = {
  solid: 'bg-primary text-surface',
  outline: 'border border-primary text-primary',
  ghost: 'text-primary bg-primary/10',
};

const renderBadge: RegistryView = ({ node }) => {
  const badge = node as BadgeNode;
  const data = (badge.data ?? {}) as BadgeNodeData;
  const textValue = typeof data?.text === 'string' ? data.text.trim() : '';
  if (textValue === '') return null;
  const variant = (data?.variant ?? 'solid') as 'solid' | 'outline' | 'ghost';
  const classes = classNames(
    'badge-component inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full leading-none',
    BADGE_VARIANT_CLASSES[variant] ?? BADGE_VARIANT_CLASSES.solid,
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles);
  return (
    <span
      data-node-id={node.id}
      data-node-type={node.type}
      data-badge-variant={variant}
      className={classes}
      style={inline}
    >
      {textValue}
    </span>
  );
};


const renderCard: RegistryView = ({ node }) => {
  const card = node as CardNode;
  const data = (card.data ?? {}) as CardNodeData;
  const rawStyles = (card.styles ?? {}) as Record<string, unknown>;
  const equalHeight = (rawStyles as any)?.equalHeight === true;
  const styleRest: Record<string, unknown> = { ...rawStyles };
  delete (styleRest as any).equalHeight;

  const classes = classNames(
    'card-component flex flex-col gap-3',
    mapStylesToClasses(styleRest, theme01Tokens),
  );
  const inline = { ...(mapInlineStyles(styleRest) ?? {}) } as React.CSSProperties;
  if (equalHeight) {
    inline.minHeight = inline.minHeight ?? '100%';
    inline.height = inline.height ?? '100%';
    inline.display = inline.display ?? 'flex';
  }

  const title = typeof data?.title === 'string' && data.title.trim() !== '' ? data.title.trim() : undefined;
  const body = typeof data?.body === 'string' && data.body.trim() !== '' ? data.body.trim() : undefined;
  const media = data?.media && typeof data.media === 'object' ? data.media : undefined;
  const actions = Array.isArray(data?.actions)
    ? data!.actions!.filter((action) => action && typeof action.label === 'string' && action.label.trim() !== '')
    : [];
  const nav = useNav();

  const renderAction = (action: CardAction, index: number) => {
    const label = action.label.trim();
    const href = action.href;
    const actionKind: 'route' | 'url' | 'action' = href?.kind === 'route' ? 'route' : href?.kind === 'url' ? 'url' : 'action';
    const baseClass = 'card-action inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition';

    if (actionKind === 'url' && href?.kind === 'url' && href.href.trim() !== '') {
      const url = href.href.trim();
      const newTab = href.newTab === true;
      return (
        <a
          key={`action-${index}`}
          data-card-action-kind="url"
          className={baseClass}
          href={url}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
        >
          {label}
        </a>
      );
    }

    if (actionKind === 'route' && href?.kind === 'route') {
      const target = resolveHref(href) ?? '/';
      const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if (typeof nav.navigate === 'function') nav.navigate(target);
      };
      return (
        <a
          key={`action-${index}`}
          data-card-action-kind="route"
          className={baseClass}
          href={target}
          onClick={onClick}
        >
          {label}
        </a>
      );
    }

    return (
      <button
        key={`action-${index}`}
        type="button"
        data-card-action-kind="action"
        className={baseClass}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      className={classes}
      style={inline}
    >
      {media && typeof media.src === 'string' && media.src.trim() !== '' ? (
        <div data-card-section="media" className="card-media">
          <img
            src={media.src}
            alt={typeof media.alt === 'string' && media.alt.trim() !== '' ? media.alt : ''}
            loading="lazy"
            className="w-full object-cover rounded-md"
          />
        </div>
      ) : null}
      {title ? (
        <h3 data-card-section="title" className="text-lg font-semibold">
          {title}
        </h3>
      ) : null}
      {body ? (
        <p data-card-section="body" className="text-sm text-slate-700 leading-relaxed">
          {body}
        </p>
      ) : null}
      {actions.length > 0 ? (
        <div data-card-section="actions" className="card-actions flex flex-wrap gap-2">
          {actions.map(renderAction)}
        </div>
      ) : null}
    </div>
  );
};

const DEFAULT_FEATURES_LAYOUT: FeaturesLayout = 'grid';

function normalizeFeaturesLayout(value: unknown): FeaturesLayout {
  if (value === 'stacked' || value === 'icon-left' || value === 'grid') return value;
  return DEFAULT_FEATURES_LAYOUT;
}

function normalizeFeatureItems(items: unknown): FeatureItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is FeatureItem => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id.trim() !== '' ? item.id : `feature_${index + 1}`,
      title: typeof item.title === 'string' ? item.title : '',
      description: typeof item.description === 'string' ? item.description : undefined,
      icon: typeof item.icon === 'string' ? item.icon : undefined,
      image: item.image && typeof item.image === 'object'
        ? {
          src: typeof item.image.src === 'string' ? item.image.src : '',
          alt: typeof item.image.alt === 'string' ? item.image.alt : undefined,
        }
        : undefined,
    }))
    .filter((item) => item.title.trim() !== '');
}

const renderFeatures: RegistryView = ({ node }) => {
  const features = node as FeaturesNode;
  const data = (features.data ?? {}) as FeaturesNodeData;
  const title = typeof data.title === 'string' && data.title.trim() !== '' ? data.title.trim() : '';
  const subtitle = typeof data.subtitle === 'string' && data.subtitle.trim() !== '' ? data.subtitle.trim() : '';
  const layout = normalizeFeaturesLayout(data.layout);
  const columns = Math.min(6, Math.max(1, Math.floor(toNumber(data.columns, 3))));
  const items = normalizeFeatureItems(data.items);

  const classes = classNames('features-block', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const listStyle: React.CSSProperties | undefined = layout === 'grid'
    ? ({ ['--feature-columns' as any]: String(columns) } as React.CSSProperties)
    : undefined;

  return (
    <div data-node-id={node.id} data-node-type={node.type} data-features-layout={layout} className={classes} style={inline}>
      {title || subtitle ? (
        <div className="features-header">
          {title ? <div className="features-title">{title}</div> : null}
          {subtitle ? <div className="features-subtitle">{subtitle}</div> : null}
        </div>
      ) : null}
      <div className={classNames('features-list', `features-list--${layout}`)} style={listStyle}>
        {items.length === 0 ? (
          process.env.NODE_ENV !== 'production' ? <div className="features-empty">Add feature items to get started.</div> : null
        ) : (
          items.map((item, index) => {
            const imageSrc = item.image && typeof item.image.src === 'string' && item.image.src.trim() !== ''
              ? item.image.src.trim()
              : '';
            const imageAlt = item.image && typeof item.image.alt === 'string' && item.image.alt.trim() !== ''
              ? item.image.alt.trim()
              : item.title;
            const icon = typeof item.icon === 'string' && item.icon.trim() !== '' ? item.icon.trim() : '';
            const iconValue = icon || (process.env.NODE_ENV !== 'production' ? 'ICON' : '');
            return (
              <div key={item.id ?? `feature-${index}`} className="feature-item">
                <div className="feature-media">
                  {imageSrc ? (
                    <img src={imageSrc} alt={imageAlt} loading="lazy" className="feature-image" />
                  ) : iconValue ? (
                    <div className="feature-icon" aria-hidden="true">{iconValue}</div>
                  ) : null}
                </div>
                <div className="feature-body">
                  <div className="feature-item-title">{item.title}</div>
                  {item.description ? <div className="feature-item-desc">{item.description}</div> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const DEFAULT_MEDIA_ASPECT: MediaAspect = '4:3';

const MEDIA_ASPECT_RATIO: Record<MediaAspect, string> = {
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
};

function normalizeMediaAspect(value: unknown): MediaAspect {
  if (value === '1:1' || value === '4:3' || value === '16:9') return value;
  return DEFAULT_MEDIA_ASPECT;
}

function normalizeMediaItems(items: unknown): MediaItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is MediaItem => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id.trim() !== '' ? item.id : `media_${index + 1}`,
      src: typeof item.src === 'string' ? item.src : '',
      alt: typeof item.alt === 'string' ? item.alt : undefined,
      caption: typeof item.caption === 'string' ? item.caption : undefined,
    }))
    .filter((item) => item.src.trim() !== '');
}

const renderGallery: RegistryView = ({ node }) => {
  const gallery = node as GalleryNode;
  const data = (gallery.data ?? {}) as GalleryNodeData;
  const title = typeof data.title === 'string' && data.title.trim() !== '' ? data.title.trim() : '';
  const subtitle = typeof data.subtitle === 'string' && data.subtitle.trim() !== '' ? data.subtitle.trim() : '';
  const columns = Math.min(6, Math.max(1, Math.floor(toNumber(data.columns, 3))));
  const aspect = normalizeMediaAspect(data.aspect);
  const items = normalizeMediaItems(data.items);
  const aspectRatio = MEDIA_ASPECT_RATIO[aspect];

  const classes = classNames('gallery-block', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const listStyle: React.CSSProperties = { ['--gallery-columns' as any]: String(columns) };

  return (
    <div data-node-id={node.id} data-node-type={node.type} className={classes} style={inline}>
      {title || subtitle ? (
        <div className="gallery-header">
          {title ? <div className="gallery-title">{title}</div> : null}
          {subtitle ? <div className="gallery-subtitle">{subtitle}</div> : null}
        </div>
      ) : null}
      <div className="gallery-grid" style={listStyle}>
        {items.length === 0 ? (
          process.env.NODE_ENV !== 'production' ? <div className="gallery-empty">Add images to the gallery.</div> : null
        ) : (
          items.map((item) => (
            <figure key={item.id} className="gallery-item">
              <div className="gallery-media" style={{ aspectRatio }}>
                <img src={item.src} alt={item.alt ?? ''} loading="lazy" />
              </div>
              {item.caption ? <figcaption className="gallery-caption">{item.caption}</figcaption> : null}
            </figure>
          ))
        )}
      </div>
    </div>
  );
};

const renderSlider: RegistryView = ({ node }) => {
  const slider = node as SliderNode;
  const data = (slider.data ?? {}) as SliderNodeData;
  const title = typeof data.title === 'string' && data.title.trim() !== '' ? data.title.trim() : '';
  const subtitle = typeof data.subtitle === 'string' && data.subtitle.trim() !== '' ? data.subtitle.trim() : '';
  const perView = Math.min(6, Math.max(1, Math.floor(toNumber(data.per_view, 1))));
  const showArrows = data.show_arrows !== false;
  const showDots = data.show_dots !== false;
  const autoPlay = data.auto_play === true;
  const autoPlayInterval = Math.min(15000, Math.max(1000, Math.floor(toNumber(data.auto_play_interval, 4500))));
  const aspect = normalizeMediaAspect(data.aspect);
  const items = normalizeMediaItems(data.items);
  const aspectRatio = MEDIA_ASPECT_RATIO[aspect];

  const classes = classNames('slider-block', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const trackStyle: React.CSSProperties = { ['--slider-per-view' as any]: String(perView) };
  const pageCount = Math.max(1, Math.ceil(items.length / perView));
  const showArrowControls = showArrows && pageCount > 1;
  const showDotControls = showDots && pageCount > 1;

  const trackRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

  const scrollToPage = useCallback((nextPage: number) => {
    const nodeRef = trackRef.current;
    if (!nodeRef) return;
    const clamped = Math.min(pageCount - 1, Math.max(0, nextPage));
    const width = nodeRef.clientWidth;
    nodeRef.scrollTo({ left: width * clamped, behavior: 'smooth' });
    setActivePage(clamped);
  }, [pageCount]);

  const handleScroll = useCallback(() => {
    const nodeRef = trackRef.current;
    if (!nodeRef) return;
    const width = nodeRef.clientWidth;
    if (!width) return;
    const next = Math.round(nodeRef.scrollLeft / width);
    if (next !== activePage) {
      setActivePage(Math.min(pageCount - 1, Math.max(0, next)));
    }
  }, [activePage, pageCount]);

  useEffect(() => {
    const nodeRef = trackRef.current;
    if (nodeRef) nodeRef.scrollTo({ left: 0 });
    setActivePage(0);
  }, [perView, items.length]);

  useEffect(() => {
    if (!autoPlay || pageCount <= 1) return undefined;
    const timer = window.setInterval(() => {
      const nextPage = activePage + 1 >= pageCount ? 0 : activePage + 1;
      scrollToPage(nextPage);
    }, autoPlayInterval);
    return () => window.clearInterval(timer);
  }, [autoPlay, autoPlayInterval, activePage, pageCount, scrollToPage]);

  return (
    <div data-node-id={node.id} data-node-type={node.type} className={classes} style={inline}>
      {title || subtitle ? (
        <div className="slider-header">
          {title ? <div className="slider-title">{title}</div> : null}
          {subtitle ? <div className="slider-subtitle">{subtitle}</div> : null}
        </div>
      ) : null}
      <div className={classNames('slider-shell', showArrowControls ? 'slider-shell--controls' : 'slider-shell--solo')}>
        {showArrowControls ? (
          <button type="button" data-editor-interactive="true" className="slider-arrow slider-arrow--prev" onClick={() => scrollToPage(activePage - 1)} disabled={activePage <= 0} aria-label="Previous">
            Prev
          </button>
        ) : null}
        <div className="slider-track" style={trackStyle} ref={trackRef} onScroll={handleScroll}>
          {items.length === 0 ? (
            process.env.NODE_ENV !== 'production' ? <div className="slider-empty">Add slides to the slider.</div> : null
          ) : (
            items.map((item) => (
              <figure key={item.id} className="slider-item">
                <div className="slider-media" style={{ aspectRatio }}>
                  <img src={item.src} alt={item.alt ?? ''} loading="lazy" />
                </div>
                {item.caption ? <figcaption className="slider-caption">{item.caption}</figcaption> : null}
              </figure>
            ))
          )}
        </div>
        {showArrowControls ? (
          <button type="button" data-editor-interactive="true" className="slider-arrow slider-arrow--next" onClick={() => scrollToPage(activePage + 1)} disabled={activePage >= pageCount - 1} aria-label="Next">
            Next
          </button>
        ) : null}
      </div>
      {showDotControls ? (
        <div className="slider-dots" role="tablist" aria-label="Slider navigation">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              data-editor-interactive="true"
              className={classNames('slider-dot', index === activePage && 'is-active')}
              onClick={() => scrollToPage(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const DEFAULT_TESTIMONIALS_LAYOUT: TestimonialsLayout = 'grid';

function normalizeTestimonialsLayout(value: unknown): TestimonialsLayout {
  if (value === 'grid' || value === 'slider' || value === 'highlight') return value;
  return DEFAULT_TESTIMONIALS_LAYOUT;
}

function normalizeTestimonialItems(items: unknown): TestimonialItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is TestimonialItem => !!item && typeof item === 'object')
    .map((item, index) => {
      const rating = typeof item.rating === 'number' && Number.isFinite(item.rating)
        ? Math.max(0, Math.min(5, item.rating))
        : undefined;
      return {
        id: typeof item.id === 'string' && item.id.trim() !== '' ? item.id : `testimonial_${index + 1}`,
        name: typeof item.name === 'string' ? item.name : '',
        text: typeof item.text === 'string' ? item.text : '',
        rating,
        avatar: item.avatar && typeof item.avatar === 'object'
          ? {
            src: typeof item.avatar.src === 'string' ? item.avatar.src : '',
            alt: typeof item.avatar.alt === 'string' ? item.avatar.alt : undefined,
          }
          : undefined,
        role: typeof item.role === 'string' ? item.role : undefined,
        source: typeof item.source === 'string' ? item.source : undefined,
      };
    })
    .filter((item) => item.name.trim() !== '' && item.text.trim() !== '');
}

function formatRatingLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  return `Rating: ${display}/5`;
}

const renderTestimonials: RegistryView = ({ node }) => {
  const testimonials = node as TestimonialsNode;
  const data = (testimonials.data ?? {}) as TestimonialsNodeData;
  const title = typeof data.title === 'string' && data.title.trim() !== '' ? data.title.trim() : '';
  const subtitle = typeof data.subtitle === 'string' && data.subtitle.trim() !== '' ? data.subtitle.trim() : '';
  const layout = normalizeTestimonialsLayout(data.layout);
  const columns = Math.min(6, Math.max(1, Math.floor(toNumber(data.columns, 3))));
  const perView = Math.min(6, Math.max(1, Math.floor(toNumber(data.per_view, 1))));
  const showArrows = data.show_arrows !== false;
  const showDots = data.show_dots !== false;
  const items = normalizeTestimonialItems(data.items);

  const classes = classNames('testimonials-block', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const gridStyle: React.CSSProperties = { ['--testimonial-columns' as any]: String(columns) };
  const trackStyle: React.CSSProperties = { ['--testimonial-per-view' as any]: String(perView) };
  const emptyState = process.env.NODE_ENV !== 'production'
    ? <div className="testimonials-empty">Add testimonials to get started.</div>
    : null;

  const trackRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / perView));
  const showArrowControls = layout === 'slider' && showArrows && pageCount > 1;
  const showDotControls = layout === 'slider' && showDots && pageCount > 1;

  const scrollToPage = useCallback((nextPage: number) => {
    const nodeRef = trackRef.current;
    if (!nodeRef) return;
    const clamped = Math.min(pageCount - 1, Math.max(0, nextPage));
    const width = nodeRef.clientWidth;
    nodeRef.scrollTo({ left: width * clamped, behavior: 'smooth' });
    setActivePage(clamped);
  }, [pageCount]);

  const handleScroll = useCallback(() => {
    const nodeRef = trackRef.current;
    if (!nodeRef) return;
    const width = nodeRef.clientWidth;
    if (!width) return;
    const next = Math.round(nodeRef.scrollLeft / width);
    if (next !== activePage) {
      setActivePage(Math.min(pageCount - 1, Math.max(0, next)));
    }
  }, [activePage, pageCount]);

  useEffect(() => {
    if (layout !== 'slider') return;
    const nodeRef = trackRef.current;
    if (nodeRef) nodeRef.scrollTo({ left: 0 });
    setActivePage(0);
  }, [layout, perView, items.length]);

  const renderCard = (item: TestimonialItem, variant?: 'compact' | 'highlight') => {
    const avatarSrc = item.avatar && typeof item.avatar.src === 'string' && item.avatar.src.trim() !== ''
      ? item.avatar.src.trim()
      : '';
    const avatarAlt = item.avatar && typeof item.avatar.alt === 'string' && item.avatar.alt.trim() !== ''
      ? item.avatar.alt.trim()
      : item.name;
    const role = typeof item.role === 'string' && item.role.trim() !== '' ? item.role.trim() : '';
    const source = typeof item.source === 'string' && item.source.trim() !== '' ? item.source.trim() : '';
    const subtitleText = [role, source].filter(Boolean).join(' - ');
    const ratingLabel = typeof item.rating === 'number' ? formatRatingLabel(item.rating) : '';
    return (
      <div
        className={classNames(
          'testimonial-card',
          variant === 'compact' && 'testimonial-card--compact',
          variant === 'highlight' && 'testimonial-card--highlight',
        )}
      >
        <div className="testimonial-header">
          {avatarSrc ? (
            <div className="testimonial-avatar">
              <img src={avatarSrc} alt={avatarAlt} loading="lazy" />
            </div>
          ) : null}
          <div className="testimonial-meta">
            <div className="testimonial-name">{item.name}</div>
            {subtitleText ? <div className="testimonial-subtitle">{subtitleText}</div> : null}
          </div>
        </div>
        <div className="testimonial-body">"{item.text}"</div>
        {ratingLabel ? <div className="testimonial-rating">{ratingLabel}</div> : null}
      </div>
    );
  };

  const highlightItem = layout === 'highlight' ? items[0] : undefined;
  const highlightRest = layout === 'highlight' ? items.slice(1) : [];

  return (
    <div data-node-id={node.id} data-node-type={node.type} data-testimonials-layout={layout} className={classes} style={inline}>
      {title || subtitle ? (
        <div className="testimonials-header">
          {title ? <div className="testimonials-title">{title}</div> : null}
          {subtitle ? <div className="testimonials-subtitle">{subtitle}</div> : null}
        </div>
      ) : null}
      {layout === 'slider' ? (
        <>
          <div className={classNames('testimonials-shell', showArrowControls ? 'testimonials-shell--controls' : 'testimonials-shell--solo')}>
            {showArrowControls ? (
              <button type="button" data-editor-interactive="true" className="testimonials-arrow testimonials-arrow--prev" onClick={() => scrollToPage(activePage - 1)} disabled={activePage <= 0} aria-label="Previous">
                Prev
              </button>
            ) : null}
            <div className="testimonials-track" style={trackStyle} ref={trackRef} onScroll={handleScroll}>
              {items.length === 0 ? (
                emptyState
              ) : (
                items.map((item) => (
                  <div key={item.id} className="testimonials-slide">
                    {renderCard(item)}
                  </div>
                ))
              )}
            </div>
            {showArrowControls ? (
              <button type="button" data-editor-interactive="true" className="testimonials-arrow testimonials-arrow--next" onClick={() => scrollToPage(activePage + 1)} disabled={activePage >= pageCount - 1} aria-label="Next">
                Next
              </button>
            ) : null}
          </div>
          {showDotControls ? (
            <div className="testimonials-dots" role="tablist" aria-label="Testimonials navigation">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  data-editor-interactive="true"
                  className={classNames('testimonials-dot', index === activePage && 'is-active')}
                  onClick={() => scrollToPage(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : layout === 'highlight' ? (
        <div className="testimonials-highlight">
          {highlightItem ? renderCard(highlightItem, 'highlight') : emptyState}
          {highlightRest.length > 0 ? (
            <div className="testimonials-highlight-list">
              {highlightRest.map((item) => (
                <div key={item.id}>{renderCard(item, 'compact')}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="testimonials-grid" style={gridStyle}>
          {items.length === 0 ? emptyState : items.map((item) => (
            <div key={item.id}>{renderCard(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const renderDivider: RegistryView = ({ node }) => {
  const divider = node as DividerNode;
  const data = (divider.data ?? {}) as DividerNodeData;
  const orientation = data?.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const isVertical = orientation === 'vertical';
  const classes = classNames(
    'divider-component',
    isVertical ? 'divider-vertical h-full' : 'divider-horizontal w-full',
    'bg-slate-200',
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles) ?? {};
  const rawThickness = (node.styles as any)?.thickness;
  const thickness = normalizeThickness(rawThickness);
  const style: React.CSSProperties = {
    ...inline,
    flexShrink: 0,
  };
  if (isVertical) {
    style.width = thickness;
    style.minWidth = thickness;
    const rawHeight = (node.styles as any)?.height;
    if (typeof rawHeight === 'number' && Number.isFinite(rawHeight)) {
      style.height = `${rawHeight}px`;
    } else if (typeof rawHeight === 'string' && (/px|%/.test(rawHeight) || rawHeight.trim() === 'auto')) {
      style.height = rawHeight.trim();
    }
  } else {
    style.height = thickness;
    style.minHeight = thickness;
    const rawWidth = (node.styles as any)?.width;
    if (typeof rawWidth === 'number' && Number.isFinite(rawWidth)) {
      style.width = `${rawWidth}px`;
    } else if (typeof rawWidth === 'string' && (/px|%/.test(rawWidth) || rawWidth.trim() === 'auto')) {
      style.width = rawWidth.trim();
    }
  }
  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-divider-orientation={orientation}
      className={classes}
      style={style}
      aria-hidden="true"
    />
  );
};

const renderList: RegistryView = ({ node }) => {
  const list = node as ListNode;
  const data = (list.data ?? {}) as ListNodeData;
  const items = Array.isArray(data?.items)
    ? data.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (items.length === 0) return null;
  const ordered = data?.ordered === true;
  const classes = classNames(
    'list-component',
    ordered ? 'list-decimal' : 'list-disc',
    'pl-6',
    'space-y-2',
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles);
  const Tag = (ordered ? 'ol' : 'ul') as 'ol' | 'ul';
  return (
    <Tag
      data-node-id={node.id}
      data-node-type={node.type}
      data-list-ordered={ordered ? 'true' : 'false'}
      className={classes}
      style={inline}
    >
      {items.map((rawItem, index) => {
        const normalized = rawItem.replace(/\r/g, '');
        const lines = normalized.split(PARAGRAPH_LINE_BREAK);
        return (
          <li key={`item-${index}`} data-list-index={index} style={listItemBaseStyle}>
            {lines.map((line, lineIndex) => (
              <React.Fragment key={`line-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </li>
        );
      })}
    </Tag>
  );
};



const FORM_FIELD_WRAPPER_CLASS = 'form-field flex flex-col gap-1';
const FORM_FIELD_LABEL_CLASS = 'form-field-label text-sm font-medium text-text flex items-center gap-1';
const FORM_REQUIRED_BADGE_CLASS = 'form-field-required text-primary';
const FORM_CONTROL_BASE_CLASS =
  'form-control block w-full rounded-md border border-neutral bg-surface px-3 py-2 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-shadow duration-150';
const FORM_INPUT_CLASS = `${FORM_CONTROL_BASE_CLASS} form-input`;
const FORM_TEXTAREA_CLASS = `${FORM_CONTROL_BASE_CLASS} form-textarea resize-y`;
const FORM_SELECT_CLASS = `${FORM_CONTROL_BASE_CLASS} form-select cursor-pointer`;

function normalizeFieldLabel(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return fallback;
}

function normalizePlaceholder(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value;
  return undefined;
}

const renderInput: RegistryView = ({ node }) => {
  const input = node as InputNode;
  const data = (input.data ?? {}) as InputNodeData;
  const label = normalizeFieldLabel(data?.label, 'Input');
  const placeholder = normalizePlaceholder(data?.placeholder);
  const required = data?.required === true;
  const type: 'text' | 'email' | 'password' = data?.type === 'email' || data?.type === 'password' ? data.type : 'text';
  const controlId = `${node.id}-control`;
  const wrapperClass = classNames(FORM_FIELD_WRAPPER_CLASS, mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);

  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-field-kind="input"
      data-field-required={required ? 'true' : undefined}
      className={wrapperClass}
      style={inline}
    >
      <label htmlFor={controlId} className={FORM_FIELD_LABEL_CLASS}>
        {label}
        {required ? (
          <span aria-hidden="true" className={FORM_REQUIRED_BADGE_CLASS}>
            *
          </span>
        ) : null}
      </label>
      <input
        id={controlId}
        name={controlId}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-required={required ? true : undefined}
        className={FORM_INPUT_CLASS}
        defaultValue=""
      />
    </div>
  );
};

const renderTextarea: RegistryView = ({ node }) => {
  const textarea = node as TextareaNode;
  const data = (textarea.data ?? {}) as TextareaNodeData;
  const label = normalizeFieldLabel(data?.label, 'Textarea');
  const placeholder = normalizePlaceholder(data?.placeholder);
  const required = data?.required === true;
  let rows = 4;
  if (typeof data?.rows === 'number' && Number.isFinite(data.rows) && data.rows > 0) {
    rows = Math.max(1, Math.round(data.rows));
  }
  const controlId = `${node.id}-control`;
  const wrapperClass = classNames(FORM_FIELD_WRAPPER_CLASS, mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);

  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-field-kind="textarea"
      data-field-required={required ? 'true' : undefined}
      className={wrapperClass}
      style={inline}
    >
      <label htmlFor={controlId} className={FORM_FIELD_LABEL_CLASS}>
        {label}
        {required ? (
          <span aria-hidden="true" className={FORM_REQUIRED_BADGE_CLASS}>
            *
          </span>
        ) : null}
      </label>
      <textarea
        id={controlId}
        name={controlId}
        placeholder={placeholder}
        required={required}
        aria-required={required ? true : undefined}
        className={FORM_TEXTAREA_CLASS}
        rows={rows}
        defaultValue=""
      />
    </div>
  );
};

const renderSelect: RegistryView = ({ node }) => {
  const select = node as SelectNode;
  const data = (select.data ?? {}) as SelectNodeData;
  const label = normalizeFieldLabel(data?.label, 'Select');
  const required = data?.required === true;
  const controlId = `${node.id}-control`;
  const wrapperClass = classNames(FORM_FIELD_WRAPPER_CLASS, mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles);
  const rawOptions = Array.isArray(data?.options) ? data.options : [];
  const normalizedOptions = rawOptions.length > 0
    ? rawOptions.map((option, index) => {
      const value = typeof option?.value === 'string' && option.value.trim() !== '' ? option.value.trim() : `option-${index + 1}`;
      const optionLabel = typeof option?.label === 'string' && option.label.trim() !== '' ? option.label.trim() : value;
      return { value, label: optionLabel };
    })
    : [{ value: 'option-1', label: 'Option' }];
  const defaultValue = normalizedOptions[0]?.value ?? '';

  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-field-kind="select"
      data-field-required={required ? 'true' : undefined}
      className={wrapperClass}
      style={inline}
    >
      <label htmlFor={controlId} className={FORM_FIELD_LABEL_CLASS}>
        {label}
        {required ? (
          <span aria-hidden="true" className={FORM_REQUIRED_BADGE_CLASS}>
            *
          </span>
        ) : null}
      </label>
      <select
        id={controlId}
        name={controlId}
        className={FORM_SELECT_CLASS}
        required={required}
        aria-required={required ? true : undefined}
        defaultValue={defaultValue}
      >
        {normalizedOptions.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const renderImage: RegistryView = ({ node }) => {
  const image = node as ImageNode;
  const data = (image.data ?? {}) as ImageNodeData;
  const src = typeof data?.src === 'string' ? data.src.trim() : '';
  const alt = typeof data?.alt === 'string' ? data.alt : '';
  // Priority: styles.objectFit -> data.objectFit -> 'cover'
  const styleObjectFit = (node.styles as any)?.objectFit;
  const dataObjectFit = data?.objectFit ? IMAGE_OBJECT_FIT[data.objectFit] : 'cover';
  const finalObjectFit = styleObjectFit || dataObjectFit;

  const aspect = data?.aspect && IMAGE_ASPECT_PADDING[data.aspect] ? data.aspect : undefined;

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(() => (src ? 'loading' : 'error'));
  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  const onLoad = useCallback(() => setStatus('loaded'), []);
  const onError = useCallback(() => setStatus('error'), []);

  const classes = classNames('image-component', mapNodeStyles(node.styles));
  const inline = mapInlineStyles(node.styles) ?? {};

  // Extract wrapper-specific styles (dimensions, position) vs img-specific (objectFit)
  // We apply dimensions to wrapper to ensure aspect ratio works
  const wrapperStyle: React.CSSProperties = aspect
    ? { ...inline, position: inline.position ?? 'relative', width: inline.width ?? '100%', paddingBottom: IMAGE_ASPECT_PADDING[aspect] }
    : inline;

  const frameStyle: React.CSSProperties = aspect
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
    : { position: 'relative', width: '100%', height: inline.height ?? 'auto' };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: aspect ? '100%' : 'auto',
    objectFit: finalObjectFit as any,
    borderRadius: 'inherit',
    display: 'block',
    opacity: status === 'loaded' ? 1 : 0,
    transition: 'opacity 150ms ease-in-out',
  };
  const showSkeleton = status === 'loading';
  const showFallback = status === 'error';

  return (
    <div
      data-node-id={node.id}
      data-node-type={node.type}
      data-image-status={status}
      className={classes}
      style={wrapperStyle}
    >
      <div style={frameStyle}>
        {src && status !== 'error' ? (
          <img
            data-image-element="true"
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            style={imgStyle}
            onLoad={onLoad}
            onError={onError}
          />
        ) : null}
        {showSkeleton ? (
          <div data-image-skeleton="true" style={IMAGE_SKELETON_STYLE} aria-hidden="true" />
        ) : null}
        {showFallback ? (
          <div data-image-fallback="true" style={IMAGE_FALLBACK_STYLE}>
            <span>{alt || 'Image unavailable'}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const MAP_DEFAULT_ZOOM = 14;
const MAP_DEFAULT_HEIGHT = 320;

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeCoordinate(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return clampNumber(value, min, max);
}

function normalizeZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return MAP_DEFAULT_ZOOM;
  return clampNumber(Math.round(value), 1, 20);
}

function normalizeHeight(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return MAP_DEFAULT_HEIGHT;
  return Math.max(180, Math.round(value));
}

function buildOsmEmbedUrl(lat: number, lng: number, zoom: number): string {
  const z = normalizeZoom(zoom);
  const delta = 0.01 * Math.pow(2, 14 - z);
  const minLng = clampNumber(lng - delta, -180, 180);
  const maxLng = clampNumber(lng + delta, -180, 180);
  const minLat = clampNumber(lat - delta, -90, 90);
  const maxLat = clampNumber(lat + delta, -90, 90);
  const bbox = `${minLng.toFixed(6)},${minLat.toFixed(6)},${maxLng.toFixed(6)},${maxLat.toFixed(6)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function buildOsmLink(lat: number, lng: number, zoom: number): string {
  const z = normalizeZoom(zoom);
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=${z}/${lat.toFixed(6)}/${lng.toFixed(6)}`;
}

const renderMap: RegistryView = ({ node }) => {
  const mapNode = node as MapNode;
  const data = (mapNode.data ?? {}) as MapNodeData;
  const label = typeof data.label === 'string' && data.label.trim() !== '' ? data.label.trim() : 'Location';
  const address = typeof data.address === 'string' ? data.address.trim() : '';
  const lat = normalizeCoordinate(data.lat, -90, 90);
  const lng = normalizeCoordinate(data.lng, -180, 180);
  const zoom = normalizeZoom(data.zoom);
  const height = normalizeHeight(data.height);
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const embedSrc = hasCoords ? buildOsmEmbedUrl(lat, lng, zoom) : '';
  const directionsUrl = typeof data.directions_url === 'string' && data.directions_url.trim() !== ''
    ? data.directions_url.trim()
    : (hasCoords ? buildOsmLink(lat, lng, zoom) : '');

  const classes = classNames(
    'map-location grid gap-4 border border-muted rounded-lg p-4 bg-surface shadow-sm',
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles);

  return (
    <div data-node-id={node.id} data-node-type={node.type} className={classes} style={inline}>
      <div className="map-location-frame" style={{ height }}>
        {embedSrc ? (
          <iframe
            title={label}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="map-location-placeholder">Add latitude and longitude to show the map.</div>
        )}
      </div>
      <div className="map-location-details">
        <div className="map-location-label">{label}</div>
        {address ? (
          <div className="map-location-address">{address}</div>
        ) : (
          <div className="map-location-address text-muted">Address not set.</div>
        )}
        {directionsUrl ? (
          <a className="map-location-link" href={directionsUrl} target="_blank" rel="noopener noreferrer">
            Open map
          </a>
        ) : null}
      </div>
    </div>
  );
};

const HOURS_DAY_ORDER: Array<{ key: OpeningHoursEntry['day']; short: string; full: string }> = [
  { key: 'mon', short: 'Mon', full: 'Monday' },
  { key: 'tue', short: 'Tue', full: 'Tuesday' },
  { key: 'wed', short: 'Wed', full: 'Wednesday' },
  { key: 'thu', short: 'Thu', full: 'Thursday' },
  { key: 'fri', short: 'Fri', full: 'Friday' },
  { key: 'sat', short: 'Sat', full: 'Saturday' },
  { key: 'sun', short: 'Sun', full: 'Sunday' },
];

type NormalizedHoursEntry = {
  day: OpeningHoursEntry['day'];
  label: string;
  status: 'open' | 'closed' | 'unset';
  ranges: OpeningHoursRange[];
};

function normalizeHoursRanges(ranges: OpeningHoursRange[] | undefined): OpeningHoursRange[] {
  if (!Array.isArray(ranges)) return [];
  return ranges
    .map((range): OpeningHoursRange | null => {
      const start = typeof range?.start === 'string' ? range.start.trim() : '';
      const end = typeof range?.end === 'string' ? range.end.trim() : '';
      if (!start && !end) return null;
      return { start, end };
    })
    .filter((range): range is OpeningHoursRange => range !== null);
}

function normalizeHoursSchedule(data: OpeningHoursNodeData | undefined): NormalizedHoursEntry[] {
  const schedule = Array.isArray(data?.schedule) ? data?.schedule ?? [] : [];
  const byDay = new Map<string, OpeningHoursEntry>();
  schedule.forEach((entry) => {
    if (entry && typeof entry.day === 'string') {
      byDay.set(entry.day, entry);
    }
  });

  return HOURS_DAY_ORDER.map((day) => {
    const entry = byDay.get(day.key);
    const label = typeof entry?.label === 'string' && entry.label.trim() !== '' ? entry.label.trim() : day.short;
    const isClosed = entry?.is_closed === true;
    const ranges = normalizeHoursRanges(entry?.ranges);
    const hasCompleteRange = ranges.some((range) => range.start && range.end);
    const status = isClosed ? 'closed' : hasCompleteRange ? 'open' : 'unset';
    const validRanges = status === 'open'
      ? ranges.filter((range) => range.start && range.end)
      : [];
    return { day: day.key, label, status, ranges: validRanges };
  });
}

function formatRanges(ranges: OpeningHoursRange[]): string {
  if (!ranges.length) return '';
  return ranges
    .map((range) => {
      const start = range.start ?? '';
      const end = range.end ?? '';
      if (start && end) return `${start} - ${end}`;
      return start || end || '';
    })
    .filter(Boolean)
    .join(' / ');
}

function groupHours(entries: NormalizedHoursEntry[]): Array<{ label: string; status: NormalizedHoursEntry['status']; ranges: OpeningHoursRange[] }> {
  const groups: Array<{ label: string; status: NormalizedHoursEntry['status']; ranges: OpeningHoursRange[]; signature: string; start: string; end: string }> = [];
  entries.forEach((entry) => {
    const signature = `${entry.status}:${formatRanges(entry.ranges)}`;
    const last = groups[groups.length - 1];
    if (last && last.signature === signature) {
      last.end = entry.label;
      return;
    }
    groups.push({
      label: entry.label,
      status: entry.status,
      ranges: entry.ranges,
      signature,
      start: entry.label,
      end: entry.label,
    });
  });
  return groups.map((group) => {
    const label = group.start === group.end ? group.start : `${group.start} - ${group.end}`;
    return { label, status: group.status, ranges: group.ranges };
  });
}

const renderOpeningHours: RegistryView = ({ node }) => {
  const hoursNode = node as OpeningHoursNode;
  const data = (hoursNode.data ?? {}) as OpeningHoursNodeData;
  const title = typeof data.label === 'string' && data.label.trim() !== '' ? data.label.trim() : 'Opening hours';
  const groupDays = data.group_days !== false;
  const timezone = typeof data.timezone === 'string' && data.timezone.trim() !== '' ? data.timezone.trim() : '';
  const entries = normalizeHoursSchedule(data);
  const grouped = groupDays ? groupHours(entries) : entries.map((entry) => ({
    label: entry.label,
    status: entry.status,
    ranges: entry.ranges,
  }));

  const classes = classNames(
    'opening-hours border border-muted rounded-lg p-4 bg-surface shadow-sm',
    mapNodeStyles(node.styles),
  );
  const inline = mapInlineStyles(node.styles);

  return (
    <div data-node-id={node.id} data-node-type={node.type} className={classes} style={inline}>
      <div className="opening-hours-title">{title}</div>
      <div className="opening-hours-list">
        {grouped.map((entry, index) => (
          <div key={`hours-${index}`} className="opening-hours-row">
            <div className="opening-hours-day">{entry.label}</div>
            <div className="opening-hours-time">
              {entry.status === 'open' ? formatRanges(entry.ranges) : entry.status === 'closed' ? 'Closed' : 'Set hours'}
            </div>
          </div>
        ))}
      </div>
      {timezone ? <div className="opening-hours-meta">All times are in {timezone}.</div> : null}
    </div>
  );
};


const registry: Partial<Record<NodeType, RegistryView>> = {
  page: ({ node }) => (
    <div data-node-id={node.id} data-node-type={node.type} className={classNames('font-body', mapNodeStyles(node.styles))} style={mapInlineStyles(node.styles)}>
      {node.children.map((child) => (
        <Renderer key={child.id} nodeId={child.id} />
      ))}
    </div>
  ),
  header: ({ node }) => {
    const slots = (node as any)?.slots as { logo?: string[]; right?: string[] } | undefined;
    const logo = Array.isArray(slots?.logo) ? (slots!.logo as string[]) : [];
    const right = Array.isArray(slots?.right) ? (slots!.right as string[]) : [];
    if (!slots || !Array.isArray(slots.logo) || !Array.isArray(slots.right)) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`Header(${node.id}) missing slots.logo/right arrays; renders empty`);
      }
    }
    const headerData = ((node as any).data ?? {}) as HeaderNodeData;
    const navItems = Array.isArray(headerData.navItems) ? headerData.navItems : [];
    const layout: HeaderLayout = headerData.layout === 'side' ? 'side' : 'top';
    const mobile = headerData.mobile;
    // Optional style hooks: styles.nav.{container,nav,item,active,logo,right}
    const navStyles = (node.styles && typeof (node.styles as any)['nav'] === 'object') ? ((node.styles as any)['nav'] as Record<string, string>) : undefined;
    const logoNode = logo[0] ? <Renderer key={logo[0]} nodeId={logo[0]} /> : null;
    const rightNode = right[0] ? <Renderer key={right[0]} nodeId={right[0]} /> : null;
    return (
      <header data-node-id={node.id} data-node-type={node.type} className={mapNodeStyles(node.styles)} style={mapInlineStyles(node.styles)}>
        <NavBar logo={logoNode} items={navItems} right={rightNode} styles={navStyles} layout={layout} mobile={mobile} />
      </header>
    );
  },
  heading: renderHeading,
  paragraph: renderParagraph,
  list: renderList,
  card: renderCard,
  features: renderFeatures,
  gallery: renderGallery,
  slider: renderSlider,
  testimonials: renderTestimonials,
  button: renderButton,
  badge: renderBadge,
  divider: renderDivider,
  image: renderImage,
  input: renderInput,
  textarea: renderTextarea,
  select: renderSelect,
  map: renderMap,
  opening_hours: renderOpeningHours,
  menu_grid: ({ node }) => <MenuGrid node={node as MenuGridNode} />,
  cart: ({ node }) => <CartPanel node={node as CartNode} />,
  footer: ({ node }) => {
    const columns = (node as any)?.columns as Array<{ id: string; content: string[] }> | undefined;
    const cols = Array.isArray(columns) ? columns : [];
    if (!Array.isArray(columns)) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`Footer(${node.id}) missing columns[]; renders empty`);
      }
    }
    const data = ((node as any).data ?? {}) as { navItems?: NavItem[]; socialLinks?: SocialLink[]; legal?: FooterLegal };
    const navItems = Array.isArray(data.navItems) ? data.navItems : [];
    const socialLinks = Array.isArray(data.socialLinks) ? data.socialLinks : [];
    const legal = data.legal && typeof data.legal === 'object' ? data.legal : undefined;
    const legalLinks = Array.isArray(legal?.links) ? legal!.links! : [];
    const legalText = typeof legal?.text === 'string' ? legal.text : '';

    const hasTop = navItems.length > 0 || socialLinks.length > 0;
    const hasColumns = cols.length > 0;
    const hasLegal = legalLinks.length > 0 || legalText.trim() !== '';
    return (
      <footer data-node-id={node.id} data-node-type={node.type} className={mapNodeStyles(node.styles)} style={mapInlineStyles(node.styles)}>
        <div className="footer-shell">
          {hasTop ? (
            <div className="footer-top">
              {navItems.length > 0 ? <FooterLinkList items={navItems} /> : null}
              {socialLinks.length > 0 ? <FooterSocialLinks links={socialLinks} /> : null}
            </div>
          ) : null}
          {hasColumns ? (
            <div className="footer-columns" style={{ gridTemplateColumns: `repeat(${Math.max(1, cols.length || 1)}, minmax(0, 1fr))` }}>
              {cols.map((col) => (
                <div key={col.id} data-footer-col-id={col.id}>
                  {col.content.map((cid) => (
                    <Renderer key={cid} nodeId={cid} />
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {hasLegal ? (
            <div className="footer-bottom">
              {legalLinks.length > 0 ? <FooterLinkList items={legalLinks} compact /> : null}
              {legalText.trim() !== '' ? <div className="footer-legal-text">{legalText}</div> : null}
            </div>
          ) : null}
        </div>
      </footer>
    );
  },
  section: ({ node }) => <SectionComponent nodeId={node.id} />,
  container: ({ node }) => <ContainerComponent nodeId={node.id} />,
  row: ({ node }) => <RowComponent nodeId={node.id} />,
  column: ({ node }) => <ColumnComponent nodeId={node.id} />,
};

function resolveComponentFromRegistry(type: NodeType): RegistryView | undefined {
  return registry[type];
}

// -----------------------------
// Dev Unknown helpers
// -----------------------------
const Unknown: React.FC<{ type: string; id: string }> = ({ type, id }) => (
  <DevBox text={`Unknown type: ${type} (id: ${id})`} />
);

const DevBox: React.FC<{ text: string }> = ({ text }) => (
  <div
    data-dev-box="true"
    style={{ padding: 4, border: '1px dashed #999', color: '#555', fontSize: 12 }}
    dangerouslySetInnerHTML={{ __html: text }}
  />
);

// Lightweight NavBar with navigation and active state
type NavBarStyles = { container?: string; nav?: string; item?: string; active?: string; logo?: string; right?: string; toggle?: string; panel?: string };
type NavBarProps = {
  logo: React.ReactNode;
  items: NavItem[];
  right: React.ReactNode;
  styles?: NavBarStyles;
  layout?: HeaderLayout;
  mobile?: { behavior?: MobileNavBehavior; label?: string };
};
const NavBar: React.FC<NavBarProps> = ({ logo, items, right, styles, layout = 'top', mobile }) => {
  const { currentPath, navigate } = useNav();
  const inRouter = useInRouterContext();
  const activePath = normalizePath(currentPath);
  const tokenClasses = mapNavTokensToClasses(theme01Tokens.nav);
  const navId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const layoutMode: HeaderLayout = layout === 'side' ? 'side' : 'top';
  const mobileBehavior: MobileNavBehavior = mobile?.behavior ?? (layoutMode === 'side' ? 'drawer' : 'collapse');
  const toggleLabel = typeof mobile?.label === 'string' && mobile.label.trim() !== '' ? mobile.label.trim() : 'Menu';
  const hasItems = Array.isArray(items) && items.length > 0;

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const buildClassName = (isActive: boolean) =>
    classNames(
      'nav-link',
      tokenClasses.base,
      tokenClasses.hover,
      tokenClasses.focus,
      styles?.item,
      isActive && tokenClasses.active,
      isActive && styles?.active,
      isActive && 'nav-link--active',
    );

  const createKeydownHandler = useCallback(
    (activate: (event: React.KeyboardEvent<HTMLAnchorElement>) => void) =>
      (event: React.KeyboardEvent<HTMLAnchorElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(event);
        }
      },
    [],
  );

  const renderRouteItem = (item: RouteNavItem, index: number) => {
    const href = resolveHref(item) ?? '/';
    const itemPath = normalizePath(href);
    const isActive = itemPath === activePath;
    const dataActive = isActive ? 'true' : undefined;
    if (inRouter) {
      return (
        <NavLink
          key={item.id ?? `route-${index}`}
          to={href}
          end
          data-nav-item-id={item.id}
          data-active={dataActive}
          aria-current={isActive ? 'page' : undefined}
          className={buildClassName(isActive)}
          onClick={closeMenu}
          onKeyDown={createKeydownHandler(() => {
            navigate(href);
            closeMenu();
          })}
        >
          {item.label}
        </NavLink>
      );
    }
    return (
      <a
        key={item.id ?? `route-${index}`}
        data-nav-item-id={item.id}
        data-active={dataActive}
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={buildClassName(isActive)}
        onClick={(e) => {
          e.preventDefault();
          navigate(href);
          closeMenu();
        }}
        onKeyDown={createKeydownHandler(() => {
          navigate(href);
          closeMenu();
        })}
      >
        {item.label}
      </a>
    );
  };

  const renderUrlItem = (item: UrlNavItem, index: number) => {
    const href = resolveHref(item) ?? '#';
    const target = item.newTab ? '_blank' : undefined;
    const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
    const dataActive = href.startsWith('/') && normalizePath(href) === activePath ? 'true' : undefined;
    return (
      <a
        key={item.id ?? `url-${index}`}
        data-nav-item-id={item.id}
        data-active={dataActive}
        href={href}
        target={target}
        rel={rel}
        className={buildClassName(false)}
        onClick={closeMenu}
        onKeyDown={createKeydownHandler((event) => {
          event.currentTarget.click();
          closeMenu();
        })}
      >
        {item.label}
      </a>
    );
  };

  const shellClass = classNames(
    'nav-shell',
    layoutMode === 'side' ? 'nav-shell--side' : 'nav-shell--top',
    mobileBehavior === 'drawer' ? 'nav-shell--drawer' : 'nav-shell--collapse',
    isOpen && 'nav-shell--open',
    styles?.container,
  );

  return (
    <div className={shellClass} data-layout={layoutMode} data-mobile={mobileBehavior}>
      {mobileBehavior === 'drawer' && isOpen ? (
        <button type="button" className="nav-backdrop" onClick={closeMenu} aria-label="Close menu" />
      ) : null}
      <div className="nav-bar">
        <div data-slot="logo" className={classNames('nav-logo', styles?.logo)}>{logo}</div>
        {hasItems ? (
          <button
            type="button"
            className={classNames('nav-toggle', styles?.toggle)}
            aria-controls={navId}
            aria-expanded={isOpen}
            onClick={toggleMenu}
          >
            {toggleLabel}
          </button>
        ) : null}
        <div data-slot="right" className={classNames('nav-right', styles?.right)}>{right}</div>
      </div>
      {hasItems ? (
        <nav id={navId} data-role="navbar" className={classNames('nav-panel', styles?.nav, styles?.panel)}>
          {items.map((item, index) => {
            if (!item) return null;
            if ((item as any).kind === 'route') {
              return renderRouteItem(item as RouteNavItem, index);
            }
            if ((item as any).kind === 'url') {
              return renderUrlItem(item as UrlNavItem, index);
            }
            const href = resolveHref(item) ?? '#';
            const fallbackTarget = resolveAnchorTarget(item);
            const isActive = href.startsWith('/') && normalizePath(href) === activePath;
            return (
              <a
                key={(item as any).id ?? `nav-${index}`}
                data-nav-item-id={(item as any).id ?? `nav-${index}`}
                data-active={isActive ? 'true' : undefined}
                href={href}
                target={fallbackTarget ?? undefined}
                className={buildClassName(isActive)}
                onClick={closeMenu}
                onKeyDown={createKeydownHandler((event) => {
                  event.currentTarget.click();
                  closeMenu();
                })}
              >
                {(item as any).label ?? href}
              </a>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
};

const FooterLinkList: React.FC<{ items: NavItem[]; compact?: boolean }> = ({ items, compact }) => {
  const { currentPath, navigate } = useNav();
  const inRouter = useInRouterContext();
  const activePath = normalizePath(currentPath);
  const tokenClasses = mapNavTokensToClasses(theme01Tokens.nav);

  const buildClassName = (isActive: boolean) =>
    classNames(
      'footer-link',
      tokenClasses.base,
      tokenClasses.hover,
      tokenClasses.focus,
      isActive && tokenClasses.active,
      compact && 'footer-link-compact',
    );

  const createKeydownHandler = (activate: (event: React.KeyboardEvent<HTMLAnchorElement>) => void) =>
    (event: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(event);
      }
    };

  return (
    <div className={classNames('footer-links', compact && 'footer-links-compact')}>
      {items.map((item, index) => {
        if (!item) return null;
        const href = resolveHref(item) ?? '#';
        const isActive = href.startsWith('/') && normalizePath(href) === activePath;
        if ((item as any).kind === 'route') {
          if (inRouter) {
            return (
              <NavLink
                key={item.id ?? `footer-route-${index}`}
                to={href}
                end
                data-nav-item-id={item.id}
                className={buildClassName(isActive)}
                aria-current={isActive ? 'page' : undefined}
                onKeyDown={createKeydownHandler(() => navigate(href))}
              >
                {(item as any).label ?? href}
              </NavLink>
            );
          }
          return (
            <a
              key={item.id ?? `footer-route-${index}`}
              data-nav-item-id={item.id}
              href={href}
              className={buildClassName(isActive)}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(href);
              }}
              onKeyDown={createKeydownHandler(() => navigate(href))}
            >
              {(item as any).label ?? href}
            </a>
          );
        }
        const target = resolveAnchorTarget(item);
        const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
        return (
          <a
            key={item.id ?? `footer-url-${index}`}
            data-nav-item-id={item.id}
            href={href}
            target={target}
            rel={rel}
            className={buildClassName(false)}
            onKeyDown={createKeydownHandler((event) => event.currentTarget.click())}
          >
            {(item as any).label ?? href}
          </a>
        );
      })}
    </div>
  );
};

const FooterSocialLinks: React.FC<{ links: SocialLink[] }> = ({ links }) => {
  const normalized = links.filter((link) => typeof link?.href === 'string' && link.href.trim() !== '');
  if (normalized.length === 0) return null;
  return (
    <div className="footer-social">
      {normalized.map((link) => {
        const platform = (SOCIAL_PLATFORM_LABELS as any)[link.platform] ? link.platform : 'website';
        const label = (typeof link.label === 'string' && link.label.trim() !== '')
          ? link.label.trim()
          : SOCIAL_PLATFORM_LABELS[platform];
        const target = link.newTab === false ? undefined : '_blank';
        const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
        return (
          <a
            key={link.id}
            href={link.href}
            className="footer-social-link"
            aria-label={label}
            title={label}
            target={target}
            rel={rel}
          >
            <span className="footer-social-icon" data-platform={platform}>
              {SOCIAL_PLATFORM_BADGES[platform]}
            </span>
          </a>
        );
      })}
    </div>
  );
};


// -----------------------------
// DnD wrapper
// -----------------------------
const WithDnD: React.FC<{ nodeId: string; children: React.ReactNode }> = ({ nodeId, children }) => {
  // In SSR (publish), skip all editor UI — render only the content
  const isSSR = typeof window === 'undefined';
  if (isSSR) return <>{children}</>;

  const snapshot = useBlueprintRoot();
  const { wrapInContainer, moveNode, wrapAndMove } = useBlueprintActions();
  const { state, beginDrag, endDrag } = useDnd();

  const path = selectPath(snapshot.root, nodeId);
  const isRoot = !path || path.idPath.length === 1;
  const parentId = !isRoot ? path!.idPath[path!.idPath.length - 2] : undefined;
  const selfIndex = !isRoot ? path!.indexPath[path!.indexPath.length - 1] : -1;

  const onDragStart = useCallback((e: React.DragEvent) => {
    if (isRoot) return;
    e.dataTransfer.effectAllowed = 'move';
    beginDrag(nodeId);
  }, [isRoot, beginDrag, nodeId]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!state.draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [state.draggingId]);

  const dropBefore = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (selfIndex === -1) { endDrag(); return; }
    if (state.sourceParentId && typeof state.sourceIndex === 'number' && parentId && moveNode) {
      const fromParentId = state.sourceParentId;
      const fromIndex = state.sourceIndex;
      const toParentId = parentId;
      let toIndex = selfIndex;
      if (fromParentId === toParentId && fromIndex < toIndex) toIndex -= 1;
      moveNode(fromParentId, fromIndex, toParentId, toIndex);
    }
    endDrag();
  }, [parentId, state.sourceParentId, state.sourceIndex, selfIndex, endDrag, moveNode]);

  const dropAfter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (selfIndex === -1) { endDrag(); return; }
    if (state.sourceParentId && typeof state.sourceIndex === 'number' && parentId && moveNode) {
      const fromParentId = state.sourceParentId;
      const fromIndex = state.sourceIndex;
      const toParentId = parentId;
      let toIndex = selfIndex + 1;
      if (fromParentId === toParentId && fromIndex < toIndex) toIndex -= 1;
      moveNode(fromParentId, fromIndex, toParentId, toIndex);
    }
    endDrag();
  }, [parentId, state.sourceParentId, state.sourceIndex, selfIndex, endDrag, moveNode]);

  const dropInside = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const targetNode = selectNodeById(snapshot.root, nodeId);
    if (state.draggingId && state.draggingId !== nodeId) {
      if (!targetNode) { endDrag(); return; }
      if (targetNode.type === 'component') {
        if (wrapAndMove) wrapAndMove(nodeId, state.draggingId);
      } else if (moveNode && state.sourceParentId != null && state.sourceIndex != null) {
        const toParentId = nodeId;
        const toIndex = targetNode.children.length;
        moveNode(state.sourceParentId, state.sourceIndex, toParentId, toIndex);
      }
    } else if (wrapInContainer) {
      wrapInContainer(nodeId);
    }
    endDrag();
  }, [state.draggingId, nodeId, wrapInContainer, snapshot.root, endDrag, moveNode, wrapAndMove]);

  const handleStyles: React.CSSProperties = {
    display: isRoot ? 'none' : 'inline-block',
    cursor: 'grab',
    fontSize: 10,
    padding: '2px 4px',
    background: '#eee',
    border: '1px solid #ccc',
    borderRadius: 3,
    position: 'absolute',
    top: -10,
    left: -10,
    zIndex: 2,
  };
  const zoneStylesBase: React.CSSProperties = { height: 6, background: 'transparent' };
  const zoneHot: React.CSSProperties = { background: '#7db3ff66' };
  const insideZoneStyles: React.CSSProperties = { height: 18, textAlign: 'center', fontSize: 10, color: '#555' };

  return (
    <div style={{ position: 'relative' }}>
      {/* Before drop zone */}
      <div
        data-drop-zone="before"
        onDragOver={onDragOver}
        onDrop={dropBefore}
        style={{ ...zoneStylesBase, ...(state.draggingId ? zoneHot : {}) }}
      />

      {/* Drag handle */}
      <span draggable={!isRoot} onDragStart={onDragStart} style={handleStyles} title="Drag">
        ↕
      </span>

      {/* Node content */}
      {children}

      {/* Inside drop zone - wraps target in container */}
      <div
        data-drop-zone="inside"
        onDragOver={onDragOver}
        onDrop={dropInside}
        style={{ ...insideZoneStyles, ...(state.draggingId ? zoneHot : {}) }}
      >
        داخل (يلف في Container)
      </div>

      {/* After drop zone */}
      <div
        data-drop-zone="after"
        onDragOver={onDragOver}
        onDrop={dropAfter}
        style={{ ...zoneStylesBase, ...(state.draggingId ? zoneHot : {}) }}
      />
    </div>
  );
};
