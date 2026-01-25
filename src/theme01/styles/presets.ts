import type { AnyStyles } from './mapper';

export const Presets: Record<'Minimal' | 'Contrast' | 'Soft', AnyStyles> = {
  Minimal: {
    bg: 'surface',
    text: 'neutral',
    p: 4,
  },
  Contrast: {
    bg: 'primary',
    text: 'surface',
    p: 4,
    rounded: 'md',
    shadow: 'md',
  },
  Soft: {
    bg: 'muted',
    text: 'neutral',
    p: 3,
    rounded: 'lg',
  },
};


