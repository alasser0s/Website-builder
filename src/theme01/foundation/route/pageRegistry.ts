// src/theme01/foundation/route/pageRegistry.ts
import { useMemo } from 'react';
import type { BlueprintStateSnapshot } from '../../foundation/types';
// نستخدم مثالاً جاهزاً يمثل Snapshot صالح لصفحة تحتوي Header
import { header_example, not_found_example } from '../../blueprint/examples';

export type PageEntry = {
  slug: string;
  title: string;
  blueprint: BlueprintStateSnapshot;
};

export const pageRegistry: Record<string, PageEntry> = {
  about: {
    slug: 'about',
    title: 'About',
    blueprint: header_example,
  },
  '404': {
    slug: '404',
    title: 'Not Found',
    blueprint: not_found_example,
  },
};

// فاصل صغير لتنظيف السلاج
function normalizeSlug(input: string | undefined | null): string {
  const key = String(input || '').trim().replace(/^\/+|\/+$/g, '');
  return key;
}

// Resolver لا يعتمد على React — ممتاز للاختبارات
export function resolvePage(slug: string | undefined | null): PageEntry | null {
  const key = normalizeSlug(slug);
  if (!key) return null;
  return pageRegistry[key] ?? null;
}

// Hook نحيف يلفّ حول resolvePage
export function usePage(slug: string | undefined | null): PageEntry | null {
  return useMemo(() => resolvePage(slug), [slug]);
}

export function resolveNotFoundPage(): PageEntry | null {
  return pageRegistry['404'] ?? null;
}
