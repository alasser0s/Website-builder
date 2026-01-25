import type { ThemeTokens, AllowedStyleProp } from './tokens';

type StyleRecord = Record<string, unknown> | undefined;

type BaseStyleProps = Partial<Record<AllowedStyleProp, unknown>>;

interface ResponsiveStyleProps {
  sm?: BaseStyleProps;
  md?: BaseStyleProps;
  lg?: BaseStyleProps;
}

export type AnyStyles = BaseStyleProps & ResponsiveStyleProps;

function normalizeStep(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.abs(Math.trunc(value)));
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return undefined;
}

function mapSpacing(prefix: 'p' | 'm' | 'pt' | 'pr' | 'pb' | 'pl' | 'px' | 'py' | 'mt' | 'mr' | 'mb' | 'ml' | 'mx' | 'my',
  value: unknown): string | '' {
  const step = normalizeStep(value);
  if (!step) return '';
  return `${prefix}-${step}`;
}

function mapBg(value: unknown, tokens: ThemeTokens): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  // Only allow known token names to avoid arbitrary class injection
  if (Object.prototype.hasOwnProperty.call(tokens.color, key)) return `bg-${key}`;
  return '';
}

function mapTextColor(value: unknown, tokens: ThemeTokens): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  if (Object.prototype.hasOwnProperty.call(tokens.color, key)) return `text-${key}`;
  return '';
}

function mapRounded(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  return value === 'full' || value.startsWith('rounded-') ? value : `rounded-${value}`;
}

function mapShadow(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  return value.startsWith('shadow') ? value : `shadow-${value}`;
}

function mapFontSize(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  return value.startsWith('text-') ? value : `text-${value}`;
}

function mapFontWeight(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const allowed = new Set(['thin','extralight','light','normal','medium','semibold','bold','extrabold','black']);
  const key = value.trim();
  if (key.startsWith('font-')) return key;
  return allowed.has(key) ? `font-${key}` : '';
}

function mapTextAlign(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  const allowed = new Set(['left','center','right','justify']);
  return allowed.has(key) ? `text-${key}` : '';
}

function mapDisplay(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const allowed = new Set(['block','inline','inline-block','flex','inline-flex','grid','inline-grid','contents','hidden']);
  const key = value.trim();
  return allowed.has(key) ? key : '';
}

function mapLineHeight(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  // tailwind leading-*
  if (key.startsWith('leading-')) return key;
  const allowed = new Set(['none','tight','snug','normal','relaxed','loose']);
  return allowed.has(key) ? `leading-${key}` : '';
}

function mapLetterSpacing(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  if (key.startsWith('tracking-')) return key;
  const allowed = new Set(['tighter','tight','normal','wide','wider','widest']);
  return allowed.has(key) ? `tracking-${key}` : '';
}

function mapWidth(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  // accept w-*, max-w-*
  if (key.startsWith('w-') || key.startsWith('max-w-')) return key;
  const allowed = new Set(['auto','full','screen']);
  return allowed.has(key) ? `w-${key}` : '';
}

function mapMaxWidthClass(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  if (key.startsWith('max-w-')) return key;
  const allowed = new Set(['0','xs','sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','full','min','max','fit','prose','screen-sm','screen-md','screen-lg','screen-xl','screen-2xl']);
  return allowed.has(key) ? `max-w-${key}` : '';
}

function mapListStyle(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  if (key.startsWith('list-') || key.startsWith('marker-')) return key;
  const mapping = new Map<string, string>([
    ['disc', 'list-disc'],
    ['decimal', 'list-decimal'],
    ['none', 'list-none'],
    ['inside', 'list-inside'],
    ['outside', 'list-outside'],
  ]);
  return mapping.get(key) ?? '';
}

function mapItemGap(value: unknown): string | '' {
  const step = normalizeStep(value);
  if (!step) return '';
  return step === '0' ? 'space-y-0' : `space-y-${step}`;
}

function mapGapClass(value: unknown): string | '' {
  const step = normalizeStep(value);
  if (!step) return '';
  return `gap-${step}`;
}

function mapAlignItems(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  const allowed = new Set(['start','end','center','baseline','stretch']);
  return allowed.has(key) ? `items-${key}` : '';
}

function mapJustifyContent(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  const allowed = new Set(['start','end','center','between','around','evenly']);
  return allowed.has(key) ? `justify-${key}` : '';
}

function mapBorderWidth(value: unknown): string | '' {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') {
    const key = value.trim();
    if (key.startsWith('border-')) return key;
    const step = normalizeStep(key);
    return step ? (step === '0' ? 'border-0' : `border-${step}`) : 'border';
  }
  if (typeof value === 'number') {
    const step = normalizeStep(value);
    return step ? (step === '0' ? 'border-0' : `border-${step}`) : 'border';
  }
  return 'border';
}

function mapBorderStyle(value: unknown): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  const allowed = new Set(['solid','dashed','dotted','double','none']);
  return allowed.has(key) ? `border-${key}` : '';
}

function mapBorderColor(value: unknown, tokens: ThemeTokens): string | '' {
  if (typeof value !== 'string' || !value) return '';
  const key = value.trim();
  if (Object.prototype.hasOwnProperty.call(tokens.color, key)) return `border-${key}`;
  return '';
}

function mapBaseProps(props: BaseStyleProps, tokens: ThemeTokens): string[] {
  const classes: string[] = [];
  // 1) display
  if (props.display !== undefined) classes.push(mapDisplay(props.display));
  // 2) gap
  if (props.gap !== undefined) classes.push(mapGapClass(props.gap));
  // 3) align/justify
  if (props.align !== undefined) classes.push(mapAlignItems(props.align));
  if (props.justify !== undefined) classes.push(mapJustifyContent(props.justify));
  // 4) width / max-w
  if (props.width !== undefined) classes.push(mapWidth(props.width));
  if ((props as any).maxWidth !== undefined) classes.push(mapMaxWidthClass((props as any).maxWidth));
  // 5) indent
  if ((props as any).indent !== undefined) classes.push(mapSpacing('pl', (props as any).indent));
  // 6) list style
  if ((props as any).listStyle !== undefined) classes.push(mapListStyle((props as any).listStyle));
  // 7) item gap
  if ((props as any).itemGap !== undefined) classes.push(mapItemGap((props as any).itemGap));
  // 8) padding/margins (p.. then m..)
  const paddingKeys = ['p','pt','pr','pb','pl','px','py'] as const;
  for (const key of paddingKeys) {
    const val = (props as any)[key];
    if (val !== undefined) classes.push(mapSpacing(key, val));
  }
  const marginKeys = ['m','mt','mr','mb','ml','mx','my'] as const;
  for (const key of marginKeys) {
    const val = (props as any)[key];
    if (val !== undefined) classes.push(mapSpacing(key, val));
  }
  // 9) borderWidth
  if ((props as any).borderWidth !== undefined) classes.push(mapBorderWidth((props as any).borderWidth));
  // 10) borderStyle
  if ((props as any).borderStyle !== undefined) classes.push(mapBorderStyle((props as any).borderStyle));
  // 11) borderColor
  if ((props as any).borderColor !== undefined) classes.push(mapBorderColor((props as any).borderColor, tokens));
  // 12) rounded
  if (props.rounded !== undefined) classes.push(mapRounded(props.rounded));
  // 13) shadow
  if (props.shadow !== undefined) classes.push(mapShadow(props.shadow));
  // 14) typography then colors
  if (props.fontSize !== undefined) classes.push(mapFontSize(props.fontSize));
  if (props.fontWeight !== undefined) classes.push(mapFontWeight(props.fontWeight));
  if (props.lineHeight !== undefined) classes.push(mapLineHeight(props.lineHeight));
  if ((props as any).letterSpacing !== undefined) classes.push(mapLetterSpacing((props as any).letterSpacing));
  if ((props as any).textAlign !== undefined) classes.push(mapTextAlign((props as any).textAlign));
  // text/bg at the very end
  if (props.text !== undefined) classes.push(mapTextColor(props.text, tokens));
  if (props.bg !== undefined) classes.push(mapBg(props.bg, tokens));
  return classes.filter(Boolean);
}

export function mapStylesToClasses(styles: StyleRecord, tokens: ThemeTokens): string {
  if (!styles) return '';
  // separate responsive keys
  const { sm, md, lg, ...base } = styles as AnyStyles;
  const baseClasses = mapBaseProps(base as BaseStyleProps, tokens);
  const smClasses = mapBaseProps((sm ?? {}) as BaseStyleProps, tokens).map((c) => (c ? `sm:${c}` : ''));
  const mdClasses = mapBaseProps((md ?? {}) as BaseStyleProps, tokens).map((c) => (c ? `md:${c}` : ''));
  const lgClasses = mapBaseProps((lg ?? {}) as BaseStyleProps, tokens).map((c) => (c ? `lg:${c}` : ''));
  return [...baseClasses, ...smClasses, ...mdClasses, ...lgClasses].filter(Boolean).join(' ');
}

export function mergeStylesNonDestructive<T extends object | undefined, U extends object | undefined>(existing: T, incoming: U): T & U {
  // recursively merge, preserving existing keys
  const result: any = Array.isArray(existing) ? [...(existing as any)] : { ...(existing as any ?? {}) };
  const source: any = (incoming as any) ?? {};
  for (const key of Object.keys(source)) {
    const has = Object.prototype.hasOwnProperty.call(result, key);
    const srcVal = (source as any)[key];
    const dstVal = (result as any)[key];
    if (has) {
      if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && dstVal && typeof dstVal === 'object' && !Array.isArray(dstVal)) {
        result[key] = mergeStylesNonDestructive(dstVal, srcVal);
      } else {
        // keep existing value (non-destructive)
      }
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}

