// Runtime CSS generator for Theme01 utility classes
// Generates base utilities and responsive variants (sm:/md:/lg:) using theme tokens
import { theme01Tokens } from './tokens';
// Import raw JSON to get numeric font scale values
import rawJson from './theme01-tokens.json';

type CSSRule = string;
type Utility = { className: string; decl: string };

let injected = false;

function cssEscapeClass(className: string): string {
  // Escape characters that are special in CSS selectors (e.g., ':')
  return className.replace(/:/g, '\\:');
}

function toPx(value: number): string {
  return `${value}px`;
}

function buildSpacingSteps(): number[] {
  const keys = Object.keys(theme01Tokens.spacing);
  const numbers = keys
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const withZero = numbers.includes(0) ? numbers : [0, ...numbers];
  return withZero;
}

function spacingValue(step: number): string {
  // By design spacing token values are step * 4
  return toPx(step * 4);
}

function makeUtility(className: string, decl: string): Utility {
  return { className, decl };
}

function ruleFor(className: string, decl: string): CSSRule {
  return `:where(.${cssEscapeClass(className)}){${decl}}`;
}

function buildBaseUtilities(): Utility[] {
  const utils: Utility[] = [];

  // Colors
  for (const [name, hex] of Object.entries(theme01Tokens.color)) {
    utils.push(makeUtility(`bg-${name}`, `background-color:${hex}`));
    utils.push(makeUtility(`text-${name}`, `color:${hex}`));
    utils.push(makeUtility(`border-${name}`, `border-color:${hex}`));
  }

  // Radius
  for (const [name, radius] of Object.entries(theme01Tokens.radius)) {
    utils.push(makeUtility(`rounded-${name}`, `border-radius:${radius}`));
  }

  // Shadow
  for (const [name, shadow] of Object.entries(theme01Tokens.shadow)) {
    utils.push(makeUtility(`shadow-${name}`, `box-shadow:${shadow}`));
  }

  // Font sizes from raw JSON scale for exact pixel values
  const fontScale: Record<string, number> = ((rawJson as any)?.font?.scale ?? {}) as Record<string, number>;
  for (const [name, size] of Object.entries(fontScale)) {
    utils.push(makeUtility(`text-${name}`, `font-size:${toPx(size)}`));
  }

  // Font family (body)
  const fontFamily = (rawJson as any)?.font?.family as string | undefined;
  if (typeof fontFamily === 'string' && fontFamily.trim().length > 0) {
    utils.push(makeUtility('font-body', `font-family:${fontFamily}`));
  }

  // Font weights
  const weightMap: Record<string, number> = {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  };
  for (const [k, v] of Object.entries(weightMap)) {
    utils.push(makeUtility(`font-${k}`, `font-weight:${v}`));
  }

  // Text decoration
  utils.push(makeUtility('underline', 'text-decoration:underline'));
  utils.push(makeUtility('no-underline', 'text-decoration:none'));
  utils.push(makeUtility('line-through', 'text-decoration:line-through'));
  utils.push(makeUtility('overline', 'text-decoration:overline'));

  // Font style
  utils.push(makeUtility('italic', 'font-style:italic'));
  utils.push(makeUtility('not-italic', 'font-style:normal'));

  // Text alignment (including RTL-compatible start/end)
  utils.push(makeUtility('text-left', 'text-align:left'));
  utils.push(makeUtility('text-center', 'text-align:center'));
  utils.push(makeUtility('text-right', 'text-align:right'));
  utils.push(makeUtility('text-justify', 'text-align:justify'));
  utils.push(makeUtility('text-start', 'text-align:start'));
  utils.push(makeUtility('text-end', 'text-align:end'));

  // Additional font families for Arabic fonts
  const arabicFonts: Record<string, string> = {
    'cairo': '"Cairo", sans-serif',
    'tajawal': '"Tajawal", sans-serif',
    'almarai': '"Almarai", sans-serif',
    'ibm-plex-sans-arabic': '"IBM Plex Sans Arabic", sans-serif',
    'noto-sans-arabic': '"Noto Sans Arabic", sans-serif',
    'inter': '"Inter", sans-serif',
    'roboto': '"Roboto", sans-serif',
  };
  for (const [k, v] of Object.entries(arabicFonts)) {
    utils.push(makeUtility(`font-${k}`, `font-family:${v}`));
  }

  // Display
  const displays = ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents'];
  for (const d of displays) utils.push(makeUtility(d, `display:${d}`));
  utils.push(makeUtility('hidden', 'display:none'));
  // Grid helpers used by Row/Column renderer
  utils.push(makeUtility('grid-cols-12', 'grid-template-columns:repeat(12,minmax(0,1fr))'));
  for (let i = 1; i <= 12; i += 1) utils.push(makeUtility(`col-span-${i}`, `grid-column:span ${i} / span ${i}`));
  for (let i = 1; i <= 12; i += 1) utils.push(makeUtility(`col-start-${i}`, `grid-column-start:${i}`));

  // Line-height (Tailwind-like)
  const lineHeight: Record<string, number> = {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  };
  for (const [k, v] of Object.entries(lineHeight)) utils.push(makeUtility(`leading-${k}`, `line-height:${v}`));

  // Width and max-width
  utils.push(makeUtility('w-auto', 'width:auto'));
  utils.push(makeUtility('w-full', 'width:100%'));
  utils.push(makeUtility('w-screen', 'width:100vw'));
  const maxW: Record<string, string> = {
    full: '100%',
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
  };
  for (const [k, v] of Object.entries(maxW)) utils.push(makeUtility(`max-w-${k}`, `max-width:${v}`));

  // Gap
  for (const step of buildSpacingSteps()) {
    const px = spacingValue(step);
    utils.push(makeUtility(`gap-${step}`, `gap:${px}`));
  }

  // Align items / Justify content
  const ai: Record<string, string> = { start: 'flex-start', end: 'flex-end', center: 'center', baseline: 'baseline', stretch: 'stretch' };
  for (const [k, v] of Object.entries(ai)) utils.push(makeUtility(`items-${k}`, `align-items:${v}`));
  const jc: Record<string, string> = { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around', evenly: 'space-evenly' };
  for (const [k, v] of Object.entries(jc)) utils.push(makeUtility(`justify-${k}`, `justify-content:${v}`));

  // Borders
  utils.push(makeUtility('border', 'border-width:1px'));
  for (const step of buildSpacingSteps()) {
    const px = toPx(step);
    utils.push(makeUtility(`border-${step}`, `border-width:${px}`));
  }
  const bs = ['solid', 'dashed', 'dotted', 'double', 'none'] as const;
  for (const s of bs) utils.push(makeUtility(`border-${s}`, `border-style:${s}`));
  // Rounded full convenience
  utils.push(makeUtility('rounded-full', 'border-radius:9999px'));

  // Padding / Margin utilities
  const steps = buildSpacingSteps();
  for (const step of steps) {
    const px = spacingValue(step);
    utils.push(makeUtility(`p-${step}`, `padding:${px}`));
    utils.push(makeUtility(`pt-${step}`, `padding-top:${px}`));
    utils.push(makeUtility(`pr-${step}`, `padding-right:${px}`));
    utils.push(makeUtility(`pb-${step}`, `padding-bottom:${px}`));
    utils.push(makeUtility(`pl-${step}`, `padding-left:${px}`));
    utils.push(makeUtility(`px-${step}`, `padding-left:${px};padding-right:${px}`));
    utils.push(makeUtility(`py-${step}`, `padding-top:${px};padding-bottom:${px}`));

    utils.push(makeUtility(`m-${step}`, `margin:${px}`));
    utils.push(makeUtility(`mt-${step}`, `margin-top:${px}`));
    utils.push(makeUtility(`mr-${step}`, `margin-right:${px}`));
    utils.push(makeUtility(`mb-${step}`, `margin-bottom:${px}`));
    utils.push(makeUtility(`ml-${step}`, `margin-left:${px}`));
    utils.push(makeUtility(`mx-${step}`, `margin-left:${px};margin-right:${px}`));
    utils.push(makeUtility(`my-${step}`, `margin-top:${px};margin-bottom:${px}`));
  }

  // Common container helper
  utils.push(makeUtility('mx-auto', 'margin-left:auto;margin-right:auto'));

  return utils;
}

function wrapHoverRules(utils: Utility[]): CSSRule {
  // Build ":where(.hover\:class:hover){decl}" rules
  return utils
    .map((u) => `:where(.${cssEscapeClass(`hover:${u.className}`)}:hover){${u.decl}}`)
    .join('');
}

function wrapResponsive(utils: Utility[], prefix: 'sm' | 'md' | 'lg', minWidthPx: number): CSSRule {
  const body = utils
    .map((u) => ruleFor(`${prefix}:${u.className}`, u.decl))
    .join('');
  return `@media (min-width:${minWidthPx}px){${body}}`;
}

function buildAllCSS(): string {
  const base = buildBaseUtilities();
  const css: string[] = [];
  css.push(base.map((u) => ruleFor(u.className, u.decl)).join(''));
  // Hover variants
  css.push(wrapHoverRules(base));
  const { sm, md, lg } = theme01Tokens.breakpoints;
  css.push(wrapResponsive(base, 'sm', sm));
  css.push(wrapResponsive(base, 'md', md));
  css.push(wrapResponsive(base, 'lg', lg));
  return css.join('');
}

export function getRuntimeCSS(): string {
  return buildAllCSS();
}

export function ensureRuntimeStylesInjected(): void {
  if (injected) return;
  if (typeof document === 'undefined' || !document?.head) return;
  const style = document.createElement('style');
  style.setAttribute('data-theme01-runtime', '');
  style.textContent = getRuntimeCSS();
  document.head.appendChild(style);
  injected = true;
}
