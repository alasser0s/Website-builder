// Adapt Theme 01 to load tokens from JSON source while preserving TypeScript API
import rawJson from './theme01-tokens.json';

export interface ThemeColorTokens {
  [name: string]: string;
}

export interface ThemeSpacingTokens {
  [step: string]: number;
}

export interface ThemeRadiusTokens {
  [name: string]: string;
}

export interface ThemeShadowTokens {
  [name: string]: string;
}

export interface ThemeFontSizeTokens {
  [name: string]: string;
}

// Nav styling tokens (default/hover/active)
export type ThemeTextDecorationToken = 'none' | 'underline' | 'line-through' | 'overline';
export interface ThemeNavStateTokens {
  color?: string; // key from ThemeColorTokens
  weight?: 'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
  decoration?: ThemeTextDecorationToken;
}
export interface ThemeNavTokens {
  default?: ThemeNavStateTokens;
  hover?: ThemeNavStateTokens;
  active?: ThemeNavStateTokens;
}

export interface ThemeBreakpoints {
  sm: number;
  md: number;
  lg: number;
}

export interface ThemeTokens {
  color: ThemeColorTokens;
  spacing: ThemeSpacingTokens;
  radius: ThemeRadiusTokens;
  shadow: ThemeShadowTokens;
  fontSize: ThemeFontSizeTokens;
  breakpoints: ThemeBreakpoints;
  nav: ThemeNavTokens;
}

// Shape of the JSON file
interface RawJsonTokens {
  color: Record<string, string>;
  font: { family: string; scale: Record<string, number> };
  space: Record<string, number>;
  radius: Record<string, number>;
  shadow: Record<string, string>;
  breakpoints: ThemeBreakpoints;
  nav?: ThemeNavTokens;
}

const source = rawJson as unknown as RawJsonTokens;

function px(value: number): string {
  return `${value}px`;
}

function toRadiusTokens(input: Record<string, number>): ThemeRadiusTokens {
  const out: ThemeRadiusTokens = {};
  for (const [k, v] of Object.entries(input)) out[k] = px(v);
  return out;
}

function toFontSizeTokens(scale: Record<string, number>): ThemeFontSizeTokens {
  const out: ThemeFontSizeTokens = {};
  for (const [k] of Object.entries(scale)) out[k] = `text-${k}`;
  return out;
}

function toShadowTokens(shadow: Record<string, string>): ThemeShadowTokens {
  const out: ThemeShadowTokens = {};
  for (const [k, value] of Object.entries(shadow)) out[k] = value;
  return out;
}

const spacing: ThemeSpacingTokens = (() => {
  const map: ThemeSpacingTokens = {};
  // Preserve existing numeric steps commonly used by StylesPanel
  const allowed = new Set(['0','1','2','3','4','5','6','8','10','12','16']);
  for (const step of allowed) {
    const n = Number(step);
    if (Number.isFinite(n)) {
      // Derive from json space scale approximately in px (fallbacks)
      // keep previous behavior where these are documentation-only numbers
      map[step] = n * 4;
    }
  }
  return map;
})();

export const theme01Tokens: ThemeTokens = {
  color: source.color,
  spacing,
  radius: toRadiusTokens(source.radius),
  shadow: toShadowTokens(source.shadow),
  fontSize: toFontSizeTokens(source.font.scale),
  breakpoints: source.breakpoints,
  nav: source.nav ?? {
    default: { color: 'text', weight: 'normal', decoration: 'none' },
    hover: { color: 'primary', weight: 'medium', decoration: 'underline' },
    active: { color: 'primary', weight: 'semibold', decoration: 'underline' },
  },
};

export type AllowedStyleProp =
  | 'bg'
  | 'text'
  | 'textAlign'
  | 'p' | 'pt' | 'pr' | 'pb' | 'pl' | 'px' | 'py'
  | 'm' | 'mt' | 'mr' | 'mb' | 'ml' | 'mx' | 'my'
  | 'rounded'
  | 'shadow'
  | 'fontSize'
  | 'fontWeight'
  | 'display'
  | 'lineHeight'
  | 'letterSpacing'
  | 'width'
  | 'maxWidth'
  | 'indent'
  | 'itemGap'
  | 'listStyle'
  | 'thickness'
  | 'gap'
  | 'align'
  | 'justify'
  | 'borderWidth'
  | 'borderStyle'
  | 'borderColor';

export const allowedStyleProps: AllowedStyleProp[] = [
  'bg', 'text',
  'textAlign',
  'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
  'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my',
  'rounded', 'shadow', 'fontSize', 'fontWeight', 'display',
  'lineHeight', 'letterSpacing', 'width', 'maxWidth', 'indent', 'itemGap', 'listStyle', 'thickness', 'gap', 'align', 'justify', 'borderWidth', 'borderStyle', 'borderColor',
];

