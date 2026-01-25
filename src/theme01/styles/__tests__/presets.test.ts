import { describe, it, expect } from 'vitest';
import { Presets } from '../../styles/presets';
import { mergeStylesNonDestructive, mapStylesToClasses } from '../../styles/mapper';
import { theme01Tokens } from '../../styles/tokens';

describe('Presets merge non-destructive', () => {
  it('لا يكتب فوق قيم موجودة ويضيف الناقص', () => {
    const existing = { p: 2, text: 'neutral', sm: { p: 3 } } as any;
    const merged = mergeStylesNonDestructive(existing, Presets.Contrast) as any;
    expect(merged.p).toBe(2); // existing preserved
    expect(merged.text).toBe('neutral');
    expect(merged.bg).toBe('primary');
    expect(merged.rounded).toBe('md');
    expect(merged.shadow).toBe('md');
    expect(merged.sm.p).toBe(3);
  });

  it('تطبيق preset ينتج أصناف صحيحة', () => {
    const styles = mergeStylesNonDestructive({}, Presets.Minimal);
    const classes = mapStylesToClasses(styles as any, theme01Tokens);
    expect(classes.includes('bg-surface')).toBe(true);
    expect(classes.includes('text-neutral')).toBe(true);
    expect(classes.includes('p-4')).toBe(true);
  });
});


