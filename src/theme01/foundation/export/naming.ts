const THEME_PREFIX = 'theme01';
const DEFAULT_SLUG = 'page';

export function normalizeExportSlug(slug: string | null | undefined): string {
  const normalized = String(slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || DEFAULT_SLUG;
}

export function buildExportFilename(slug: string | null | undefined): string {
  const normalizedSlug = normalizeExportSlug(slug);
  return `${THEME_PREFIX}-${normalizedSlug}.json`;
}