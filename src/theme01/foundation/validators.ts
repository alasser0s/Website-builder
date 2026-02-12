import type { BlueprintNode, BlueprintStateSnapshot, NodeType, HeaderNode, FooterNode, NavItem, HeadingNode, ParagraphNode, ListNode, ImageNode, ButtonNode, BadgeNode, DividerNode, CardNode, FeaturesNode, GalleryNode, SliderNode, TestimonialsNode, InputNode, TextareaNode, SelectNode } from './types';

export interface ValidationIssue {
  nodeId: string;
  reason: string;
}

export type ValidationCollector = (issue: ValidationIssue) => void;

export function validateNode(node: BlueprintNode, isRoot = false, collector?: ValidationCollector): void {
  const errors: string[] = [];
  if (!node || typeof node !== 'object') errors.push('Node is not an object');
  if (!node.id || typeof node.id !== 'string') errors.push('Node missing valid id');
  if (!node.type || typeof node.type !== 'string') errors.push('Node missing valid type');
  const allowed: NodeType[] = [
    'page',
    'header',
    'section',
    'footer',
    'container',
    'row',
    'column',
    'component',
    'heading',
    'paragraph',
    'list',
    'image',
    'button',
    'badge',
    'divider',
    'card',
    'features',
    'gallery',
    'slider',
    'testimonials',
    'input',
    'textarea',
    'select',
    'map',
    'opening_hours',
    'menu_grid',
    'cart',
  ];
  if (node.type && !allowed.includes(node.type)) {
    errors.push(`Invalid node type: ${node.type}`);
  }
  if (isRoot && node.type !== 'page') errors.push('Root node type must be "page"');

  if (!Array.isArray(node.children)) {
    errors.push('Node children must be an array');
  }
  // General leaf guard: treat specific leaf types as non-children hosts
  // Note: 'features', 'gallery', 'slider', 'testimonials' removed to enable container flexibility
  const leafTypes: NodeType[] = [
    'component',
    'heading',
    'paragraph',
    'list',
    'image',
    'button',
    'badge',
    'divider',
    'card',
    // 'features',    // Now supports children
    // 'gallery',     // Now supports children
    // 'slider',      // Now supports children
    // 'testimonials', // Now supports children
    'input',
    'textarea',
    'select',
    'map',
    'opening_hours',
    'menu_grid',
    'cart',
  ];
  if (leafTypes.includes(node.type) && node.children.length > 0) {
    errors.push(`${node.type} nodes must not have children`);
  }
  if (node.type === 'heading') {
    const heading = node as HeadingNode;
    const data = heading.data as HeadingNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Heading requires data object');
    } else {
      const textValue = (data as any).text;
      if (typeof textValue !== 'string' || textValue.trim() === '') {
        errors.push('Heading data.text must be a non-empty string');
      }
      const levelValue = (data as any).level;
      const validLevel = typeof levelValue === 'number' && Number.isInteger(levelValue) && levelValue >= 1 && levelValue <= 6;
      if (!validLevel) {
        errors.push('Heading data.level must be an integer between 1 and 6');
      }
      const alignValue = (data as any).align;
      if (alignValue !== undefined && alignValue !== 'start' && alignValue !== 'center' && alignValue !== 'end') {
        errors.push('Heading data.align must be start|center|end when provided');
      }
      const href = (data as any).href;
      if (href !== undefined) {
        if (!href || typeof href !== 'object') {
          errors.push('Heading data.href must be an object when provided');
        } else if (href.kind === 'route') {
          if (typeof href.slug !== 'string') {
            errors.push('Heading route href.slug must be a string');
          }
        } else if (href.kind === 'url') {
          if (typeof href.href !== 'string' || href.href.trim() === '') {
            errors.push('Heading url href.href must be a non-empty string');
          }
          if (href.newTab !== undefined && typeof href.newTab !== 'boolean') {
            errors.push('Heading url href.newTab must be boolean when provided');
          }
        } else {
          errors.push('Heading href.kind must be route|url');
        }
      }
    }
  }

  if (node.type === 'paragraph') {
    const paragraph = node as ParagraphNode;
    const data = paragraph.data as ParagraphNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Paragraph requires data object');
    } else {
      const textValue = (data as any).text;
      if (typeof textValue !== 'string' || textValue.trim() === '') {
        errors.push('Paragraph data.text must be a non-empty string');
      }
      const href = (data as any).href;
      if (href !== undefined) {
        if (!href || typeof href !== 'object') {
          errors.push('Paragraph data.href must be an object when provided');
        } else if (href.kind === 'route') {
          if (typeof href.slug !== 'string') {
            errors.push('Paragraph route href.slug must be a string');
          }
        } else if (href.kind === 'url') {
          if (typeof href.href !== 'string' || href.href.trim() === '') {
            errors.push('Paragraph url href.href must be a non-empty string');
          }
          if (href.newTab !== undefined && typeof href.newTab !== 'boolean') {
            errors.push('Paragraph url href.newTab must be boolean when provided');
          }
        } else {
          errors.push('Paragraph href.kind must be route|url');
        }
      }
    }
  }

  if (node.type === 'list') {
    const list = node as ListNode;
    const data = list.data as ListNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('List requires data object');
    } else {
      const items = (data as any).items;
      if (!Array.isArray(items) || items.length === 0) {
        errors.push('List data.items must be a non-empty array of strings');
      } else {
        items.forEach((item, index) => {
          if (typeof item !== 'string' || item.trim() === '') {
            errors.push(`List data.items[${index}] must be a non-empty string`);
          }
        });
      }
      const ordered = (data as any).ordered;
      if (ordered !== undefined && typeof ordered !== 'boolean') {
        errors.push('List data.ordered must be boolean when provided');
      }
    }
  }

  if (node.type === 'button') {
    const button = node as ButtonNode;
    const data = button.data as ButtonNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Button requires data object');
    } else {
      const label = (data as any).label;
      if (typeof label !== 'string' || label.trim() === '') {
        errors.push('Button data.label must be a non-empty string');
      }
      const href = (data as any).href;
      if (href !== undefined) {
        if (!href || typeof href !== 'object') {
          errors.push('Button data.href must be an object when provided');
        } else if (href.kind === 'route') {
          if (typeof href.slug !== 'string') {
            errors.push('Button route href.slug must be a string');
          }
        } else if (href.kind === 'url') {
          if (typeof href.href !== 'string' || href.href.trim() === '') {
            errors.push('Button url href.href must be a non-empty string');
          }
          if (href.newTab !== undefined && typeof href.newTab !== 'boolean') {
            errors.push('Button url href.newTab must be boolean when provided');
          }
        } else {
          errors.push('Button href.kind must be route|url');
        }
      }
      const size = (data as any).size;
      if (size !== undefined && size !== 'sm' && size !== 'md' && size !== 'lg') {
        errors.push('Button data.size must be one of sm|md|lg when provided');
      }
      const variant = (data as any).variant;
      if (variant !== undefined && variant !== 'solid' && variant !== 'outline' && variant !== 'ghost') {
        errors.push('Button data.variant must be solid|outline|ghost when provided');
      }
      const iconLeft = (data as any).iconLeft;
      if (iconLeft !== undefined && (typeof iconLeft !== 'string' || iconLeft.length === 0)) {
        errors.push('Button data.iconLeft must be a non-empty string when provided');
      }
      const iconRight = (data as any).iconRight;
      if (iconRight !== undefined && (typeof iconRight !== 'string' || iconRight.length === 0)) {
        errors.push('Button data.iconRight must be a non-empty string when provided');
      }
    }
  }

  if (node.type === 'badge') {
    const badge = node as BadgeNode;
    const data = badge.data as BadgeNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Badge requires data object');
    } else {
      const textValue = (data as any).text;
      if (typeof textValue !== 'string' || textValue.trim() === '') {
        errors.push('Badge data.text must be a non-empty string');
      }
      const variant = (data as any).variant;
      if (variant !== undefined && variant !== 'solid' && variant !== 'outline' && variant !== 'ghost') {
        errors.push('Badge data.variant must be solid|outline|ghost when provided');
      }
    }
  }

  if (node.type === 'card') {
    const card = node as CardNode;
    const data = card.data as CardNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Card requires data object');
    } else {
      const title = (data as any).title;
      if (title !== undefined && (typeof title !== 'string')) {
        errors.push('Card data.title must be string when provided');
      }
      const body = (data as any).body;
      if (body !== undefined && (typeof body !== 'string')) {
        errors.push('Card data.body must be string when provided');
      }
      const media = (data as any).media;
      if (media !== undefined) {
        if (!media || typeof media !== 'object') {
          errors.push('Card data.media must be object when provided');
        } else {
          const mediaSrc = (media as any).src;
          const mediaAlt = (media as any).alt;
          if (typeof mediaSrc !== 'string' || mediaSrc.trim() === '') {
            errors.push('Card data.media.src must be a non-empty string');
          }
          if (typeof mediaAlt !== 'string' || mediaAlt.trim() === '') {
            errors.push('Card data.media.alt must be a non-empty string');
          }
        }
      }
      const actions = (data as any).actions;
      if (actions !== undefined) {
        if (!Array.isArray(actions)) {
          errors.push('Card data.actions must be an array when provided');
        } else {
          actions.forEach((action, index) => {
            if (!action || typeof action !== 'object') {
              errors.push(`Card data.actions[${index}] must be an object`);
              return;
            }
            if (typeof action.label !== 'string' || action.label.trim() === '') {
              errors.push(`Card data.actions[${index}].label must be a non-empty string`);
            }
            if (action.href !== undefined) {
              const href = action.href;
              if (!href || typeof href !== 'object') {
                errors.push(`Card data.actions[${index}].href must be object when provided`);
              } else if (href.kind === 'route') {
                if (typeof href.slug !== 'string') {
                  errors.push(`Card data.actions[${index}].href.slug must be string for route`);
                }
              } else if (href.kind === 'url') {
                if (typeof href.href !== 'string' || href.href.trim() === '') {
                  errors.push(`Card data.actions[${index}].href.href must be a non-empty string`);
                }
                if (href.newTab !== undefined && typeof href.newTab !== 'boolean') {
                  errors.push(`Card data.actions[${index}].href.newTab must be boolean`);
                }
              } else {
                errors.push(`Card data.actions[${index}].href.kind must be route|url`);
              }
            }
          });
        }
      }
    }
  }

  if (node.type === 'features') {
    const features = node as FeaturesNode;
    const data = features.data as any;
    if (!data || typeof data !== 'object') {
      errors.push('Features requires data object');
    } else {
      if (data.title !== undefined && typeof data.title !== 'string') {
        errors.push('Features data.title must be a string when provided');
      }
      if (data.subtitle !== undefined && typeof data.subtitle !== 'string') {
        errors.push('Features data.subtitle must be a string when provided');
      }
      if (data.layout !== undefined && data.layout !== 'grid' && data.layout !== 'stacked' && data.layout !== 'icon-left') {
        errors.push('Features data.layout must be grid|stacked|icon-left when provided');
      }
      if (data.columns !== undefined) {
        if (!Number.isInteger(data.columns) || data.columns < 1 || data.columns > 6) {
          errors.push('Features data.columns must be an integer between 1 and 6 when provided');
        }
      }
      if (data.items !== undefined) {
        if (!Array.isArray(data.items)) {
          errors.push('Features data.items must be an array when provided');
        } else {
          const ids = new Set<string>();
          data.items.forEach((item: any, index: number) => {
            if (!item || typeof item !== 'object') {
              errors.push(`Features items[${index}] must be an object`);
              return;
            }
            if (typeof item.id !== 'string' || item.id.trim() === '') {
              errors.push(`Features items[${index}].id must be a non-empty string`);
            } else if (ids.has(item.id)) {
              errors.push(`Features items duplicate id: ${item.id}`);
            } else {
              ids.add(item.id);
            }
            if (typeof item.title !== 'string' || item.title.trim() === '') {
              errors.push(`Features items[${index}].title must be a non-empty string`);
            }
            if (item.description !== undefined && typeof item.description !== 'string') {
              errors.push(`Features items[${index}].description must be a string when provided`);
            }
            if (item.icon !== undefined && typeof item.icon !== 'string') {
              errors.push(`Features items[${index}].icon must be a string when provided`);
            }
            if (item.image !== undefined) {
              if (!item.image || typeof item.image !== 'object') {
                errors.push(`Features items[${index}].image must be an object when provided`);
              } else {
                if (typeof item.image.src !== 'string' || item.image.src.trim() === '') {
                  errors.push(`Features items[${index}].image.src must be a non-empty string`);
                }
                if (item.image.alt !== undefined && typeof item.image.alt !== 'string') {
                  errors.push(`Features items[${index}].image.alt must be a string when provided`);
                }
              }
            }
          });
        }
      }
    }
  }

  if (node.type === 'gallery') {
    const gallery = node as GalleryNode;
    const data = gallery.data as any;
    if (!data || typeof data !== 'object') {
      errors.push('Gallery requires data object');
    } else {
      if (data.title !== undefined && typeof data.title !== 'string') {
        errors.push('Gallery data.title must be a string when provided');
      }
      if (data.subtitle !== undefined && typeof data.subtitle !== 'string') {
        errors.push('Gallery data.subtitle must be a string when provided');
      }
      if (data.columns !== undefined) {
        if (!Number.isInteger(data.columns) || data.columns < 1 || data.columns > 6) {
          errors.push('Gallery data.columns must be an integer between 1 and 6 when provided');
        }
      }
      if (data.aspect !== undefined && data.aspect !== '1:1' && data.aspect !== '4:3' && data.aspect !== '16:9') {
        errors.push('Gallery data.aspect must be 1:1|4:3|16:9 when provided');
      }
      if (data.items !== undefined) {
        if (!Array.isArray(data.items)) {
          errors.push('Gallery data.items must be an array when provided');
        } else {
          const ids = new Set<string>();
          data.items.forEach((item: any, index: number) => {
            if (!item || typeof item !== 'object') {
              errors.push(`Gallery items[${index}] must be an object`);
              return;
            }
            if (typeof item.id !== 'string' || item.id.trim() === '') {
              errors.push(`Gallery items[${index}].id must be a non-empty string`);
            } else if (ids.has(item.id)) {
              errors.push(`Gallery items duplicate id: ${item.id}`);
            } else {
              ids.add(item.id);
            }
            if (typeof item.src !== 'string' || item.src.trim() === '') {
              errors.push(`Gallery items[${index}].src must be a non-empty string`);
            }
            if (item.alt !== undefined && typeof item.alt !== 'string') {
              errors.push(`Gallery items[${index}].alt must be a string when provided`);
            }
            if (item.caption !== undefined && typeof item.caption !== 'string') {
              errors.push(`Gallery items[${index}].caption must be a string when provided`);
            }
          });
        }
      }
    }
  }

  if (node.type === 'slider') {
    const slider = node as SliderNode;
    const data = slider.data as any;
    if (!data || typeof data !== 'object') {
      errors.push('Slider requires data object');
    } else {
      if (data.title !== undefined && typeof data.title !== 'string') {
        errors.push('Slider data.title must be a string when provided');
      }
      if (data.subtitle !== undefined && typeof data.subtitle !== 'string') {
        errors.push('Slider data.subtitle must be a string when provided');
      }
      if (data.per_view !== undefined) {
        if (!Number.isInteger(data.per_view) || data.per_view < 1 || data.per_view > 6) {
          errors.push('Slider data.per_view must be an integer between 1 and 6 when provided');
        }
      }
      if (data.show_arrows !== undefined && typeof data.show_arrows !== 'boolean') {
        errors.push('Slider data.show_arrows must be boolean when provided');
      }
      if (data.show_dots !== undefined && typeof data.show_dots !== 'boolean') {
        errors.push('Slider data.show_dots must be boolean when provided');
      }
      if (data.auto_play !== undefined && typeof data.auto_play !== 'boolean') {
        errors.push('Slider data.auto_play must be boolean when provided');
      }
      if (data.auto_play_interval !== undefined) {
        if (typeof data.auto_play_interval !== 'number' || !Number.isFinite(data.auto_play_interval) || data.auto_play_interval <= 0) {
          errors.push('Slider data.auto_play_interval must be a positive number when provided');
        }
      }
      if (data.aspect !== undefined && data.aspect !== '1:1' && data.aspect !== '4:3' && data.aspect !== '16:9') {
        errors.push('Slider data.aspect must be 1:1|4:3|16:9 when provided');
      }
      if (data.items !== undefined) {
        if (!Array.isArray(data.items)) {
          errors.push('Slider data.items must be an array when provided');
        } else {
          const ids = new Set<string>();
          data.items.forEach((item: any, index: number) => {
            if (!item || typeof item !== 'object') {
              errors.push(`Slider items[${index}] must be an object`);
              return;
            }
            if (typeof item.id !== 'string' || item.id.trim() === '') {
              errors.push(`Slider items[${index}].id must be a non-empty string`);
            } else if (ids.has(item.id)) {
              errors.push(`Slider items duplicate id: ${item.id}`);
            } else {
              ids.add(item.id);
            }
            if (typeof item.src !== 'string' || item.src.trim() === '') {
              errors.push(`Slider items[${index}].src must be a non-empty string`);
            }
            if (item.alt !== undefined && typeof item.alt !== 'string') {
              errors.push(`Slider items[${index}].alt must be a string when provided`);
            }
            if (item.caption !== undefined && typeof item.caption !== 'string') {
              errors.push(`Slider items[${index}].caption must be a string when provided`);
            }
          });
        }
      }
    }
  }

  if (node.type === 'testimonials') {
    const testimonials = node as TestimonialsNode;
    const data = testimonials.data as any;
    if (!data || typeof data !== 'object') {
      errors.push('Testimonials requires data object');
    } else {
      if (data.title !== undefined && typeof data.title !== 'string') {
        errors.push('Testimonials data.title must be a string when provided');
      }
      if (data.subtitle !== undefined && typeof data.subtitle !== 'string') {
        errors.push('Testimonials data.subtitle must be a string when provided');
      }
      if (data.layout !== undefined && data.layout !== 'grid' && data.layout !== 'slider' && data.layout !== 'highlight') {
        errors.push('Testimonials data.layout must be grid|slider|highlight when provided');
      }
      if (data.columns !== undefined) {
        if (!Number.isInteger(data.columns) || data.columns < 1 || data.columns > 6) {
          errors.push('Testimonials data.columns must be an integer between 1 and 6 when provided');
        }
      }
      if (data.per_view !== undefined) {
        if (!Number.isInteger(data.per_view) || data.per_view < 1 || data.per_view > 6) {
          errors.push('Testimonials data.per_view must be an integer between 1 and 6 when provided');
        }
      }
      if (data.show_arrows !== undefined && typeof data.show_arrows !== 'boolean') {
        errors.push('Testimonials data.show_arrows must be boolean when provided');
      }
      if (data.show_dots !== undefined && typeof data.show_dots !== 'boolean') {
        errors.push('Testimonials data.show_dots must be boolean when provided');
      }
      if (data.items !== undefined) {
        if (!Array.isArray(data.items)) {
          errors.push('Testimonials data.items must be an array when provided');
        } else {
          const ids = new Set<string>();
          data.items.forEach((item: any, index: number) => {
            if (!item || typeof item !== 'object') {
              errors.push(`Testimonials items[${index}] must be an object`);
              return;
            }
            if (typeof item.id !== 'string' || item.id.trim() === '') {
              errors.push(`Testimonials items[${index}].id must be a non-empty string`);
            } else if (ids.has(item.id)) {
              errors.push(`Testimonials items duplicate id: ${item.id}`);
            } else {
              ids.add(item.id);
            }
            if (typeof item.name !== 'string' || item.name.trim() === '') {
              errors.push(`Testimonials items[${index}].name must be a non-empty string`);
            }
            if (typeof item.text !== 'string' || item.text.trim() === '') {
              errors.push(`Testimonials items[${index}].text must be a non-empty string`);
            }
            if (item.rating !== undefined) {
              if (typeof item.rating !== 'number' || !Number.isFinite(item.rating)) {
                errors.push(`Testimonials items[${index}].rating must be a number when provided`);
              } else if (item.rating < 0 || item.rating > 5) {
                errors.push(`Testimonials items[${index}].rating must be between 0 and 5`);
              }
            }
            if (item.avatar !== undefined) {
              if (!item.avatar || typeof item.avatar !== 'object') {
                errors.push(`Testimonials items[${index}].avatar must be an object when provided`);
              } else {
                if (typeof item.avatar.src !== 'string' || item.avatar.src.trim() === '') {
                  errors.push(`Testimonials items[${index}].avatar.src must be a non-empty string`);
                }
                if (item.avatar.alt !== undefined && typeof item.avatar.alt !== 'string') {
                  errors.push(`Testimonials items[${index}].avatar.alt must be a string when provided`);
                }
              }
            }
            if (item.role !== undefined && typeof item.role !== 'string') {
              errors.push(`Testimonials items[${index}].role must be a string when provided`);
            }
            if (item.source !== undefined && typeof item.source !== 'string') {
              errors.push(`Testimonials items[${index}].source must be a string when provided`);
            }
          });
        }
      }
    }
  }

  if (node.type === 'divider') {
    const divider = node as DividerNode;
    const data = divider.data as DividerNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Divider requires data object');
    } else {
      const orientation = (data as any).orientation;
      if (orientation !== 'horizontal' && orientation !== 'vertical') {
        errors.push('Divider data.orientation must be horizontal|vertical');
      }
    }
  }

  if (node.type === 'menu_grid') {
    const data = (node as any).data;
    if (data !== undefined && typeof data !== 'object') {
      errors.push('Menu grid data must be object when provided');
    } else if (data) {
      const columns = data.columns;
      if (columns !== undefined && (typeof columns !== 'number' || !Number.isFinite(columns) || columns < 1)) {
        errors.push('Menu grid data.columns must be a positive number when provided');
      }
      const boolFields = ['show_images', 'show_prices', 'show_add_to_cart', 'show_badges', 'show_category_tabs'] as const;
      boolFields.forEach((field) => {
        const value = data[field];
        if (value !== undefined && typeof value !== 'boolean') {
          errors.push(`Menu grid data.${field} must be boolean when provided`);
        }
      });
      if (data.category_filter !== undefined) {
        if (!Array.isArray(data.category_filter) || data.category_filter.some((id: any) => typeof id !== 'number')) {
          errors.push('Menu grid data.category_filter must be an array of numbers when provided');
        }
      }
      if (data.domain !== undefined && typeof data.domain !== 'string') {
        errors.push('Menu grid data.domain must be a string when provided');
      }
      if (data.api_base !== undefined && typeof data.api_base !== 'string') {
        errors.push('Menu grid data.api_base must be a string when provided');
      }
    }
  }

  if (node.type === 'map') {
    const data = (node as any).data;
    if (data !== undefined && typeof data !== 'object') {
      errors.push('Map data must be object when provided');
    } else if (data) {
      if (data.label !== undefined && typeof data.label !== 'string') {
        errors.push('Map data.label must be a string when provided');
      }
      if (data.address !== undefined && typeof data.address !== 'string') {
        errors.push('Map data.address must be a string when provided');
      }
      const hasLat = data.lat !== undefined;
      const hasLng = data.lng !== undefined;
      if (hasLat !== hasLng) {
        errors.push('Map data.lat and data.lng must be provided together');
      }
      if (hasLat && (typeof data.lat !== 'number' || !Number.isFinite(data.lat))) {
        errors.push('Map data.lat must be a finite number');
      }
      if (hasLng && (typeof data.lng !== 'number' || !Number.isFinite(data.lng))) {
        errors.push('Map data.lng must be a finite number');
      }
      if (data.zoom !== undefined) {
        if (typeof data.zoom !== 'number' || !Number.isFinite(data.zoom) || data.zoom < 1 || data.zoom > 20) {
          errors.push('Map data.zoom must be a number between 1 and 20 when provided');
        }
      }
      if (data.height !== undefined) {
        if (typeof data.height !== 'number' || !Number.isFinite(data.height) || data.height <= 0) {
          errors.push('Map data.height must be a positive number when provided');
        }
      }
      if (data.directions_url !== undefined && typeof data.directions_url !== 'string') {
        errors.push('Map data.directions_url must be a string when provided');
      }
    }
  }

  if (node.type === 'opening_hours') {
    const data = (node as any).data;
    if (data !== undefined && typeof data !== 'object') {
      errors.push('Opening hours data must be object when provided');
    } else if (data) {
      if (data.label !== undefined && typeof data.label !== 'string') {
        errors.push('Opening hours data.label must be a string when provided');
      }
      if (data.timezone !== undefined && typeof data.timezone !== 'string') {
        errors.push('Opening hours data.timezone must be a string when provided');
      }
      if (data.group_days !== undefined && typeof data.group_days !== 'boolean') {
        errors.push('Opening hours data.group_days must be boolean when provided');
      }
      if (data.schedule !== undefined) {
        if (!Array.isArray(data.schedule)) {
          errors.push('Opening hours data.schedule must be an array when provided');
        } else {
          data.schedule.forEach((entry: any, index: number) => {
            if (!entry || typeof entry !== 'object') {
              errors.push(`Opening hours schedule[${index}] must be an object`);
              return;
            }
            if (typeof entry.day !== 'string' || entry.day.trim() === '') {
              errors.push(`Opening hours schedule[${index}].day must be a string`);
            }
            if (entry.label !== undefined && typeof entry.label !== 'string') {
              errors.push(`Opening hours schedule[${index}].label must be a string when provided`);
            }
            if (entry.is_closed !== undefined && typeof entry.is_closed !== 'boolean') {
              errors.push(`Opening hours schedule[${index}].is_closed must be boolean when provided`);
            }
            if (entry.ranges !== undefined) {
              if (!Array.isArray(entry.ranges)) {
                errors.push(`Opening hours schedule[${index}].ranges must be an array when provided`);
              } else {
                entry.ranges.forEach((range: any, rIndex: number) => {
                  if (!range || typeof range !== 'object') {
                    errors.push(`Opening hours schedule[${index}].ranges[${rIndex}] must be an object`);
                    return;
                  }
                  if (range.start !== undefined && typeof range.start !== 'string') {
                    errors.push(`Opening hours schedule[${index}].ranges[${rIndex}].start must be a string when provided`);
                  }
                  if (range.end !== undefined && typeof range.end !== 'string') {
                    errors.push(`Opening hours schedule[${index}].ranges[${rIndex}].end must be a string when provided`);
                  }
                });
              }
            }
          });
        }
      }
    }
  }

  if (node.type === 'cart') {
    const data = (node as any).data;
    if (data !== undefined && typeof data !== 'object') {
      errors.push('Cart data must be object when provided');
    } else if (data) {
      if (data.title !== undefined && typeof data.title !== 'string') {
        errors.push('Cart data.title must be string when provided');
      }
      if (data.empty_text !== undefined && typeof data.empty_text !== 'string') {
        errors.push('Cart data.empty_text must be string when provided');
      }
      if (data.checkout_label !== undefined && typeof data.checkout_label !== 'string') {
        errors.push('Cart data.checkout_label must be string when provided');
      }
      if (data.payment_method !== undefined && data.payment_method !== 'card' && data.payment_method !== 'pay_on_pickup') {
        errors.push('Cart data.payment_method must be card|pay_on_pickup when provided');
      }
      if (data.success_url !== undefined && typeof data.success_url !== 'string') {
        errors.push('Cart data.success_url must be string when provided');
      }
      if (data.cancel_url !== undefined && typeof data.cancel_url !== 'string') {
        errors.push('Cart data.cancel_url must be string when provided');
      }
      if (data.domain !== undefined && typeof data.domain !== 'string') {
        errors.push('Cart data.domain must be a string when provided');
      }
      if (data.api_base !== undefined && typeof data.api_base !== 'string') {
        errors.push('Cart data.api_base must be a string when provided');
      }
    }
  }

  if (node.type === 'input') {
    const input = node as InputNode;
    const data = input.data as InputNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Input requires data object');
    } else {
      if (typeof (data as any).label !== 'string' || (data as any).label.trim() === '') {
        errors.push('Input data.label must be a non-empty string');
      }
      const placeholder = (data as any).placeholder;
      if (placeholder !== undefined && typeof placeholder !== 'string') {
        errors.push('Input data.placeholder must be string when provided');
      }
      const typeValue = (data as any).type;
      if (typeValue !== undefined && typeValue !== 'text' && typeValue !== 'email' && typeValue !== 'password') {
        errors.push('Input data.type must be text|email|password when provided');
      }
      const requiredValue = (data as any).required;
      if (requiredValue !== undefined && typeof requiredValue !== 'boolean') {
        errors.push('Input data.required must be boolean when provided');
      }
    }
  }

  if (node.type === 'textarea') {
    const textarea = node as TextareaNode;
    const data = textarea.data as TextareaNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Textarea requires data object');
    } else {
      if (typeof (data as any).label !== 'string' || (data as any).label.trim() === '') {
        errors.push('Textarea data.label must be a non-empty string');
      }
      const placeholder = (data as any).placeholder;
      if (placeholder !== undefined && typeof placeholder !== 'string') {
        errors.push('Textarea data.placeholder must be string when provided');
      }
      const rows = (data as any).rows;
      if (rows !== undefined && (!Number.isInteger(rows) || rows <= 0)) {
        errors.push('Textarea data.rows must be positive integer when provided');
      }
      const requiredValue = (data as any).required;
      if (requiredValue !== undefined && typeof requiredValue !== 'boolean') {
        errors.push('Textarea data.required must be boolean when provided');
      }
    }
  }

  if (node.type === 'select') {
    const select = node as SelectNode;
    const data = select.data as SelectNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Select requires data object');
    } else {
      if (typeof (data as any).label !== 'string' || (data as any).label.trim() === '') {
        errors.push('Select data.label must be a non-empty string');
      }
      const options = (data as any).options;
      if (!Array.isArray(options) || options.length === 0) {
        errors.push('Select data.options must be a non-empty array');
      } else {
        options.forEach((option, index) => {
          if (!option || typeof option !== 'object') {
            errors.push(`Select data.options[${index}] must be object`);
            return;
          }
          if (typeof option.label !== 'string' || option.label.trim() === '') {
            errors.push(`Select data.options[${index}].label must be non-empty string`);
          }
          if (typeof option.value !== 'string' || option.value.trim() === '') {
            errors.push(`Select data.options[${index}].value must be non-empty string`);
          }
        });
      }
      const requiredValue = (data as any).required;
      if (requiredValue !== undefined && typeof requiredValue !== 'boolean') {
        errors.push('Select data.required must be boolean when provided');
      }
    }
  }

  if (node.type === 'image') {
    const image = node as ImageNode;
    const data = image.data as ImageNode['data'];
    if (!data || typeof data !== 'object') {
      errors.push('Image requires data object');
    } else {
      const src = (data as any).src;
      if (typeof src !== 'string' || src.trim() === '') {
        errors.push('Image data.src must be a non-empty string');
      }
      const alt = (data as any).alt;
      if (typeof alt !== 'string' || alt.trim() === '') {
        errors.push('Image data.alt must be a non-empty string');
      }
      const objectFit = (data as any).objectFit;
      if (objectFit !== undefined && objectFit !== 'cover' && objectFit !== 'contain' && objectFit !== 'fill' && objectFit !== 'none') {
        errors.push('Image data.objectFit must be cover|contain|fill|none when provided');
      }
      const aspect = (data as any).aspect;
      if (aspect !== undefined && aspect !== '1:1' && aspect !== '4:3' && aspect !== '16:9') {
        errors.push('Image data.aspect must be one of 1:1|4:3|16:9 when provided');
      }
    }
  }

  // Header: enforce slots.logo[] and slots.right[] single-item arrays of ids and referential integrity
  if (node.type === 'header') {
    const h = node as HeaderNode;
    if (!h.slots || !Array.isArray(h.slots.logo) || !Array.isArray(h.slots.right)) {
      errors.push('Header slots.logo and slots.right must be arrays');
    } else {
      if (!h.slots.logo.every((v) => typeof v === 'string')) errors.push('Header slots.logo must be string id array');
      if (!h.slots.right.every((v) => typeof v === 'string')) errors.push('Header slots.right must be string id array');
      // single-item constraint
      if (h.slots.logo.length > 1) errors.push('Header slot.logo must contain at most one element');
      if (h.slots.right.length > 1) errors.push('Header slot.right must contain at most one element');
      // referential integrity: ids must exist in header.children
      const childrenIds = new Set(h.children.map((c) => c.id));
      for (const id of [...h.slots.logo, ...h.slots.right]) {
        if (!childrenIds.has(id)) errors.push(`Header slot references missing child id: ${id}`);
      }
      // orphan detection: any child not referenced by any slot
      const referenced = new Set([...h.slots.logo, ...h.slots.right]);
      for (const c of h.children) {
        if (!referenced.has(c.id)) {
          errors.push(`Header child not referenced by slots: ${c.id}`);
        }
      }
      // navItems validation (data-driven)
      const navItems = (h.data as any)?.navItems as NavItem[] | undefined;
      if (navItems !== undefined) {
        if (!Array.isArray(navItems)) {
          errors.push('Header data.navItems must be an array when provided');
        } else {
          const ids = new Set<string>();
          for (const item of navItems) {
            if (!item || typeof item !== 'object') {
              errors.push('navItems entry must be an object');
              continue;
            }
            if (typeof item.id !== 'string' || item.id.length === 0) {
              errors.push('navItem missing valid id');
              continue;
            }
            if (ids.has(item.id)) errors.push(`Duplicate navItem id: ${item.id}`);
            ids.add(item.id);
            if (typeof item.label !== 'string') {
              // Warn but don't fail for missing label, to prevent runtime crashes
              // errors.push(`navItem(${item.id}) missing label`);
            }
            if (item.kind === 'route') {
              if (typeof (item as any).slug !== 'string') {
                errors.push(`navItem(${item.id}) slug must be string`);
              }
            } else if (item.kind === 'url') {
              if (typeof (item as any).href !== 'string' || (item as any).href.length === 0) {
                errors.push(`navItem(${item.id}) href must be string`);
              }
              if ((item as any).newTab !== undefined && typeof (item as any).newTab !== 'boolean') {
                errors.push(`navItem(${item.id}) newTab must be boolean when provided`);
              }
            } else {
              errors.push(`navItem(${(item as any).id}) kind invalid`);
            }
          }
        }
      }
    }

    const layout = (h.data as any)?.layout;
    if (layout !== undefined && layout !== 'top' && layout !== 'side') {
      errors.push('Header data.layout must be top|side when provided');
    }
    const mobile = (h.data as any)?.mobile;
    if (mobile !== undefined) {
      if (!mobile || typeof mobile !== 'object') {
        errors.push('Header data.mobile must be an object when provided');
      } else {
        const behavior = (mobile as any).behavior;
        if (behavior !== undefined && behavior !== 'drawer' && behavior !== 'collapse') {
          errors.push('Header data.mobile.behavior must be drawer|collapse when provided');
        }
        const label = (mobile as any).label;
        if (label !== undefined && typeof label !== 'string') {
          errors.push('Header data.mobile.label must be a string when provided');
        }
      }
    }
  }

  // Footer: enforce columns[] and referential integrity
  if (node.type === 'footer') {
    const f = node as FooterNode;
    if (!Array.isArray(f.columns)) {
      errors.push('Footer requires columns array');
    } else {
      for (const col of f.columns) {
        if (!col || typeof col !== 'object') {
          errors.push('Footer column must be an object');
          continue;
        }
        if (typeof col.id !== 'string' || col.id.length === 0) errors.push('Footer column missing valid id');
        if (!Array.isArray(col.content) || !col.content.every((v) => typeof v === 'string')) {
          errors.push(`Footer column(${col.id ?? 'unknown'}) content must be string id array`);
        }
      }
      // referential integrity: content ids exist in children
      const childrenIds = new Set(f.children.map((c) => c.id));
      for (const col of f.columns) {
        for (const id of col.content) {
          if (!childrenIds.has(id)) errors.push(`Footer column(${col.id}) references missing child id: ${id}`);
        }
      }
      // orphan detection: no child outside any column content
      const referenced = new Set<string>();
      for (const col of f.columns) for (const id of col.content) referenced.add(id);
      for (const c of f.children) {
        if (!referenced.has(c.id)) errors.push(`Footer child not referenced by any column: ${c.id}`);
      }
    }
    const validateNavItemsList = (items: NavItem[] | undefined, label: string) => {
      if (items !== undefined) {
        if (!Array.isArray(items)) {
          errors.push(`Footer ${label} must be an array when provided`);
        } else {
          const ids = new Set<string>();
          for (const item of items) {
            if (!item || typeof item !== 'object') {
              errors.push(`Footer ${label} entry must be an object`);
              continue;
            }
            if (typeof item.id !== 'string' || item.id.length === 0) {
              errors.push(`Footer ${label} missing valid id`);
              continue;
            }
            if (ids.has(item.id)) errors.push(`Footer ${label} duplicate id: ${item.id}`);
            ids.add(item.id);
            if (typeof item.label !== 'string') {
              // Warn but don't fail for missing label, to prevent runtime crashes
              // errors.push(`Footer ${label}(${item.id}) missing label`);
            }
            if (item.kind === 'route') {
              if (typeof (item as any).slug !== 'string') {
                errors.push(`Footer ${label}(${item.id}) slug must be string`);
              }
            } else if (item.kind === 'url') {
              if (typeof (item as any).href !== 'string' || (item as any).href.length === 0) {
                errors.push(`Footer ${label}(${item.id}) href must be string`);
              }
              if ((item as any).newTab !== undefined && typeof (item as any).newTab !== 'boolean') {
                errors.push(`Footer ${label}(${item.id}) newTab must be boolean when provided`);
              }
            } else {
              errors.push(`Footer ${label}(${(item as any).id}) kind invalid`);
            }
          }
        }
      }
    };

    const navItems = (f.data as any)?.navItems as NavItem[] | undefined;
    validateNavItemsList(navItems, 'navItems');

    const socialLinks = (f.data as any)?.socialLinks as any[] | undefined;
    if (socialLinks !== undefined) {
      if (!Array.isArray(socialLinks)) {
        errors.push('Footer socialLinks must be an array when provided');
      } else {
        const allowedPlatforms = new Set(['instagram', 'facebook', 'x', 'tiktok', 'snapchat', 'youtube', 'whatsapp', 'linkedin', 'website']);
        const ids = new Set<string>();
        socialLinks.forEach((link, index) => {
          if (!link || typeof link !== 'object') {
            errors.push(`Footer socialLinks[${index}] must be an object`);
            return;
          }
          if (typeof link.id !== 'string' || link.id.length === 0) {
            errors.push(`Footer socialLinks[${index}].id must be a non-empty string`);
          } else if (ids.has(link.id)) {
            errors.push(`Footer socialLinks duplicate id: ${link.id}`);
          } else {
            ids.add(link.id);
          }
          if (typeof link.platform !== 'string' || !allowedPlatforms.has(link.platform)) {
            errors.push(`Footer socialLinks[${index}].platform must be a supported platform`);
          }
          if (link.href !== undefined && typeof link.href !== 'string') {
            errors.push(`Footer socialLinks[${index}].href must be a string when provided`);
          }
          if (link.label !== undefined && typeof link.label !== 'string') {
            errors.push(`Footer socialLinks[${index}].label must be a string when provided`);
          }
          if (link.newTab !== undefined && typeof link.newTab !== 'boolean') {
            errors.push(`Footer socialLinks[${index}].newTab must be boolean when provided`);
          }
        });
      }
    }

    const legal = (f.data as any)?.legal;
    if (legal !== undefined) {
      if (!legal || typeof legal !== 'object') {
        errors.push('Footer legal must be an object when provided');
      } else {
        if (legal.text !== undefined && typeof legal.text !== 'string') {
          errors.push('Footer legal.text must be a string when provided');
        }
        const legalLinks = legal.links as NavItem[] | undefined;
        validateNavItemsList(legalLinks, 'legal.links');
      }
    }
  }

  node.children.forEach((child) => validateNode(child, false, collector));

  if (errors.length) {
    const nodeId = typeof node.id === 'string' && node.id.length > 0 ? node.id : 'unknown';
    if (collector) {
      errors.forEach((reason) => collector({ nodeId, reason }));
    } else {
      const error = new Error(`Invalid node(${nodeId}): ${errors.join('; ')}`);
      // In dev, throw. In production, still throw to keep deterministic behavior per AC.
      throw error;
    }
  }
}

export function validateTree(snapshot: BlueprintStateSnapshot, collector?: ValidationCollector): void {
  if (!snapshot || typeof snapshot !== 'object') {
    if (collector) {
      collector({ nodeId: 'root', reason: 'Snapshot must be an object' });
      return;
    }
    throw new Error('Snapshot must be an object');
  }
  if (!snapshot.root) {
    if (collector) {
      collector({ nodeId: 'root', reason: 'Snapshot missing root' });
      return;
    }
    throw new Error('Snapshot missing root');
  }
  validateNode(snapshot.root, true, collector);

  // Ensure unique ids across the tree
  const seen = new Set<string>();
  const walk = (node: BlueprintNode) => {
    if (seen.has(node.id)) {
      const message = `Duplicate node id detected: ${node.id}`;
      if (collector) {
        collector({ nodeId: node.id, reason: message });
      } else {
        throw new Error(message);
      }
    } else {
      seen.add(node.id);
    }
    node.children?.forEach(walk);
  };
  walk(snapshot.root);
}
