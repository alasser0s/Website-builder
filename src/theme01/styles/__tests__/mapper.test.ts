import { describe, it, expect } from 'vitest';
import { mapStylesToClasses, mergeStylesNonDestructive } from '../../styles/mapper';
import { theme01Tokens } from '../../styles/tokens';

describe('Style mapper', () => {
  it('يحول خصائص أساسية إلى أصناف', () => {
    const cls = mapStylesToClasses({ bg: 'primary', text: 'surface', p: 4, rounded: 'md', shadow: 'md' }, theme01Tokens);
    expect(cls.split(' ').sort()).toEqual(['bg-primary','p-4','rounded-md','shadow-md','text-surface'].sort());
  });

  it('يدعم responsive sm/md/lg', () => {
    const cls = mapStylesToClasses({ p: 2, sm: { p: 3 }, md: { p: 4 }, lg: { p: 6 } }, theme01Tokens);
    expect(cls.includes('p-2')).toBe(true);
    expect(cls.includes('sm:p-3')).toBe(true);
    expect(cls.includes('md:p-4')).toBe(true);
    expect(cls.includes('lg:p-6')).toBe(true);
  });
});

describe('Non-destructive merge', () => {
  it('يحافظ على القيم الموجودة ويدمج المتداخلة', () => {
    const existing = { p: 2, sm: { p: 3, m: 1 }, text: 'neutral' } as any;
    const incoming = { p: 4, sm: { m: 2 }, bg: 'primary' } as any;
    const merged = mergeStylesNonDestructive(existing, incoming) as any;
    // existing base p should remain 2
    expect(merged.p).toBe(2);
    // new bg added
    expect(merged.bg).toBe('primary');
    // nested sm.m stays existing (1), not overridden by 2
    expect(merged.sm.m).toBe(1);
    // sm.p remains 3
    expect(merged.sm.p).toBe(3);
  });
});


