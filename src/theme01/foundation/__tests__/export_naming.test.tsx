import { describe, expect, it } from 'vitest';

import { buildExportFilename, normalizeExportSlug } from '../../foundation/export/naming';

describe('export naming', () => {
  it('normalizes slug to lowercase hyphenated form', () => {
    expect(normalizeExportSlug('Landing Page')).toBe('landing-page');
    expect(normalizeExportSlug('  FEATURE  ')).toBe('feature');
  });

  it('preserves numeric slugs and collapses punctuation', () => {
    expect(normalizeExportSlug('404')).toBe('404');
    expect(normalizeExportSlug('Featured?? Promo!!!')).toBe('featured-promo');
  });

  it('defaults to page when slug missing', () => {
    expect(normalizeExportSlug('')).toBe('page');
    expect(normalizeExportSlug(null)).toBe('page');
  });

  it('builds theme filename from normalized slug', () => {
    expect(buildExportFilename('About Us')).toBe('theme01-about-us.json');
    expect(buildExportFilename('FEATURED')).toBe('theme01-featured.json');
    expect(buildExportFilename('')).toBe('theme01-page.json');
  });
});
