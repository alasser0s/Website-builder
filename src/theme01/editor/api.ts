import type { BlueprintNode, BlueprintStateSnapshot, FooterNode, HeaderNode } from '../foundation/types';
import { generateNodeId } from '../foundation/id';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

const USE_MOCKS = (() => {
  const flag = (import.meta as any)?.env?.VITE_USE_MOCKS as string | undefined;
  return flag === 'true' || flag === '1';
})();

const MOCK_STORAGE_KEY = 'yami_builder_mock_state';

function normalizeBase(input?: string) {
  if (!input) return '';
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

function resolveApiBase() {
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  if (envBase) return normalizeBase(envBase);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBase(window.location.origin);
  }
  return '';
}

export function getApiBase() {
  return resolveApiBase();
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function safeJsonParse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function makeNode(type: BlueprintNode['type'], data?: Record<string, unknown>): BlueprintNode {
  return {
    id: generateNodeId(type),
    type,
    data,
    children: [],
  } as BlueprintNode;
}

function buildMockSnapshot(): BlueprintStateSnapshot {
  const header: HeaderNode = {
    id: generateNodeId('header'),
    type: 'header',
    children: [],
    slots: { logo: [], right: [] },
    data: { navItems: [] },
  };

  const heroHeading = makeNode('heading', { text: 'Mock Builder', level: 1 });
  const heroBody = makeNode('paragraph', { text: 'Drag sections to reorder. Edit content on the right.' });
  const heroButton = makeNode('button', { label: 'Explore menu', href: { kind: 'url', href: '#menu' } });
  const heroRow = makeNode('row');
  (heroRow as any).columns = [{ span: 12, offset: 0, content: [heroHeading.id, heroBody.id, heroButton.id] }];
  heroRow.children = [heroHeading, heroBody, heroButton];

  const heroSection = makeNode('section');
  heroSection.children = [heroRow];
  (heroSection as any).content = [heroRow.id];

  const imageNode = makeNode('image', {
    src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
    alt: 'Mock food',
  });
  const featureHeading = makeNode('heading', { text: 'Feature section', level: 2 });
  const featureBody = makeNode('paragraph', { text: 'Use the builder to arrange sections and update copy.' });
  const featureRow = makeNode('row');
  (featureRow as any).columns = [
    { span: 6, offset: 0, content: [imageNode.id] },
    { span: 6, offset: 0, content: [featureHeading.id, featureBody.id] },
  ];
  featureRow.children = [imageNode, featureHeading, featureBody];

  const featureSection = makeNode('section');
  featureSection.children = [featureRow];
  (featureSection as any).content = [featureRow.id];

  const footer: FooterNode = {
    id: generateNodeId('footer'),
    type: 'footer',
    children: [],
    data: { navItems: [], socialLinks: [], legal: { text: '', links: [] } },
    columns: [],
  };

  const pageRoot: BlueprintNode = {
    id: 'page_root',
    type: 'page',
    children: [header, heroSection, featureSection, footer],
  };

  return { root: pageRoot };
}

function buildMockWebsite(websiteId: number): EditorWebsite {
  const snapshot = buildMockSnapshot();
  return {
    id: websiteId,
    domain: 'mock.yamihub.local',
    internal_domain: 'mock.yamihub.local',
    status: 'draft',
    language: 'en',
    brand_settings: {},
    is_published: false,
    theme: { id: 1, name: 'Theme 01' },
    pages: [
      {
        id: 1,
        title: 'Home',
        slug: 'home',
        draft_structure: snapshot,
        meta_data: { seo_title: 'Mock Home', seo_description: 'Builder mock page.' },
      },
      {
        id: 2,
        title: 'Menu',
        slug: 'menu',
        draft_structure: snapshot,
        meta_data: {},
      },
    ],
  };
}

function loadMockWebsite(websiteId: number): EditorWebsite {
  if (typeof window === 'undefined') {
    return buildMockWebsite(websiteId);
  }
  const stored = safeJsonParse(localStorage.getItem(MOCK_STORAGE_KEY) || '');
  if (stored && stored.website) {
    const website = stored.website as EditorWebsite;
    if (!Array.isArray(website.pages)) {
      const rebuilt = buildMockWebsite(websiteId);
      saveMockWebsite(rebuilt);
      return rebuilt;
    }
    if (website.id !== websiteId) {
      website.id = websiteId;
    }
    return website;
  }
  const website = buildMockWebsite(websiteId);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ website }));
  return website;
}

function saveMockWebsite(website: EditorWebsite) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ website }));
}

function slugify(value: string): string {
  const base = value.trim().toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'page';
}

function safeParse(text: string): any {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return { detail: text };
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (USE_MOCKS) {
    throw new Error('Mock mode enabled. Network request disabled.');
  }
  const base = resolveApiBase();
  const token = options.token ?? getToken();
  const method = options.method || 'GET';
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (token) headers.append('Authorization', `Bearer ${token}`);

  console.log('[API Request]', method, path, {
    headers: Object.fromEntries(headers.entries()),
    body: options.body
  });

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });
  const text = await response.text();
  const data = safeParse(text);
  if (!response.ok) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : (data ? JSON.stringify(data) : 'Request failed.');
    const error: any = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export type EditorPage = {
  id: number;
  title: string;
  slug: string;
  content?: any;
  draft_structure?: any;
  meta_data?: Record<string, unknown>;
};

export type EditorWebsite = {
  id: number;
  domain?: string | null;
  internal_domain?: string | null;
  status?: string;
  language?: string;
  brand_settings?: Record<string, unknown>;
  is_published?: boolean;
  theme?: { id: number; name: string } | null;
  pages: EditorPage[];
};

export function fetchWebsiteEditor(websiteId: number) {
  if (USE_MOCKS) {
    return Promise.resolve(loadMockWebsite(websiteId));
  }
  return request<EditorWebsite>(`/api/v1/store/websites/${websiteId}/editor/`);
}

export function updatePage(websiteId: number, pageId: number, payload: Partial<EditorPage>) {
  if (USE_MOCKS) {
    const website = loadMockWebsite(websiteId);
    const idx = website.pages.findIndex((page) => page.id === pageId);
    if (idx === -1) {
      return Promise.reject(new Error('Page not found.'));
    }
    const current = website.pages[idx];
    const next: EditorPage = {
      ...current,
      ...payload,
      meta_data: payload.meta_data ? { ...(current.meta_data || {}), ...(payload.meta_data || {}) } : current.meta_data,
    };
    website.pages = [...website.pages.slice(0, idx), next, ...website.pages.slice(idx + 1)];
    saveMockWebsite(website);
    return Promise.resolve(next);
  }
  return request<EditorPage>(`/api/v1/store/websites/${websiteId}/pages/${pageId}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export function createPage(websiteId: number, title: string) {
  if (USE_MOCKS) {
    const website = loadMockWebsite(websiteId);
    const nextId = Math.max(...website.pages.map((page) => page.id), 0) + 1;
    const page: EditorPage = {
      id: nextId,
      title,
      slug: slugify(title),
      draft_structure: { root: buildMockSnapshot().root },
      meta_data: {},
    };
    website.pages = [...website.pages, page];
    saveMockWebsite(website);
    return Promise.resolve(page);
  }
  return request<EditorPage>(`/api/v1/store/websites/${websiteId}/pages/`, {
    method: 'POST',
    body: { title },
  });
}

export function publishWebsite(websiteId: number) {
  if (USE_MOCKS) {
    return Promise.resolve({ detail: 'Mock publish queued.' });
  }
  return request<{ detail?: string }>(`/api/v1/store/websites/${websiteId}/publish/`, {
    method: 'POST',
  });
}

export type SignedUploadPayload = {
  url: string;
  fields: Record<string, string>;
};

export function createSignedUpload(fileName: string, fileType: string) {
  if (USE_MOCKS) {
    return Promise.resolve({ url: 'mock://upload', fields: {} });
  }
  return request<SignedUploadPayload>('/api/v1/uploads/generate-signed-url/', {
    method: 'POST',
    body: { file_name: fileName, file_type: fileType },
  });
}

export async function uploadFileToSignedUrl(file: File, payload: SignedUploadPayload) {
  if (USE_MOCKS || payload?.url?.startsWith('mock://')) {
    return URL.createObjectURL(file);
  }
  const formData = new FormData();
  Object.entries(payload.fields || {}).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);
  const response = await fetch(payload.url, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Upload failed.');
  }
  const key = payload.fields?.key;
  return key ? `${payload.url}/${key}` : payload.url;
}
