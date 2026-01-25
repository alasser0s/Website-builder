export type NodeType =
  | 'page'
  | 'header'
  | 'section'
  | 'footer'
  | 'container'
  | 'row'
  | 'column'
  | 'component'
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'button'
  | 'badge'
  | 'divider'
  | 'card'
  | 'features'
  | 'gallery'
  | 'slider'
  | 'testimonials'
  | 'input'
  | 'textarea'
  | 'select'
  | 'map'
  | 'opening_hours'
  | 'menu_grid'
  | 'cart';

// Path from root to a target node represented as node ids
export type NodePath = string[];

export interface BlueprintNodeData {
  // Arbitrary data payload for the node
  [key: string]: unknown;
}

export interface BlueprintNodeStyles {
  // Arbitrary style payload for the node
  [key: string]: unknown;
}

export interface BaseBlueprintNode {
  id: string;
  type: NodeType;
  data?: BlueprintNodeData;
  styles?: BlueprintNodeStyles;
  children: BlueprintNode[];
}

export type RouteNavItem = {
  id: string;
  label: string;
  kind: 'route';
  slug: string;
};

export type UrlNavItem = {
  id: string;
  label: string;
  kind: 'url';
  href: string;
  newTab?: boolean;
};

export type NavItem = RouteNavItem | UrlNavItem;

export type HeaderLayout = 'top' | 'side';
export type MobileNavBehavior = 'drawer' | 'collapse';

export type HeaderMobileConfig = {
  behavior?: MobileNavBehavior;
  label?: string;
};

export type HeaderNodeData = {
  navItems?: NavItem[];
  layout?: HeaderLayout;
  mobile?: HeaderMobileConfig;
};

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'tiktok'
  | 'snapchat'
  | 'youtube'
  | 'whatsapp'
  | 'linkedin'
  | 'website';

export type SocialLink = {
  id: string;
  platform: SocialPlatform;
  href: string;
  label?: string;
  newTab?: boolean;
};

export type FooterLegal = {
  text?: string;
  links?: NavItem[];
};

export type FooterNodeData = {
  navItems?: NavItem[];
  socialLinks?: SocialLink[];
  legal?: FooterLegal;
};

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingAlignment = 'start' | 'center' | 'end';

export interface HeadingNodeData {
  text: string;
  level: HeadingLevel;
  align?: HeadingAlignment;
  href?: ButtonHref;
}

export interface HeadingNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'heading';
  data?: BlueprintNodeData & HeadingNodeData;
  children: [];
}

export interface ParagraphNodeData {
  text: string;
  href?: ButtonHref;
}

export interface ParagraphNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'paragraph';
  data?: BlueprintNodeData & ParagraphNodeData;
  children: [];
}

export interface ListNodeData {
  items: string[];
  ordered?: boolean;
}

export interface ListNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'list';
  data?: BlueprintNodeData & ListNodeData;
  children: [];
}

export interface ImageNodeData {
  src: string;
  alt: string;
  objectFit?: 'cover' | 'contain';
  aspect?: '1:1' | '4:3' | '16:9';
}

export interface ImageNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'image';
  data?: BlueprintNodeData & ImageNodeData;
  children: [];
}

export type ButtonHref =
  | { kind: 'route'; slug: string }
  | { kind: 'url'; href: string; newTab?: boolean };

export interface ButtonNodeData {
  label: string;
  href?: ButtonHref;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
  iconLeft?: string;
  iconRight?: string;
}

export interface ButtonNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'button';
  data?: BlueprintNodeData & ButtonNodeData;
  children: [];
}

export interface BadgeNodeData {
  text: string;
  variant?: 'solid' | 'outline' | 'ghost';
}

export interface BadgeNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'badge';
  data?: BlueprintNodeData & BadgeNodeData;
  children: [];
}

export interface DividerNodeData {
  orientation: 'horizontal' | 'vertical';
}

export interface DividerNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'divider';
  data?: BlueprintNodeData & DividerNodeData;
  children: [];
}

export interface CardMedia {
  src: string;
  alt: string;
}

export interface CardAction {
  label: string;
  href?: ButtonHref;
}

export interface CardNodeData {
  title?: string;
  body?: string;
  media?: CardMedia;
  actions?: CardAction[];
}

export interface CardNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'card';
  data?: BlueprintNodeData & CardNodeData;
  children: [];
}

export type FeatureImage = {
  src: string;
  alt?: string;
};

export type FeatureItem = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  image?: FeatureImage;
};

export type FeaturesLayout = 'grid' | 'stacked' | 'icon-left';

export interface FeaturesNodeData {
  title?: string;
  subtitle?: string;
  layout?: FeaturesLayout;
  columns?: number;
  items?: FeatureItem[];
}

export interface FeaturesNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'features';
  data?: BlueprintNodeData & FeaturesNodeData;
  children: [];
}

export type MediaItem = {
  id: string;
  src: string;
  alt?: string;
  caption?: string;
};

export type MediaAspect = '1:1' | '4:3' | '16:9';

export interface GalleryNodeData {
  title?: string;
  subtitle?: string;
  columns?: number;
  aspect?: MediaAspect;
  items?: MediaItem[];
}

export interface GalleryNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'gallery';
  data?: BlueprintNodeData & GalleryNodeData;
  children: [];
}

export interface SliderNodeData {
  title?: string;
  subtitle?: string;
  per_view?: number;
  show_arrows?: boolean;
  show_dots?: boolean;
  auto_play?: boolean;
  auto_play_interval?: number;
  aspect?: MediaAspect;
  items?: MediaItem[];
}

export interface SliderNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'slider';
  data?: BlueprintNodeData & SliderNodeData;
  children: [];
}

export type TestimonialAvatar = {
  src: string;
  alt?: string;
};

export type TestimonialItem = {
  id: string;
  name: string;
  text: string;
  rating?: number;
  avatar?: TestimonialAvatar;
  role?: string;
  source?: string;
};

export type TestimonialsLayout = 'grid' | 'slider' | 'highlight';

export interface TestimonialsNodeData {
  title?: string;
  subtitle?: string;
  layout?: TestimonialsLayout;
  columns?: number;
  per_view?: number;
  show_arrows?: boolean;
  show_dots?: boolean;
  items?: TestimonialItem[];
}

export interface TestimonialsNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'testimonials';
  data?: BlueprintNodeData & TestimonialsNodeData;
  children: [];
}

export interface InputNodeData {
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password';
}

export interface TextareaNodeData {
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectNodeData {
  label: string;
  options: SelectOption[];
  required?: boolean;
}

export interface InputNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'input';
  data?: BlueprintNodeData & InputNodeData;
  children: [];
}

export interface TextareaNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'textarea';
  data?: BlueprintNodeData & TextareaNodeData;
  children: [];
}

export interface SelectNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'select';
  data?: BlueprintNodeData & SelectNodeData;
  children: [];
}

export interface MapNodeData {
  label?: string;
  address?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: number;
  directions_url?: string;
}

export interface MapNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'map';
  data?: BlueprintNodeData & MapNodeData;
  children: [];
}

export type OpeningHoursDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface OpeningHoursRange {
  start?: string;
  end?: string;
}

export interface OpeningHoursEntry {
  day: OpeningHoursDay;
  label?: string;
  is_closed?: boolean;
  ranges?: OpeningHoursRange[];
}

export interface OpeningHoursNodeData {
  label?: string;
  timezone?: string;
  group_days?: boolean;
  schedule?: OpeningHoursEntry[];
  special_hours?: Record<string, unknown>;
}

export interface OpeningHoursNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'opening_hours';
  data?: BlueprintNodeData & OpeningHoursNodeData;
  children: [];
}

export interface MenuGridNodeData {
  title?: string;
  subtitle?: string;
  columns?: number;
  show_images?: boolean;
  show_prices?: boolean;
  show_add_to_cart?: boolean;
  show_badges?: boolean;
  show_category_tabs?: boolean;
  category_filter?: number[];
  domain?: string;
  api_base?: string;
}

export interface MenuGridNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'menu_grid';
  data?: BlueprintNodeData & MenuGridNodeData;
  children: [];
}

export interface CartNodeData {
  title?: string;
  empty_text?: string;
  checkout_label?: string;
  payment_method?: 'card' | 'pay_on_pickup';
  success_url?: string;
  cancel_url?: string;
  domain?: string;
  api_base?: string;
}

export interface CartNode extends Omit<BaseBlueprintNode, 'type' | 'children'> {
  type: 'cart';
  data?: BlueprintNodeData & CartNodeData;
  children: [];
}

export interface HeaderNode extends Omit<BaseBlueprintNode, 'type'> {
  type: 'header';
  // Single-item slots: each must contain 0 or 1 child id
  slots: { logo: string[]; right: string[] };
  // Navigation items live in data, not children
  data?: BlueprintNodeData & HeaderNodeData;
}

export interface FooterNode extends Omit<BaseBlueprintNode, 'type'> {
  type: 'footer';
  // Optional nav items in footer (data-driven, no children)
  data?: BlueprintNodeData & FooterNodeData;
  columns: Array<{ id: string; content: string[] }>;
}

export interface GeneralNode extends Omit<BaseBlueprintNode, 'type'> {
  type: Exclude<NodeType, 'header' | 'footer' | 'heading' | 'paragraph' | 'list' | 'image' | 'button' | 'badge' | 'divider' | 'card' | 'features' | 'gallery' | 'slider' | 'testimonials' | 'input' | 'textarea' | 'select' | 'map' | 'opening_hours' | 'menu_grid' | 'cart'>;
}

export type BlueprintNode =
  | HeaderNode
  | FooterNode
  | HeadingNode
  | ParagraphNode
  | ListNode
  | ImageNode
  | ButtonNode
  | BadgeNode
  | DividerNode
  | CardNode
  | FeaturesNode
  | GalleryNode
  | SliderNode
  | TestimonialsNode
  | InputNode
  | TextareaNode
  | SelectNode
  | MapNode
  | OpeningHoursNode
  | MenuGridNode
  | CartNode
  | GeneralNode;

export interface BlueprintStateSnapshot {
  root: BlueprintNode; // must always be type 'page'
}

export interface HistoryState {
  past: BlueprintStateSnapshot[];
  present: BlueprintStateSnapshot;
  future: BlueprintStateSnapshot[];
}

export type BlueprintAction =
  | { type: 'ADD_COMPONENT'; parentId: string; node: BlueprintNode; index?: number }
  | { type: 'UPDATE_DATA'; nodeId: string; data: Partial<BlueprintNodeData> }
  | { type: 'UPDATE_STYLES'; nodeId: string; styles: Partial<BlueprintNodeStyles> }
  | { type: 'REORDER'; parentId: string; from: number; to: number }
  | { type: 'MOVE_NODE'; fromParentId: string; fromIndex: number; toParentId: string; toIndex: number }
  | { type: 'WRAP_IN_CONTAINER'; nodeId: string; containerType: Extract<NodeType, 'container'> }
  | { type: 'WRAP_AND_MOVE'; targetId: string; draggingId: string; containerType: Extract<NodeType, 'container'>; toIndex?: number }
  | { type: 'REMOVE'; nodeId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Header slots operations (single-item slots: logo/right)
  | { type: 'ADD_TO_HEADER_SLOT'; headerId: string; slot: 'logo' | 'right'; node: BlueprintNode }
  | { type: 'REMOVE_FROM_HEADER_SLOT'; headerId: string; slot: 'logo' | 'right'; nodeId?: string }
  // Header navItems operations (pure data DnD)
  | { type: 'ADD_NAV_ITEM'; headerId: string; item: NavItem; index?: number }
  | { type: 'UPDATE_NAV_ITEM'; headerId: string; itemId: string; patch: Partial<NavItem> }
  | { type: 'REMOVE_NAV_ITEM'; headerId: string; itemId: string }
  | { type: 'REORDER_NAV_ITEMS'; headerId: string; from: number; to: number }
  // Footer columns definition and content operations
  | { type: 'ADD_FOOTER_COLUMN'; footerId: string; columnId?: string; index?: number }
  | { type: 'REMOVE_FOOTER_COLUMN'; footerId: string; columnId: string }
  | { type: 'ADD_TO_FOOTER_COLUMN'; footerId: string; columnId: string; node: BlueprintNode; index?: number }
  | { type: 'REORDER_FOOTER_COLUMN'; footerId: string; columnId: string; from: number; to: number }
  | { type: 'REMOVE_FROM_FOOTER_COLUMN'; footerId: string; columnId: string; nodeId: string }
  | { type: 'HYDRATE'; snapshot: BlueprintStateSnapshot };

export interface SelectPathResult {
  // Path represented as node id list from root to target
  idPath: string[];
  // Index path represents position of each node inside its parent children array
  indexPath: number[];
}
