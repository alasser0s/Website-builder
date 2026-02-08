import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlueprintProvider, Renderer } from '../foundation/renderer/Renderer';
import { usePageBlueprintStore } from '../foundation/store';
import { createInitialSkeleton } from '../foundation/skeleton';
import type { BlueprintNode, BlueprintStateSnapshot } from '../foundation/types';
import { selectNodeById, selectPath } from '../foundation/selectors';
import { ContentPanel } from './ContentPanel';
import { StylesPanel } from '../panels/StylesPanel';
import { TextHoverToolbar } from './TextHoverToolbar';
import { ImageEditorPopup } from './ImageEditorPopup';
import { BLOCK_PRESETS, BLOCK_SECTIONS } from './presets';
import { createPage, createSignedUpload, fetchWebsiteEditor, getApiBase, publishWebsite, updatePage, uploadFileToSignedUrl, type EditorPage, type EditorWebsite } from './api';

type EditorPageEntry = EditorPage & { snapshot: BlueprintStateSnapshot };

type PageDraft = {
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  priority: string;
  changefreq: string;
};

type DropPosition = 'before' | 'after';

type DropTarget = {
  id: string;
  position: DropPosition;
};

const DRAGGABLE_TYPES = new Set(['section', 'row', 'container']);
const ALLOWED_PARENT_TYPES = new Set(['page', 'section', 'container']);
const TEXT_NODE_TYPES = new Set(['heading', 'paragraph', 'button']);
// All node types that can be deleted (excludes page, header, footer which are structural)
const DELETABLE_TYPES = new Set([
  'section', 'row', 'container', 'column',
  'heading', 'paragraph', 'button', 'image', 'list',
  'badge', 'divider', 'card',
  'features', 'gallery', 'slider', 'testimonials',
  'input', 'textarea', 'select',
  'map', 'opening_hours', 'menu_grid', 'cart',
]);

// Arabic labels for element types
const ELEMENT_TYPE_LABELS: Record<string, string> = {
  heading: 'عنوان',
  paragraph: 'نص',
  button: 'زر',
  image: 'صورة',
  section: 'قسم',
  container: 'حاوية',
  row: 'صف',
  column: 'عمود',
  list: 'قائمة',
  footer: 'تذييل',
  nav: 'قائمة التنقل',
};

function buildPageDraft(page: EditorPage | null): PageDraft {
  const meta = (page?.meta_data ?? {}) as Record<string, unknown>;
  return {
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    seo_title: typeof meta.seo_title === 'string' ? meta.seo_title : '',
    seo_description: typeof meta.seo_description === 'string' ? meta.seo_description : '',
    priority: meta.priority !== undefined ? String(meta.priority) : '',
    changefreq: typeof meta.changefreq === 'string' ? meta.changefreq : '',
  };
}

function buildMetaPatch(draft: PageDraft): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const seoTitle = draft.seo_title.trim();
  const seoDescription = draft.seo_description.trim();
  const priority = draft.priority.trim();
  const changefreq = draft.changefreq.trim();
  if (seoTitle) patch.seo_title = seoTitle;
  if (seoDescription) patch.seo_description = seoDescription;
  if (priority) {
    const parsed = Number(priority);
    if (Number.isFinite(parsed)) patch.priority = parsed;
  }
  if (changefreq) patch.changefreq = changefreq;
  return patch;
}

function getParentInfo(root: BlueprintNode, nodeId: string) {
  const path = selectPath(root, nodeId);
  if (!path || path.idPath.length < 2) return null;
  const parentId = path.idPath[path.idPath.length - 2];
  const index = path.indexPath[path.indexPath.length - 1];
  return { parentId, index };
}

function findFirstNodeIdByType(root: BlueprintNode, type: BlueprintNode['type']): string | null {
  const queue: BlueprintNode[] = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.type === type) return current.id;
    if (current.children && current.children.length > 0) {
      queue.push(...current.children);
    }
  }
  return null;
}

function resolveInsertIndex(root: BlueprintNode, position?: 'beforeFooter' | 'start' | 'end') {
  if (position === 'start') return 0;
  if (position === 'end') return root.children.length;
  const footerIndex = root.children.findIndex((child) => child.type === 'footer');
  return footerIndex === -1 ? root.children.length : footerIndex;
}

function extractSnapshot(page: EditorPage): BlueprintStateSnapshot {
  const draft = page.draft_structure ?? {};
  if (draft && draft.root) return draft as BlueprintStateSnapshot;
  const content = page.content ?? {};
  if (content && content.root) return content as BlueprintStateSnapshot;
  if (content && content.blueprint && content.blueprint.root) return content.blueprint as BlueprintStateSnapshot;
  return { root: createInitialSkeleton() };
}

function getWebsiteId() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const param = url.searchParams.get('website_id');
  const envId = (import.meta as any)?.env?.VITE_WEBSITE_ID as string | undefined;
  const useMocks = (() => {
    const flag = (import.meta as any)?.env?.VITE_USE_MOCKS as string | undefined;
    return flag === 'true' || flag === '1';
  })();
  const raw = param || envId;
  if (!raw) return useMocks ? 1 : null;
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return parsed;
  return useMocks ? 1 : null;
}

export function EditorShell() {
  const websiteId = useMemo(getWebsiteId, []);
  const [website, setWebsite] = useState<EditorWebsite | null>(null);
  const [pages, setPages] = useState<EditorPageEntry[]>([]);
  const [activePageId, setActivePageId] = useState<number | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'info'; message: string } | null>(null);
  const [pageDraft, setPageDraft] = useState<PageDraft>(() => buildPageDraft(null));
  const lastSavedRef = useRef<Record<number, string>>({});
  const lastPageIdRef = useRef<number | null>(null);
  const selectedRef = useRef<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dropIndicatorRef = useRef<DropTarget | null>(null);
  const newPageRef = useRef<HTMLInputElement | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [showTextPopup, setShowTextPopup] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 100, left: 100 });
  const [selectionRect, setSelectionRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const apiBase = useMemo(getApiBase, []);

  const {
    state,
    addComponent,
    updateData,
    updateStyles,
    undo,
    redo,
    reorder,
    wrapInContainer,
    remove,
    moveNode,
    wrapAndMove,
    hydrate,
  } = usePageBlueprintStore();

  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? null, [pages, activePageId]);
  const selectedNode = useMemo(
    () => (activeNodeId ? selectNodeById(state.present.root, activeNodeId) : null),
    [state.present, activeNodeId],
  );
  const isDirty = useMemo(() => {
    if (!activePageId) return false;
    const current = JSON.stringify(state.present);
    return current !== lastSavedRef.current[activePageId];
  }, [activePageId, state.present]);
  const pageSettingsDirty = useMemo(() => {
    if (!activePage) return false;
    const meta = (activePage.meta_data ?? {}) as Record<string, unknown>;
    const currentPriority = meta.priority !== undefined ? String(meta.priority) : '';
    const currentChangefreq = typeof meta.changefreq === 'string' ? meta.changefreq : '';
    const currentSeoTitle = typeof meta.seo_title === 'string' ? meta.seo_title : '';
    const currentSeoDescription = typeof meta.seo_description === 'string' ? meta.seo_description : '';
    return (
      pageDraft.title.trim() !== (activePage.title ?? '') ||
      pageDraft.slug.trim() !== (activePage.slug ?? '') ||
      pageDraft.seo_title.trim() !== currentSeoTitle ||
      pageDraft.seo_description.trim() !== currentSeoDescription ||
      pageDraft.priority.trim() !== currentPriority ||
      pageDraft.changefreq.trim() !== currentChangefreq
    );
  }, [activePage, pageDraft]);
  const slugError = useMemo(() => {
    if (!activePageId) return null;
    const slug = pageDraft.slug.trim();
    if (!slug) return 'Slug is required.';
    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      return 'Slug can include letters, numbers, and dashes only.';
    }
    const normalized = slug.toLowerCase();
    const conflict = pages.some((page) => page.id !== activePageId && (page.slug || '').toLowerCase() === normalized);
    if (conflict) return 'A page with this slug already exists for this website.';
    return null;
  }, [pageDraft.slug, pages, activePageId]);
  const canSave = (isDirty || pageSettingsDirty) && !(pageSettingsDirty && slugError);
  const apiLabel = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');
  const saveStateLabel = isSaving
    ? 'Saving...'
    : (isDirty || pageSettingsDirty ? 'Unsaved changes' : 'Saved');

  useEffect(() => {
    if (!websiteId) {
      setIsLoading(false);
      setError('Missing website_id. Provide ?website_id= in the URL or VITE_WEBSITE_ID.');
      return;
    }
    setIsLoading(true);
    fetchWebsiteEditor(websiteId)
      .then((payload) => {
        setWebsite(payload);
        const rawPages = Array.isArray(payload.pages) ? payload.pages : [];
        if (!Array.isArray(payload.pages)) {
          setError('Website pages are missing from the editor response.');
        }
        const entries = rawPages.map((page) => {
          const snapshot = extractSnapshot(page);
          lastSavedRef.current[page.id] = JSON.stringify(snapshot);
          return { ...page, snapshot };
        });
        setPages(entries);
        const firstId = entries[0]?.id ?? null;
        setActivePageId(firstId);
        if (entries[0]) hydrate(entries[0].snapshot);
        setError(null);
      })
      .catch((err) => {
        if (err?.status === 401 || err?.status === 403) {
          setError('Unauthorized. Check localStorage.access_token and API base configuration.');
        } else {
          setError(err?.message || 'Unable to load website data.');
        }
      })
      .finally(() => setIsLoading(false));
  }, [websiteId, hydrate]);

  useEffect(() => {
    if (!website || typeof window === 'undefined') return;
    const domain = website.domain || website.internal_domain || '';
    if (domain) {
      (window as any).__KX_DOMAIN__ = domain;
    }
    if (apiBase) {
      (window as any).__KX_API_BASE__ = apiBase;
    }
  }, [website, apiBase]);

  useEffect(() => {
    if (!activePageId) return;
    setPages((prev) => prev.map((page) => page.id === activePageId ? { ...page, snapshot: state.present } : page));
  }, [activePageId, state.present]);

  useEffect(() => {
    if (!activePageId) return;
    if (lastPageIdRef.current === activePageId) return;
    const page = pages.find((entry) => entry.id === activePageId) ?? null;
    setPageDraft(buildPageDraft(page));
    lastPageIdRef.current = activePageId;
  }, [activePageId, pages]);

  useEffect(() => {
    if (!activePageId) return;
    if (!activeNodeId) {
      const fallback = state.present.root.id;
      setActiveNodeId(fallback);
    }
  }, [activePageId, activeNodeId, state.present]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (selectedRef.current) {
      const prev = document.querySelector(`[data-node-id="${selectedRef.current}"]`);
      if (prev) prev.removeAttribute('data-selected');
    }
    if (activeNodeId) {
      const next = document.querySelector(`[data-node-id="${activeNodeId}"]`) as HTMLElement | null;
      if (next) {
        next.setAttribute('data-selected', 'true');
        // Calculate selection rect relative to canvas frame
        if (canvasFrameRef.current) {
          const canvasRect = canvasFrameRef.current.getBoundingClientRect();
          const nodeRect = next.getBoundingClientRect();
          setSelectionRect({
            top: nodeRect.top - canvasRect.top,
            left: nodeRect.left - canvasRect.left,
            width: nodeRect.width,
            height: nodeRect.height,
          });
        }
      }
      selectedRef.current = activeNodeId;
    } else {
      setSelectionRect(null);
    }
  }, [activeNodeId, state.present]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (dropIndicatorRef.current) {
      const prev = document.querySelector(`[data-node-id="${dropIndicatorRef.current.id}"]`);
      if (prev) prev.removeAttribute('data-drop');
    }
    if (dropTarget) {
      const next = document.querySelector(`[data-node-id="${dropTarget.id}"]`);
      if (next) next.setAttribute('data-drop', dropTarget.position);
      dropIndicatorRef.current = dropTarget;
    } else {
      dropIndicatorRef.current = null;
    }
  }, [dropTarget, state.present]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll('[data-node-id][data-node-type]');
    nodes.forEach((node) => {
      const type = node.getAttribute('data-node-type') || '';
      if (DRAGGABLE_TYPES.has(type)) {
        node.setAttribute('draggable', 'true');
      } else {
        node.removeAttribute('draggable');
      }
    });
  }, [state.present]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleSave = useCallback(async () => {
    if (!websiteId || !activePageId) return;
    if (pageSettingsDirty && slugError) {
      setError(slugError);
      return;
    }
    setIsSaving(true);
    try {
      const payload: Partial<EditorPage> = { draft_structure: state.present };
      if (pageSettingsDirty && activePage) {
        payload.title = pageDraft.title.trim();
        payload.slug = pageDraft.slug.trim();
        const metaPatch = buildMetaPatch(pageDraft);
        if (Object.keys(metaPatch).length > 0) payload.meta_data = metaPatch;
      }
      const updated = await updatePage(websiteId, activePageId, payload);
      if (pageSettingsDirty) {
        setPages((prev) => prev.map((page) => {
          if (page.id !== activePageId) return page;
          return {
            ...page,
            title: updated.title ?? page.title,
            slug: updated.slug ?? page.slug,
            meta_data: updated.meta_data ?? page.meta_data,
          };
        }));
      }
      lastSavedRef.current[activePageId] = JSON.stringify(state.present);
      setError(null);
      setNotice({ kind: 'success', message: 'Saved.' });
    } catch (err: any) {
      setError(err?.message || 'Unable to save.');
    } finally {
      setIsSaving(false);
    }
  }, [websiteId, activePageId, state.present, pageSettingsDirty, activePage, pageDraft, slugError]);

  const handlePublish = useCallback(async () => {
    if (!websiteId) return;
    setIsPublishing(true);
    try {
      if (isDirty || pageSettingsDirty) {
        await handleSave();
      }
      const result = await publishWebsite(websiteId);
      setNotice({ kind: 'success', message: result?.detail || 'Publish started.' });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to publish.');
    } finally {
      setIsPublishing(false);
    }
  }, [websiteId, isDirty, pageSettingsDirty, handleSave]);

  const handleSelectPage = useCallback(async (pageId: number) => {
    if (pageId === activePageId) return;
    if (isDirty || pageSettingsDirty) {
      await handleSave();
    }
    const page = pages.find((entry) => entry.id === pageId);
    if (page) {
      setActivePageId(pageId);
      hydrate(page.snapshot);
      setActiveNodeId(page.snapshot.root.id);
    }
  }, [activePageId, pages, hydrate, isDirty, pageSettingsDirty, handleSave]);

  const handleAddPreset = useCallback((presetId: string) => {
    const preset = BLOCK_PRESETS[presetId];
    if (!preset) return;
    const root = state.present.root;
    if (preset.singletonType) {
      const existing = findFirstNodeIdByType(root, preset.singletonType);
      if (existing) {
        setActiveNodeId(existing);
        return;
      }
    }
    const node = preset.factory();
    const parentId = root.id;
    const insertIndex = resolveInsertIndex(root, preset.insert);
    addComponent(parentId, insertIndex, node);
    setActiveNodeId(node.id);
  }, [addComponent, state.present, setActiveNodeId]);

  const handleCreatePage = useCallback(async (title: string) => {
    if (!websiteId || !title.trim()) return;
    try {
      const created = await createPage(websiteId, title.trim());
      const snapshot = { root: createInitialSkeleton() };
      await updatePage(websiteId, created.id, { draft_structure: snapshot });
      lastSavedRef.current[created.id] = JSON.stringify(snapshot);
      const entry: EditorPageEntry = { ...created, snapshot };
      setPages((prev) => [...prev, entry]);
      setActivePageId(created.id);
      setPageDraft(buildPageDraft(entry));
      lastPageIdRef.current = created.id;
      hydrate(snapshot);
      setActiveNodeId(snapshot.root.id);
    } catch (err: any) {
      setError(err?.message || 'Unable to create page.');
    }
  }, [websiteId, hydrate]);

  const handleDragStart = useCallback((event: React.DragEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const nodeEl = target.closest('[data-node-id][data-node-type]') as HTMLElement | null;
    if (!nodeEl) return;
    const nodeType = nodeEl.getAttribute('data-node-type') || '';
    if (!DRAGGABLE_TYPES.has(nodeType)) return;
    const nodeId = nodeEl.getAttribute('data-node-id');
    if (!nodeId) return;
    dragIdRef.current = nodeId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', nodeId);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    const dragId = dragIdRef.current;
    if (!dragId) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const nodeEl = target.closest('[data-node-id][data-node-type]') as HTMLElement | null;
    if (!nodeEl) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const targetId = nodeEl.getAttribute('data-node-id');
    if (!targetId || targetId === dragId) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const targetType = nodeEl.getAttribute('data-node-type') || '';
    if (!DRAGGABLE_TYPES.has(targetType)) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const dragInfo = getParentInfo(state.present.root, dragId);
    const dropInfo = getParentInfo(state.present.root, targetId);
    if (!dragInfo || !dropInfo) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const dragParent = selectNodeById(state.present.root, dragInfo.parentId);
    const dropParent = selectNodeById(state.present.root, dropInfo.parentId);
    if (!dragParent || !dropParent) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    if (!ALLOWED_PARENT_TYPES.has(dropParent.type)) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    if (dragParent.type !== dropParent.type) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const rect = nodeEl.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropTarget({ id: targetId, position });
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, [state.present, dropTarget]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    const dragId = dragIdRef.current;
    const target = dropTarget;
    if (!dragId || !target) return;
    const dragInfo = getParentInfo(state.present.root, dragId);
    const dropInfo = getParentInfo(state.present.root, target.id);
    if (!dragInfo || !dropInfo) return;
    const dragParent = selectNodeById(state.present.root, dragInfo.parentId);
    const dropParent = selectNodeById(state.present.root, dropInfo.parentId);
    if (!dragParent || !dropParent) return;
    if (!ALLOWED_PARENT_TYPES.has(dropParent.type)) return;
    if (dragParent.type !== dropParent.type) return;
    const toIndex = target.position === 'before' ? dropInfo.index : dropInfo.index + 1;
    try {
      moveNode(dragInfo.parentId, dragInfo.index, dropInfo.parentId, toIndex);
    } catch (err: any) {
      setError(err?.message || 'Unable to reorder.');
    }
    dragIdRef.current = null;
    setDropTarget(null);
    event.preventDefault();
  }, [dropTarget, moveNode, state.present]);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDropTarget(null);
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const interactive = target.closest('a, button, input, textarea, select');
    const allowInteractive = interactive?.closest('[data-editor-interactive="true"]');
    if (interactive && !allowInteractive) {
      event.preventDefault();
      event.stopPropagation();
    }
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-node-id');
      const nodeType = nodeEl.getAttribute('data-node-type') || '';
      if (id) {
        setActiveNodeId(id);
        // Calculate popup position relative to canvas
        const canvasFrame = nodeEl.closest('.canvas-frame');
        if (canvasFrame) {
          const canvasRect = canvasFrame.getBoundingClientRect();
          const nodeRect = nodeEl.getBoundingClientRect();
          const popTop = Math.max(8, nodeRect.top - canvasRect.top + 40);
          const popLeft = Math.min(
            canvasRect.width - 340,
            Math.max(8, nodeRect.right - canvasRect.left - 320)
          );
          setPopupPosition({ top: popTop, left: popLeft });
        }
        // Show appropriate popup
        if (TEXT_NODE_TYPES.has(nodeType)) {
          setShowTextPopup(true);
          setShowImagePopup(false);
        } else if (nodeType === 'image') {
          setShowImagePopup(true);
          setShowTextPopup(false);
        } else {
          setShowTextPopup(false);
          setShowImagePopup(false);
        }
      }
    }
  }, []);

  if (isLoading) {
    return <div className="builder-loading">Loading editor...</div>;
  }

  if (!websiteId || !website) {
    return <div className="builder-error">{error || 'Website not found.'}</div>;
  }

  return (
    <div className="builder-root">
      <header className="builder-topbar">
        <div>
          <div className="builder-title">Yami Hub Builder</div>
          <div className="builder-subtitle">{website.domain || website.internal_domain || 'Draft website'}</div>
          {apiLabel ? <div className="builder-meta">ID {website.id} | API {apiLabel}</div> : null}
        </div>
        <div className="builder-actions">
          <div className="builder-status">{saveStateLabel}</div>
          <button type="button" onClick={undo}>Undo</button>
          <button type="button" onClick={redo}>Redo</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving || !canSave}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="builder-body">
        <aside className="builder-panel builder-left">
          <div className="panel-section">
            <div className="panel-title">Pages</div>
            <div className="panel-list">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={page.id === activePageId ? 'panel-item active' : 'panel-item'}
                  onClick={() => handleSelectPage(page.id)}
                >
                  <span>{page.title}</span>
                  <span className="panel-muted">/{page.slug || 'home'}</span>
                </button>
              ))}
            </div>
            <div className="panel-add">
              <input
                ref={newPageRef}
                placeholder="New page title"
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  const value = newPageRef.current?.value ?? '';
                  if (newPageRef.current) newPageRef.current.value = '';
                  handleCreatePage(value);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const value = newPageRef.current?.value ?? '';
                  if (newPageRef.current) newPageRef.current.value = '';
                  handleCreatePage(value);
                }}
              >
                Add page
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">Blocks</div>
            {BLOCK_SECTIONS.map((section) => (
              <div key={section.id} className="panel-group">
                <div className="panel-subtitle">{section.title}</div>
                <div className="panel-list">
                  {section.items.map((item) => (
                    <button key={item.id} type="button" className="panel-item" onClick={() => handleAddPreset(item.id)}>
                      <div>
                        <div className="panel-item-title">{item.label}</div>
                        {item.description ? <div className="panel-item-sub">{item.description}</div> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main
          className="builder-canvas"
          onClickCapture={handleCanvasClick}
          onDragStartCapture={handleDragStart}
          onDragOverCapture={handleDragOver}
          onDropCapture={handleDrop}
          onDragEndCapture={handleDragEnd}
        >
          <div className="canvas-frame" ref={canvasFrameRef} style={{ position: 'relative' }}>
            {/* Selection Overlay - Delete Button and Element Label */}
            {selectionRect && selectedNode && selectedNode.type !== 'page' && (
              <>
                {/* Element Type Label */}
                <div
                  className="element-type-label"
                  style={{
                    position: 'absolute',
                    top: selectionRect.top - 28,
                    left: selectionRect.left,
                  }}
                >
                  {ELEMENT_TYPE_LABELS[selectedNode.type] || selectedNode.type}
                </div>
                {/* Delete Button - Show for all deletable types */}
                {DELETABLE_TYPES.has(selectedNode.type) && (
                  <button
                    type="button"
                    className="component-delete-btn"
                    style={{
                      position: 'absolute',
                      top: selectionRect.top - 28,
                      left: selectionRect.left + selectionRect.width - 60,
                    }}
                    onClick={() => {
                      const parentInfo = getParentInfo(state.present.root, selectedNode.id);
                      if (parentInfo) {
                        remove(selectedNode.id);
                        setActiveNodeId(parentInfo.parentId);
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z" />
                    </svg>
                    حذف
                  </button>
                )}
                {/* Corner Handles - All 4 corners */}
                <div
                  className="selection-corner selection-corner--tl"
                  style={{
                    position: 'absolute',
                    top: selectionRect.top - 6,
                    left: selectionRect.left - 6,
                  }}
                />
                <div
                  className="selection-corner selection-corner--tr"
                  style={{
                    position: 'absolute',
                    top: selectionRect.top - 6,
                    left: selectionRect.left + selectionRect.width - 6,
                  }}
                />
                <div
                  className="selection-corner selection-corner--bl"
                  style={{
                    position: 'absolute',
                    top: selectionRect.top + selectionRect.height - 6,
                    left: selectionRect.left - 6,
                  }}
                />
                <div
                  className="selection-corner selection-corner--br"
                  style={{
                    position: 'absolute',
                    top: selectionRect.top + selectionRect.height - 6,
                    left: selectionRect.left + selectionRect.width - 6,
                  }}
                />
              </>
            )}
            {/* Text Editor Popup */}
            {showTextPopup && selectedNode && TEXT_NODE_TYPES.has(selectedNode.type) && (
              <TextHoverToolbar
                nodeId={selectedNode.id}
                nodeType={selectedNode.type as 'heading' | 'paragraph' | 'button'}
                // Merge data (base) with styles (overrides) so toolbar sees all values
                styles={{
                  ...selectedNode.data,
                  ...(selectedNode.styles || {})
                }}
                onUpdateStyles={(id, patch) => updateStyles(id, patch)}
                position={popupPosition}
                onClose={() => setShowTextPopup(false)}
              />
            )}
            {/* Image Editor Popup */}
            {showImagePopup && selectedNode && selectedNode.type === 'image' && (
              <ImageEditorPopup
                nodeId={selectedNode.id}
                currentSrc={((selectedNode.data as Record<string, unknown>)?.src as string) ?? ''}
                // Priority: styles.objectFit → data.objectFit → 'cover'
                objectFit={
                  ((selectedNode.styles as Record<string, unknown>)?.objectFit as string) ??
                  ((selectedNode.data as Record<string, unknown>)?.objectFit as string) ??
                  'cover'
                }
                position={popupPosition}
                onClose={() => setShowImagePopup(false)}
                onUpdateStyles={(id, styles) => updateStyles(id, styles)}
                onUpload={async (file) => {
                  try {
                    const signedUpload = await createSignedUpload(file.name);
                    const publicUrl = await uploadFileToSignedUrl(file, signedUpload);
                    updateData(selectedNode.id, { src: publicUrl });
                  } catch (err: any) {
                    setError(err?.message || 'Failed to upload image');
                  }
                }}
              />
            )}
            <BlueprintProvider
              snapshot={state.present}
              actions={{ addComponent, reorder, wrapInContainer, remove, moveNode, wrapAndMove }}
            >
              <Renderer nodeId={state.present.root.id} />
            </BlueprintProvider>
          </div>
        </main>

        <aside className="builder-panel builder-right">
          <div className="panel-section">
            <div className="panel-title">Page Settings</div>
            {activePage ? (
              <div className="panel-form">
                <label className="panel-field">
                  <span>Title</span>
                  <input
                    value={pageDraft.title}
                    onChange={(event) => setPageDraft((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </label>
                <label className="panel-field">
                  <span>Slug</span>
                  <input
                    value={pageDraft.slug}
                    onChange={(event) => setPageDraft((prev) => ({ ...prev, slug: event.target.value }))}
                    aria-invalid={slugError ? true : undefined}
                  />
                  <div className="panel-hint">Used in the page URL.</div>
                  {slugError ? <div className="panel-hint error">{slugError}</div> : null}
                </label>
                <label className="panel-field">
                  <span>SEO title</span>
                  <input
                    value={pageDraft.seo_title}
                    onChange={(event) => setPageDraft((prev) => ({ ...prev, seo_title: event.target.value }))}
                  />
                </label>
                <label className="panel-field">
                  <span>SEO description</span>
                  <textarea
                    rows={3}
                    value={pageDraft.seo_description}
                    onChange={(event) => setPageDraft((prev) => ({ ...prev, seo_description: event.target.value }))}
                  />
                </label>
                <label className="panel-field">
                  <span>Priority</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={pageDraft.priority}
                    onChange={(event) => setPageDraft((prev) => ({ ...prev, priority: event.target.value }))}
                  />
                </label>
                <label className="panel-field">
                  <span>Changefreq</span>
                  <select
                    value={pageDraft.changefreq}
                    onChange={(event) => setPageDraft((prev) => ({ ...prev, changefreq: event.target.value }))}
                  >
                    <option value="">Auto</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="never">Never</option>
                  </select>
                </label>
                <button type="button" onClick={handleSave} disabled={isSaving || !canSave}>
                  {isSaving ? 'Saving...' : 'Save page'}
                </button>
              </div>
            ) : (
              <div>Select a page to edit settings.</div>
            )}
          </div>
          <div className="panel-section">
            <div className="panel-title">Content</div>
            {activeNodeId ? (
              <ContentPanel nodeId={activeNodeId} snapshot={state.present} updateData={updateData} />
            ) : (
              <div>Select a component</div>
            )}
          </div>
          <div className="panel-section">
            <div className="panel-title">Styles</div>
            {activeNodeId ? (
              <StylesPanel nodeId={activeNodeId} snapshot={state.present} updateStyles={updateStyles} />
            ) : (
              <div>Select a component</div>
            )}
          </div>
          <div className="panel-section">
            <div className="panel-title">Guidance</div>
            {!selectedNode ? (
              <div className="panel-hint">Click any block in the canvas to edit its content or styles.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="panel-hint">
                  Selected <strong>{selectedNode.type}</strong> · <span style={{ fontFamily: 'monospace' }}>{selectedNode.id}</span>
                </div>
                {['section', 'container', 'row', 'column', 'page'].includes(selectedNode.type) ? (
                  <div className="panel-hint">
                    Layout nodes control spacing and structure. Use Styles for padding/background and Content for row settings.
                  </div>
                ) : null}
                {['heading', 'paragraph', 'button', 'image', 'list'].includes(selectedNode.type) ? (
                  <div className="panel-hint">
                    Content nodes edit text/media. Use Styles → Text align to center, or Heading Align for titles.
                  </div>
                ) : null}
                {selectedNode.type === 'row' ? (
                  <div className="panel-hint">Row gaps and alignment live in Content.</div>
                ) : null}
                {selectedNode.type === 'container' ? (
                  <div className="panel-hint">Set Max width in Content to keep sections readable.</div>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </div>
      {error ? <div className="builder-toast" data-kind="error">{error}</div> : null}
      {notice ? <div className="builder-toast" data-kind={notice.kind}>{notice.message}</div> : null}
    </div>
  );
}
