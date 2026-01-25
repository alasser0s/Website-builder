import type { BlueprintNode, FooterNode, HeaderNode, NavItem, NodeType } from '../foundation/types';
import { generateNodeId } from '../foundation/id';

type PresetFactory = () => BlueprintNode;
type InsertPosition = 'beforeFooter' | 'start' | 'end';

export type BlockPreset = {
  id: string;
  label: string;
  description?: string;
  factory: PresetFactory;
  insert?: InsertPosition;
  singletonType?: NodeType;
};

export type BlockSection = {
  id: string;
  title: string;
  items: BlockPreset[];
};

function makeNode(type: BlueprintNode['type'], data?: Record<string, unknown>, styles?: Record<string, unknown>): BlueprintNode {
  return {
    id: generateNodeId(type),
    type,
    data,
    styles,
    children: [],
  } as BlueprintNode;
}

function attachContent(parent: BlueprintNode, children: BlueprintNode[]) {
  parent.children = children;
  (parent as any).content = children.map((child) => child.id);
  return parent;
}

function makeSection(children: BlueprintNode[], styles?: Record<string, unknown>) {
  const section = makeNode('section', undefined, styles);
  return attachContent(section, children);
}

function makeContainer(children: BlueprintNode[], maxWidth = 'full', styles?: Record<string, unknown>) {
  const container = makeNode('container', { maxWidth }, styles);
  return attachContent(container, children);
}

function makeRow(columns: Array<{ span: number; content: BlueprintNode[] }>) {
  const row = makeNode('row');
  const rowChildren: BlueprintNode[] = [];
  const rowColumns = columns.map((col) => {
    col.content.forEach((child) => rowChildren.push(child));
    return { span: col.span, offset: 0, content: col.content.map((child) => child.id) };
  });
  row.children = rowChildren;
  (row as any).columns = rowColumns;
  return row;
}

function makeNavItem(label: string, slug: string): NavItem {
  return { id: generateNodeId('nav'), label, kind: 'route', slug };
}

function makeHeading(text: string, level = 2, align?: 'start' | 'center' | 'end'): BlueprintNode {
  const data: Record<string, unknown> = { text, level };
  if (align) data.align = align;
  return makeNode('heading', data);
}

function makeParagraph(text: string, styles?: Record<string, unknown>): BlueprintNode {
  return makeNode('paragraph', { text }, styles);
}

function makeButton(label: string, href: string, variant?: 'solid' | 'outline' | 'ghost'): BlueprintNode {
  const data: Record<string, unknown> = { label };
  if (href) data.href = { kind: 'url', href };
  if (variant) data.variant = variant;
  return makeNode('button', data);
}

function makeImage(src: string, alt: string): BlueprintNode {
  return makeNode('image', { src, alt });
}

function makeList(items: string[]): BlueprintNode {
  return makeNode('list', { items });
}

function makeBadge(text: string, variant: 'solid' | 'outline' | 'ghost' = 'solid'): BlueprintNode {
  return makeNode('badge', { text, variant });
}

function makeDivider(orientation: 'horizontal' | 'vertical' = 'horizontal'): BlueprintNode {
  return makeNode('divider', { orientation });
}

function makeCard(title: string, body: string, href = '#menu'): BlueprintNode {
  return makeNode('card', {
    title,
    body,
    actions: [{ label: 'Learn more', href: { kind: 'url', href } }],
  });
}

function makeInput(label: string, placeholder?: string, type?: 'text' | 'email' | 'password'): BlueprintNode {
  const data: Record<string, unknown> = { label };
  if (placeholder) data.placeholder = placeholder;
  if (type) data.type = type;
  return makeNode('input', data);
}

function makeTextarea(label: string, placeholder?: string, rows?: number): BlueprintNode {
  const data: Record<string, unknown> = { label };
  if (placeholder) data.placeholder = placeholder;
  if (rows) data.rows = rows;
  return makeNode('textarea', data);
}

function makeSelect(label: string, options: Array<{ label: string; value: string }>): BlueprintNode {
  return makeNode('select', { label, options });
}

function makeMap(label: string, address: string, lat: number, lng: number): BlueprintNode {
  return makeNode('map', {
    label,
    address,
    lat,
    lng,
    zoom: 14,
    height: 320,
  });
}

function makeFeatures(layout: 'grid' | 'stacked' | 'icon-left', items: Array<{ title: string; description: string; icon?: string }>, columns?: number): BlueprintNode {
  return makeNode('features', {
    title: 'Why customers choose us',
    subtitle: 'Highlight the benefits that matter most.',
    layout,
    columns,
    items: items.map((item) => ({
      id: generateNodeId('feature'),
      title: item.title,
      description: item.description,
      icon: item.icon,
    })),
  });
}

function makeGallery(items: Array<{ src: string; alt: string; caption?: string }>, columns = 3): BlueprintNode {
  return makeNode('gallery', {
    title: 'Gallery',
    subtitle: 'Showcase signature dishes and moments.',
    columns,
    aspect: '4:3',
    items: items.map((item) => ({
      id: generateNodeId('media'),
      src: item.src,
      alt: item.alt,
      caption: item.caption,
    })),
  });
}

function makeSlider(items: Array<{ src: string; alt: string; caption?: string }>, perView = 1): BlueprintNode {
  return makeNode('slider', {
    title: 'Highlights',
    subtitle: 'Swipe through featured visuals.',
    per_view: perView,
    show_arrows: true,
    show_dots: true,
    aspect: '16:9',
    items: items.map((item) => ({
      id: generateNodeId('media'),
      src: item.src,
      alt: item.alt,
      caption: item.caption,
    })),
  });
}

function makeTestimonials(
  layout: 'grid' | 'slider' | 'highlight',
  items: Array<{ name: string; text: string; rating?: number; role?: string; source?: string; avatar?: { src: string; alt?: string } }>,
  options?: { columns?: number; per_view?: number; show_arrows?: boolean; show_dots?: boolean },
): BlueprintNode {
  const data: Record<string, unknown> = {
    title: 'Customer reviews',
    subtitle: 'What guests are saying about your food.',
    layout,
    items: items.map((item) => ({
      id: generateNodeId('testimonial'),
      name: item.name,
      text: item.text,
      rating: item.rating,
      role: item.role,
      source: item.source,
      avatar: item.avatar,
    })),
  };
  if (options?.columns) data.columns = options.columns;
  if (options?.per_view) data.per_view = options.per_view;
  if (options?.show_arrows !== undefined) data.show_arrows = options.show_arrows;
  if (options?.show_dots !== undefined) data.show_dots = options.show_dots;
  return makeNode('testimonials', data);
}

function makeOpeningHours(): BlueprintNode {
  const weekday = { start: '09:00', end: '21:00' };
  const weekend = { start: '10:00', end: '22:00' };
  return makeNode('opening_hours', {
    label: 'Opening hours',
    group_days: true,
    schedule: [
      { day: 'mon', ranges: [weekday] },
      { day: 'tue', ranges: [weekday] },
      { day: 'wed', ranges: [weekday] },
      { day: 'thu', ranges: [weekday] },
      { day: 'fri', ranges: [weekday] },
      { day: 'sat', ranges: [weekend] },
      { day: 'sun', ranges: [weekend] },
    ],
  });
}

function makeHeader(): BlueprintNode {
  const logo = makeHeading('KitchenX', 3);
  const cta = makeButton('Order now', '#menu');
  const navItems = [
    makeNavItem('Home', ''),
    makeNavItem('Menu', 'menu'),
    makeNavItem('Contact', 'contact'),
  ];
  const header: HeaderNode = {
    id: generateNodeId('header'),
    type: 'header',
    children: [logo, cta],
    slots: { logo: [logo.id], right: [cta.id] },
    data: { navItems, layout: 'top', mobile: { behavior: 'collapse', label: 'Menu' } },
  };
  return header;
}

function makeFooter(): BlueprintNode {
  const col1Title = makeHeading('Visit us', 4);
  const col1Body = makeParagraph('123 Market Street, City Center');
  const col2Title = makeHeading('Hours', 4);
  const col2List = makeList(['Mon-Fri: 9am-8pm', 'Sat-Sun: 10am-6pm']);
  const footer: FooterNode = {
    id: generateNodeId('footer'),
    type: 'footer',
    children: [col1Title, col1Body, col2Title, col2List],
    data: {
      navItems: [makeNavItem('Home', ''), makeNavItem('Menu', 'menu'), makeNavItem('Contact', 'contact')],
      socialLinks: [
        { id: generateNodeId('social'), platform: 'instagram', href: 'https://instagram.com', newTab: true },
        { id: generateNodeId('social'), platform: 'facebook', href: 'https://facebook.com', newTab: true },
        { id: generateNodeId('social'), platform: 'tiktok', href: 'https://tiktok.com', newTab: true },
      ],
      legal: {
        text: '(c) 2026 KitchenX. All rights reserved.',
        links: [makeNavItem('Privacy', 'privacy'), makeNavItem('Terms', 'terms')],
      },
    },
    columns: [
      { id: generateNodeId('fcol'), content: [col1Title.id, col1Body.id] },
      { id: generateNodeId('fcol'), content: [col2Title.id, col2List.id] },
    ],
  };
  return footer;
}

const heroSplit: PresetFactory = () => {
  const badge = makeBadge('Chef special', 'outline');
  const heading = makeHeading('Fresh flavors, fast delivery', 1);
  const body = makeParagraph('Highlight signature dishes and guide customers to order in seconds.');
  const cta = makeButton('Order now', '#menu');
  const image = makeImage('https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop', 'Hero');
  const row = makeRow([
    { span: 6, content: [badge, heading, body, cta] },
    { span: 6, content: [image] },
  ]);
  const container = makeContainer([row], '5xl');
  return makeSection([container]);
};

const heroCentered: PresetFactory = () => {
  const heading = makeHeading('Restaurant sites that sell', 1, 'center');
  const body = makeParagraph('Launch a storefront in minutes and start taking orders right away.', { textAlign: 'center' });
  const cta = makeButton('Start building', '#menu');
  const container = makeContainer([heading, body, cta], '3xl', { textAlign: 'center' });
  return makeSection([container]);
};

const heroImageLeft: PresetFactory = () => {
  const heading = makeHeading('Seasonal bowls and bold flavors', 1);
  const body = makeParagraph('Showcase what is new on the menu and keep customers excited.');
  const cta = makeButton('View menu', '#menu');
  const image = makeImage('https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?q=80&w=1200&auto=format&fit=crop', 'Bowls');
  const row = makeRow([
    { span: 6, content: [image] },
    { span: 6, content: [heading, body, cta] },
  ]);
  const container = makeContainer([row], '5xl');
  return makeSection([container]);
};

const heroFeatureList: PresetFactory = () => {
  const badge = makeBadge('Online ordering', 'solid');
  const heading = makeHeading('Your kitchen, online in a day', 1);
  const body = makeParagraph('Give customers a clear reason to order from you today.');
  const list = makeList(['Pickup and delivery ready', 'Promo-ready hero sections', 'Fast checkout flow']);
  const cta = makeButton('Launch now', '#menu', 'outline');
  const container = makeContainer([badge, heading, body, list, cta], '4xl');
  return makeSection([container]);
};

const sectionTwoColumn: PresetFactory = () => {
  const col1Title = makeHeading('Fast ordering', 3);
  const col1Body = makeParagraph('Turn visitors into buyers with a frictionless checkout.');
  const col2Title = makeHeading('Pickup ready', 3);
  const col2Body = makeParagraph('Highlight hours, pickup notes, and delivery areas.');
  const row = makeRow([
    { span: 6, content: [col1Title, col1Body] },
    { span: 6, content: [col2Title, col2Body] },
  ]);
  return makeSection([row]);
};

const sectionThreeCards: PresetFactory = () => {
  const card1 = makeCard('Top sellers', 'Feature your most popular dishes.', '#menu');
  const card2 = makeCard('Limited offers', 'Promote bundles and combos.', '#menu');
  const card3 = makeCard('Customer love', 'Show reviews or testimonials.', '#menu');
  const row = makeRow([
    { span: 4, content: [card1] },
    { span: 4, content: [card2] },
    { span: 4, content: [card3] },
  ]);
  return makeSection([row]);
};

const featuresGridPreset: PresetFactory = () => {
  const features = makeFeatures(
    'grid',
    [
      { title: 'Fresh ingredients', description: 'Daily prep with local produce.', icon: 'FRESH' },
      { title: 'Fast pickup', description: 'Orders ready in 20 minutes.', icon: 'FAST' },
      { title: 'Custom catering', description: 'Menus tailored for events.', icon: 'CATER' },
    ],
    3,
  );
  return makeSection([features]);
};

const featuresStackedPreset: PresetFactory = () => {
  const features = makeFeatures('stacked', [
    { title: 'Signature dishes', description: 'Highlight chef favorites and best sellers.', icon: 'STAR' },
    { title: 'Delivery ready', description: 'Offer pickup and delivery options.', icon: 'DELIVER' },
    { title: 'Seasonal specials', description: 'Rotate promos and limited items.', icon: 'SEASON' },
  ]);
  return makeSection([features]);
};

const featuresIconLeftPreset: PresetFactory = () => {
  const features = makeFeatures('icon-left', [
    { title: 'Order online', description: 'Simple checkout and clear menu.', icon: 'ORDER' },
    { title: 'Track pickup', description: 'Keep customers updated in real time.', icon: 'TRACK' },
    { title: 'Reward loyalty', description: 'Encourage repeat visits with perks.', icon: 'LOYAL' },
  ]);
  return makeSection([features]);
};

const galleryGridPreset: PresetFactory = () => {
  const gallery = makeGallery([
    { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop', alt: 'Dish', caption: 'Signature bowls' },
    { src: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?q=80&w=1200&auto=format&fit=crop', alt: 'Street food', caption: 'Street favorites' },
    { src: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop', alt: 'Burger', caption: 'Fresh grill' },
    { src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop', alt: 'Salad', caption: 'Seasonal picks' },
    { src: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200&auto=format&fit=crop', alt: 'Pasta', caption: 'Chef specials' },
    { src: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1200&auto=format&fit=crop', alt: 'Breakfast', caption: 'Morning bites' },
  ], 3);
  return makeSection([gallery]);
};

const sliderPromoPreset: PresetFactory = () => {
  const slider = makeSlider([
    { src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop', alt: 'Promo 1', caption: 'Weekly specials' },
    { src: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?q=80&w=1400&auto=format&fit=crop', alt: 'Promo 2', caption: 'Combo offers' },
    { src: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1400&auto=format&fit=crop', alt: 'Promo 3', caption: 'Chef picks' },
    { src: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1400&auto=format&fit=crop', alt: 'Promo 4', caption: 'New arrivals' },
  ], 1);
  return makeSection([slider]);
};

const testimonialsGridPreset: PresetFactory = () => {
  const testimonials = makeTestimonials(
    'grid',
    [
      {
        name: 'Lina A.',
        text: 'Fast delivery and everything tasted fresh.',
        rating: 5,
        role: 'Regular customer',
        source: 'Google',
        avatar: { src: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
      {
        name: 'Omar K.',
        text: 'Great flavors and easy pickup process.',
        rating: 4.5,
        role: 'Food blogger',
        source: 'Instagram',
        avatar: { src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
      {
        name: 'Sara M.',
        text: 'The spicy wrap was perfect and full of flavor.',
        rating: 4.8,
        role: 'Local guide',
        source: 'Yelp',
        avatar: { src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
    ],
    { columns: 3 },
  );
  return makeSection([testimonials]);
};

const testimonialsSliderPreset: PresetFactory = () => {
  const testimonials = makeTestimonials(
    'slider',
    [
      {
        name: 'Hassan B.',
        text: 'The portions are generous and the staff is friendly.',
        rating: 4.7,
        role: 'Local resident',
        source: 'Facebook',
        avatar: { src: 'https://images.unsplash.com/photo-1545996124-0501ebae84d0?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
      {
        name: 'Dalia R.',
        text: 'Quick checkout and the food arrived hot.',
        rating: 4.9,
        role: 'Office manager',
        source: 'Google',
        avatar: { src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
      {
        name: 'Mahmoud S.',
        text: 'Perfect for late-night cravings. Highly recommended.',
        rating: 5,
        role: 'Night owl',
        source: 'TikTok',
        avatar: { src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
    ],
    { per_view: 1, show_arrows: true, show_dots: true },
  );
  return makeSection([testimonials]);
};

const testimonialsHighlightPreset: PresetFactory = () => {
  const testimonials = makeTestimonials(
    'highlight',
    [
      {
        name: 'Noura H.',
        text: 'Best lunch spot in the neighborhood. We order every week.',
        rating: 5,
        role: 'Community lead',
        source: 'Google',
        avatar: { src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop', alt: 'Customer' },
      },
      {
        name: 'Yousef A.',
        text: 'The grilled chicken bowl is my favorite.',
        rating: 4.6,
        role: 'Regular',
        source: 'Instagram',
      },
      {
        name: 'Maya T.',
        text: 'Easy to customize and the flavors are consistent.',
        rating: 4.7,
        role: 'Food lover',
        source: 'Facebook',
      },
    ],
  );
  return makeSection([testimonials]);
};

const calloutPreset: PresetFactory = () => {
  const heading = makeHeading('Ready for pickup?', 2, 'center');
  const body = makeParagraph('Let customers know you are open and taking orders.', { textAlign: 'center' });
  const cta = makeButton('Order pickup', '#menu');
  const container = makeContainer([heading, body, cta], '3xl', { textAlign: 'center' });
  return makeSection([container], { bg: 'surface', p: 6 });
};

const menuPreset: PresetFactory = () => {
  const menu = makeNode('menu_grid', {
    title: 'Menu highlights',
    subtitle: 'Browse by category and add items to the cart.',
    columns: 3,
    show_images: true,
    show_prices: true,
    show_add_to_cart: true,
    show_category_tabs: true,
  });
  return makeSection([menu]);
};

const cartPreset: PresetFactory = () => {
  const cart = makeNode('cart', {
    title: 'Your order',
    checkout_label: 'Checkout',
  });
  return makeSection([cart]);
};

const menuWithCart: PresetFactory = () => {
  const menu = makeNode('menu_grid', {
    title: 'Menu',
    columns: 2,
    show_images: true,
    show_prices: true,
    show_add_to_cart: true,
  });
  const cart = makeNode('cart', {
    title: 'Cart',
    checkout_label: 'Checkout',
  });
  const row = makeRow([
    { span: 8, content: [menu] },
    { span: 4, content: [cart] },
  ]);
  return makeSection([row]);
};

const mapPreset: PresetFactory = () => {
  const mapNode = makeMap('Visit us', '123 Market Street, City Center', 24.7136, 46.6753);
  return makeSection([mapNode]);
};

const openingHoursPreset: PresetFactory = () => {
  const hoursNode = makeOpeningHours();
  return makeSection([hoursNode]);
};

const headingPreset: PresetFactory = () => makeSection([makeHeading('Section heading', 2)]);
const paragraphPreset: PresetFactory = () => makeSection([makeParagraph('Use this space to tell your story.')]);
const buttonPreset: PresetFactory = () => makeSection([makeButton('Order now', '#menu')]);
const imagePreset: PresetFactory = () => makeSection([makeImage('https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=1200&auto=format&fit=crop', 'Food')]);
const listPreset: PresetFactory = () => makeSection([makeList(['Fast delivery', 'Fresh ingredients', 'Local favorites'])]);
const badgePreset: PresetFactory = () => makeSection([makeBadge('Best seller', 'solid')]);
const dividerPreset: PresetFactory = () => makeSection([makeDivider('horizontal')]);
const cardPreset: PresetFactory = () => makeSection([makeCard('Signature dish', 'Describe what makes this item special.')]);

const inputPreset: PresetFactory = () => makeSection([makeInput('Full name', 'Jane Doe')]);
const textareaPreset: PresetFactory = () => makeSection([makeTextarea('Message', 'Tell us what you need', 4)]);
const selectPreset: PresetFactory = () => makeSection([makeSelect('Order type', [
  { label: 'Pickup', value: 'pickup' },
  { label: 'Delivery', value: 'delivery' },
])]);

const contactFormPreset: PresetFactory = () => {
  const heading = makeHeading('Get in touch', 2);
  const name = makeInput('Full name', 'Jane Doe');
  const email = makeInput('Email', 'name@example.com', 'email');
  const message = makeTextarea('Message', 'Tell us what you need', 5);
  const button = makeButton('Send message', '#contact', 'solid');
  return makeSection([heading, name, email, message, button]);
};

export const BLOCK_SECTIONS: BlockSection[] = [
  {
    id: 'hero',
    title: 'Hero',
    items: [
      { id: 'hero-split', label: 'Split hero', description: 'Text and image columns', factory: heroSplit },
      { id: 'hero-centered', label: 'Centered hero', description: 'Centered headline + CTA', factory: heroCentered },
      { id: 'hero-image-left', label: 'Image left hero', description: 'Image left, copy right', factory: heroImageLeft },
      { id: 'hero-feature', label: 'Feature hero', description: 'Headline with bullets', factory: heroFeatureList },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    items: [
      { id: 'features-grid', label: 'Feature grid', description: 'Multi-column benefits', factory: featuresGridPreset },
      { id: 'features-stacked', label: 'Stacked features', description: 'Vertical list of benefits', factory: featuresStackedPreset },
      { id: 'features-icon-left', label: 'Icon-left list', description: 'Icon aligned left', factory: featuresIconLeftPreset },
    ],
  },
  {
    id: 'media',
    title: 'Media',
    items: [
      { id: 'gallery-grid', label: 'Gallery grid', description: 'Image grid showcase', factory: galleryGridPreset },
      { id: 'slider-promo', label: 'Image slider', description: 'Carousel for highlights', factory: sliderPromoPreset },
    ],
  },
  {
    id: 'testimonials',
    title: 'Testimonials',
    items: [
      { id: 'testimonials-grid', label: 'Testimonials grid', description: 'Customer quotes in a grid', factory: testimonialsGridPreset },
      { id: 'testimonials-slider', label: 'Testimonials slider', description: 'Carousel of reviews', factory: testimonialsSliderPreset },
      { id: 'testimonials-highlight', label: 'Highlighted review', description: 'One main review with extras', factory: testimonialsHighlightPreset },
    ],
  },
  {
    id: 'sections',
    title: 'Sections',
    items: [
      { id: 'two-column', label: 'Two column features', description: 'Two side-by-side highlights', factory: sectionTwoColumn },
      { id: 'three-cards', label: 'Three cards', description: 'Feature grid for promos', factory: sectionThreeCards },
      { id: 'callout', label: 'Callout banner', description: 'Centered message + CTA', factory: calloutPreset },
    ],
  },
  {
    id: 'commerce',
    title: 'Commerce',
    items: [
      { id: 'menu-grid', label: 'Menu grid', description: 'Show menu items', factory: menuPreset },
      { id: 'cart', label: 'Cart', description: 'Sticky cart panel', factory: cartPreset },
      { id: 'menu-cart', label: 'Menu + cart', description: 'Side-by-side menu and cart', factory: menuWithCart },
    ],
  },
  {
    id: 'location',
    title: 'Location',
    items: [
      { id: 'map-location', label: 'Map & address', description: 'Interactive map with address label', factory: mapPreset },
      { id: 'opening-hours', label: 'Opening hours', description: 'Weekly schedule list', factory: openingHoursPreset },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    items: [
      { id: 'navbar', label: 'Navbar', description: 'Logo + nav links', factory: makeHeader, insert: 'start', singletonType: 'header' },
      { id: 'footer', label: 'Footer', description: 'Columns + links', factory: makeFooter, insert: 'end', singletonType: 'footer' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    items: [
      { id: 'heading', label: 'Heading', description: 'Section headline', factory: headingPreset },
      { id: 'paragraph', label: 'Paragraph', description: 'Supporting copy', factory: paragraphPreset },
      { id: 'button', label: 'Button', description: 'Primary call to action', factory: buttonPreset },
      { id: 'image', label: 'Image', description: 'Responsive image block', factory: imagePreset },
      { id: 'list', label: 'List', description: 'Bullet list', factory: listPreset },
      { id: 'badge', label: 'Badge', description: 'Small label', factory: badgePreset },
      { id: 'divider', label: 'Divider', description: 'Section separator', factory: dividerPreset },
      { id: 'card', label: 'Card', description: 'Image + copy', factory: cardPreset },
    ],
  },
  {
    id: 'forms',
    title: 'Forms',
    items: [
      { id: 'input', label: 'Input', description: 'Single line field', factory: inputPreset },
      { id: 'textarea', label: 'Textarea', description: 'Multi-line field', factory: textareaPreset },
      { id: 'select', label: 'Select', description: 'Dropdown field', factory: selectPreset },
      { id: 'contact-form', label: 'Contact form', description: 'Name, email, message', factory: contactFormPreset },
    ],
  },
];

export const BLOCK_PRESETS: Record<string, BlockPreset> = Object.fromEntries(
  BLOCK_SECTIONS.flatMap((section) => section.items.map((item) => [item.id, item] as const)),
);
