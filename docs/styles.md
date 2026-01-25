# Theme01 Styles — Supported Props & Responsive Rules

## Supported props
- bg: token key from theme01Tokens.color → maps to `bg-{token}`
- text: token key from theme01Tokens.color → maps to `text-{token}`
- p, pt, pr, pb, pl, px, py: spacing steps (0,1,2,3,4,6,8,10,12,16) → `p-#`, ...
- m, mt, mr, mb, ml, mx, my: spacing steps → `m-#`, ...
- rounded: one of [none, sm, md, lg, xl, full] → `rounded-{value}`
- shadow: one of [none, sm, md, lg, xl] → `shadow-{value}`
- fontSize: one of [xs, sm, base, lg, xl, 2xl, 3xl] → `text-{value}`
- fontWeight: one of [thin, extralight, light, normal, medium, semibold, bold, extrabold, black] → `font-{value}`
- display: one of [block, inline, inline-block, flex, inline-flex, grid, inline-grid, contents, hidden]

## Responsive overrides
- Use nested keys `styles.sm`, `styles.md`, `styles.lg` for overrides.
- CSS classes are emitted in the order: base → `sm:` → `md:` → `lg:`.
- Example: `{ p: 2, sm: { p: 3 }, md: { p: 4 } }` → `p-2 sm:p-3 md:p-4`.

## Breakpoints source of truth
- Media queries are provided by Tailwind’s configured breakpoints.
- The `theme01Tokens.breakpoints` are documentation helpers only (not wired at runtime).
- Ensure Tailwind breakpoints match your design requirements.

## Presets & merging
- Presets (Minimal, Contrast, Soft) are merged non-destructively into `node.styles`.
- Existing keys are preserved; new keys are added. Nested responsive maps are merged key-by-key.

## Mapper order & conflicts
- Build order: base props first, then `sm`, then `md`, then `lg`.
- If a responsive override omits a prop, no class is emitted for that breakpoint (no implicit reset).
- Avoid mixing conflicting utilities in the same scope (e.g., both `hidden` and `flex`). The mapper does not dedupe conflicts.

## Notes
- To use color tokens like `bg-primary`/`text-surface`, ensure your Tailwind config defines these color names under `theme.extend.colors`.
- The mapper validates color token keys against `theme01Tokens.color` to prevent arbitrary class injection.


