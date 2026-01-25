import React, { useEffect, useMemo, useState } from 'react';
import { selectNodeById } from '../foundation/selectors';
import type { BlueprintStateSnapshot, ButtonHref } from '../foundation/types';
import { generateNodeId } from '../foundation/id';
import { createSignedUpload, uploadFileToSignedUrl } from './api';

interface ContentPanelProps {
  nodeId: string;
  snapshot: BlueprintStateSnapshot;
  updateData: (nodeId: string, data: Record<string, unknown>) => void;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function buildUrlHref(current: ButtonHref | undefined, value: string, newTab?: boolean): ButtonHref | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return undefined;
  const nextNewTab = typeof newTab === 'boolean'
    ? newTab
    : (current?.kind === 'url' && current.newTab === true);
  return nextNewTab ? { kind: 'url', href: trimmed, newTab: true } : { kind: 'url', href: trimmed };
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type HoursRange = { start?: string; end?: string };
type HoursEntry = { day: string; label?: string; is_closed?: boolean; ranges?: HoursRange[] };

const HOURS_DAY_OPTIONS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const SOCIAL_PLATFORM_OPTIONS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'website', label: 'Website' },
];

function normalizeHoursSchedule(schedule: unknown): HoursEntry[] {
  const entries = Array.isArray(schedule) ? (schedule as HoursEntry[]) : [];
  const byDay = new Map<string, HoursEntry>();
  entries.forEach((entry) => {
    if (entry && typeof entry.day === 'string') {
      byDay.set(entry.day, entry);
    }
  });
  return HOURS_DAY_OPTIONS.map((day) => {
    const existing = byDay.get(day.key);
    const ranges = Array.isArray(existing?.ranges)
      ? existing!.ranges!.map((range) => ({
        start: typeof range?.start === 'string' ? range.start : '',
        end: typeof range?.end === 'string' ? range.end : '',
      }))
      : [];
    return {
      day: day.key,
      label: typeof existing?.label === 'string' ? existing.label : undefined,
      is_closed: existing?.is_closed === true,
      ranges,
    };
  });
}

function cloneRanges(ranges: HoursRange[] | undefined): HoursRange[] {
  if (!Array.isArray(ranges)) return [];
  return ranges.map((range) => ({
    start: typeof range?.start === 'string' ? range.start : '',
    end: typeof range?.end === 'string' ? range.end : '',
  }));
}

export function ContentPanel({ nodeId, snapshot, updateData }: ContentPanelProps) {
  const node = useMemo(() => selectNodeById(snapshot.root, nodeId), [snapshot, nodeId]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  useEffect(() => {
    setUploading(false);
    setUploadError(null);
  }, [nodeId]);

  if (!node) return <div>Node not found</div>;

  const data = (node.data ?? {}) as any;
  const setData = (patch: Record<string, unknown>) => updateData(nodeId, patch);

  if (node.type === 'heading') {
    const href = data.href as ButtonHref | undefined;
    const hrefValue = href?.kind === 'url' ? href.href : '';
    const newTab = href?.kind === 'url' && href.newTab === true;
    return (
      <div>
        <FieldRow label="Text">
          <input value={data.text ?? ''} onChange={(e) => setData({ text: e.target.value })} />
        </FieldRow>
        <FieldRow label="Level">
          <select value={data.level ?? 2} onChange={(e) => setData({ level: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <option key={lvl} value={lvl}>H{lvl}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Align">
          <select value={data.align ?? 'start'} onChange={(e) => setData({ align: e.target.value })}>
            <option value="start">Left</option>
            <option value="center">Center</option>
            <option value="end">Right</option>
          </select>
        </FieldRow>
        <FieldRow label="Link URL">
          <input
            value={hrefValue}
            onChange={(e) => setData({ href: buildUrlHref(href, e.target.value, newTab) })}
            placeholder="https://..."
          />
        </FieldRow>
        <FieldRow label="Open in new tab">
          <input
            type="checkbox"
            checked={newTab}
            disabled={!hrefValue}
            onChange={(e) => setData({ href: buildUrlHref(href, hrefValue, e.target.checked) })}
          />
        </FieldRow>
        <div className="panel-hint">Tip: Use Align to center headings without changing layout.</div>
      </div>
    );
  }

  if (node.type === 'paragraph') {
    const href = data.href as ButtonHref | undefined;
    const hrefValue = href?.kind === 'url' ? href.href : '';
    const newTab = href?.kind === 'url' && href.newTab === true;
    return (
      <div>
        <FieldRow label="Text">
          <textarea rows={5} value={data.text ?? ''} onChange={(e) => setData({ text: e.target.value })} />
        </FieldRow>
        <FieldRow label="Link URL">
          <input
            value={hrefValue}
            onChange={(e) => setData({ href: buildUrlHref(href, e.target.value, newTab) })}
            placeholder="https://..."
          />
        </FieldRow>
        <FieldRow label="Open in new tab">
          <input
            type="checkbox"
            checked={newTab}
            disabled={!hrefValue}
            onChange={(e) => setData({ href: buildUrlHref(href, hrefValue, e.target.checked) })}
          />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'image') {
    const handleUpload = async (file: File) => {
      setUploadError(null);
      setUploading(true);
      try {
        const signed = await createSignedUpload(file.name);
        const url = await uploadFileToSignedUrl(file, signed);
        setData({ src: url });
      } catch (err: any) {
        setUploadError(err?.message || 'Upload failed.');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div>
        <FieldRow label="Image URL">
          <input value={data.src ?? ''} onChange={(e) => setData({ src: e.target.value })} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="Alt text">
          <input value={data.alt ?? ''} onChange={(e) => setData({ alt: e.target.value })} />
        </FieldRow>
        <FieldRow label="Upload">
          <div style={{ display: 'grid', gap: 6 }}>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleUpload(file);
                event.target.value = '';
              }}
            />
            {uploading ? <div className="panel-hint">Uploading...</div> : null}
            {uploadError ? <div className="panel-hint error">{uploadError}</div> : null}
          </div>
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'map') {
    const latValue = typeof data.lat === 'number' && Number.isFinite(data.lat) ? String(data.lat) : '';
    const lngValue = typeof data.lng === 'number' && Number.isFinite(data.lng) ? String(data.lng) : '';
    const zoomValue = typeof data.zoom === 'number' && Number.isFinite(data.zoom) ? data.zoom : 14;
    const heightValue = typeof data.height === 'number' && Number.isFinite(data.height) ? data.height : 320;
    return (
      <div>
        <FieldRow label="Label">
          <input value={data.label ?? ''} onChange={(e) => setData({ label: e.target.value })} placeholder="Location" />
        </FieldRow>
        <FieldRow label="Address">
          <textarea rows={3} value={data.address ?? ''} onChange={(e) => setData({ address: e.target.value })} placeholder="Street, City, Country" />
        </FieldRow>
        <FieldRow label="Latitude">
          <input
            type="number"
            step="0.000001"
            value={latValue}
            onChange={(e) => setData({ lat: parseNumber(e.target.value) })}
            placeholder="24.7136"
          />
        </FieldRow>
        <FieldRow label="Longitude">
          <input
            type="number"
            step="0.000001"
            value={lngValue}
            onChange={(e) => setData({ lng: parseNumber(e.target.value) })}
            placeholder="46.6753"
          />
        </FieldRow>
        <FieldRow label="Zoom">
          <input
            type="number"
            min={1}
            max={20}
            value={zoomValue}
            onChange={(e) => setData({ zoom: parseNumber(e.target.value) })}
          />
        </FieldRow>
        <FieldRow label="Height (px)">
          <input
            type="number"
            min={180}
            max={800}
            value={heightValue}
            onChange={(e) => setData({ height: parseNumber(e.target.value) })}
          />
        </FieldRow>
        <FieldRow label="Directions URL">
          <input
            value={data.directions_url ?? ''}
            onChange={(e) => setData({ directions_url: e.target.value })}
            placeholder="https://maps..."
          />
        </FieldRow>
        <div className="panel-hint">Tip: Use latitude + longitude for accurate pins.</div>
      </div>
    );
  }

  if (node.type === 'opening_hours') {
    const schedule = normalizeHoursSchedule(data.schedule);

    const updateSchedule = (next: HoursEntry[]) => setData({ schedule: next });

    const updateEntry = (day: string, patch: Partial<HoursEntry>) => {
      const next = schedule.map((entry) => entry.day === day ? { ...entry, ...patch } : entry);
      updateSchedule(next);
    };

    const updateRange = (day: string, index: number, patch: Partial<HoursRange>) => {
      const next = schedule.map((entry) => {
        if (entry.day !== day) return entry;
        const ranges = cloneRanges(entry.ranges);
        ranges[index] = { ...ranges[index], ...patch };
        return { ...entry, ranges };
      });
      updateSchedule(next);
    };

    const addRange = (day: string) => {
      const next = schedule.map((entry) => {
        if (entry.day !== day) return entry;
        const ranges = [...cloneRanges(entry.ranges), { start: '', end: '' }];
        return { ...entry, ranges };
      });
      updateSchedule(next);
    };

    const removeRange = (day: string, index: number) => {
      const next = schedule.map((entry) => {
        if (entry.day !== day) return entry;
        const ranges = cloneRanges(entry.ranges).filter((_, idx) => idx !== index);
        return { ...entry, ranges };
      });
      updateSchedule(next);
    };

    const copyHours = (targets: string[]) => {
      const source = schedule.find((entry) => entry.day === 'mon');
      if (!source) return;
      const next = schedule.map((entry) => {
        if (!targets.includes(entry.day)) return entry;
        return {
          ...entry,
          is_closed: source.is_closed,
          ranges: cloneRanges(source.ranges),
        };
      });
      updateSchedule(next);
    };

    return (
      <div>
        <FieldRow label="Title">
          <input value={data.label ?? ''} onChange={(e) => setData({ label: e.target.value })} placeholder="Opening hours" />
        </FieldRow>
        <FieldRow label="Timezone">
          <input value={data.timezone ?? ''} onChange={(e) => setData({ timezone: e.target.value })} placeholder="e.g. GMT+3" />
        </FieldRow>
        <FieldRow label="Group days">
          <input type="checkbox" checked={data.group_days !== false} onChange={(e) => setData({ group_days: e.target.checked })} />
        </FieldRow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 12px' }}>
          <button type="button" onClick={() => copyHours(['mon', 'tue', 'wed', 'thu', 'fri'])}>
            Copy Monday to weekdays
          </button>
          <button type="button" onClick={() => copyHours(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])}>
            Copy Monday to all days
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {schedule.map((entry) => {
            const dayLabel = HOURS_DAY_OPTIONS.find((day) => day.key === entry.day)?.label ?? entry.day;
            const ranges = cloneRanges(entry.ranges);
            return (
              <div key={entry.day} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {dayLabel}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={entry.is_closed === true}
                      onChange={(e) => updateEntry(entry.day, { is_closed: e.target.checked })}
                    />
                    Closed
                  </label>
                </div>
                {entry.is_closed ? (
                  <div className="panel-hint">Marked as closed.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {ranges.length ? (
                      ranges.map((range, index) => (
                        <div key={`${entry.day}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                          <input
                            type="time"
                            value={range.start ?? ''}
                            onChange={(e) => updateRange(entry.day, index, { start: e.target.value })}
                          />
                          <input
                            type="time"
                            value={range.end ?? ''}
                            onChange={(e) => updateRange(entry.day, index, { end: e.target.value })}
                          />
                          <button type="button" onClick={() => removeRange(entry.day, index)}>Remove</button>
                        </div>
                      ))
                    ) : (
                      <div className="panel-hint">No hours set.</div>
                    )}
                    <button type="button" onClick={() => addRange(entry.day)}>Add time range</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (node.type === 'button') {
    const href = data.href as ButtonHref | undefined;
    const hrefValue = href?.kind === 'url' ? href.href : '';
    const newTab = href?.kind === 'url' && href.newTab === true;
    return (
      <div>
        <FieldRow label="Label">
          <input value={data.label ?? ''} onChange={(e) => setData({ label: e.target.value })} />
        </FieldRow>
        <FieldRow label="URL">
          <input
            value={hrefValue}
            onChange={(e) => setData({ href: buildUrlHref(href, e.target.value, newTab) })}
            placeholder="https://..."
          />
        </FieldRow>
        <FieldRow label="Open in new tab">
          <input
            type="checkbox"
            checked={newTab}
            disabled={!hrefValue}
            onChange={(e) => setData({ href: buildUrlHref(href, hrefValue, e.target.checked) })}
          />
        </FieldRow>
        <FieldRow label="Size">
          <select value={data.size ?? 'md'} onChange={(e) => setData({ size: e.target.value })}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </FieldRow>
        <FieldRow label="Variant">
          <select value={data.variant ?? 'solid'} onChange={(e) => setData({ variant: e.target.value })}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </FieldRow>
        <FieldRow label="Icon left">
          <input
            value={data.iconLeft ?? ''}
            onChange={(e) => {
              const value = e.target.value.trim();
              setData({ iconLeft: value ? value : undefined });
            }}
            placeholder="Optional"
          />
        </FieldRow>
        <FieldRow label="Icon right">
          <input
            value={data.iconRight ?? ''}
            onChange={(e) => {
              const value = e.target.value.trim();
              setData({ iconRight: value ? value : undefined });
            }}
            placeholder="Optional"
          />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'badge') {
    return (
      <div>
        <FieldRow label="Text">
          <input value={data.text ?? ''} onChange={(e) => setData({ text: e.target.value })} />
        </FieldRow>
        <FieldRow label="Variant">
          <select value={data.variant ?? 'solid'} onChange={(e) => setData({ variant: e.target.value })}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'divider') {
    return (
      <div>
        <FieldRow label="Orientation">
          <select value={data.orientation ?? 'horizontal'} onChange={(e) => setData({ orientation: e.target.value })}>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </FieldRow>
        <div className="panel-hint">Tip: Use Styles to adjust thickness and color.</div>
      </div>
    );
  }

  if (node.type === 'card') {
    const media = data.media && typeof data.media === 'object' ? data.media : undefined;
    const mediaSrc = typeof media?.src === 'string' ? media.src : '';
    const mediaAlt = typeof media?.alt === 'string' ? media.alt : '';
    const actions = Array.isArray(data.actions) ? data.actions : [];
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} />
        </FieldRow>
        <FieldRow label="Body">
          <textarea rows={3} value={data.body ?? ''} onChange={(e) => setData({ body: e.target.value })} />
        </FieldRow>
        <FieldRow label="Image URL">
          <input
            value={mediaSrc}
            onChange={(e) => {
              const nextSrc = e.target.value.trim();
              if (!nextSrc) {
                setData({ media: undefined });
                return;
              }
              const nextAlt = mediaAlt && mediaAlt.trim() ? mediaAlt.trim() : 'Card image';
              setData({ media: { src: nextSrc, alt: nextAlt } });
            }}
            placeholder="https://..."
          />
        </FieldRow>
        <FieldRow label="Image alt">
          <input
            value={mediaAlt}
            disabled={!mediaSrc}
            onChange={(e) => {
              const nextAlt = e.target.value.trim() || 'Card image';
              if (!mediaSrc) return;
              setData({ media: { src: mediaSrc, alt: nextAlt } });
            }}
            placeholder="Describe the image"
          />
        </FieldRow>
        <FieldRow label="Actions">
          <div style={{ display: 'grid', gap: 8 }}>
            {actions.map((action: any, index: number) => {
              const href = action?.href as ButtonHref | undefined;
              const hrefValue = href?.kind === 'url' ? href.href : '';
              const newTab = href?.kind === 'url' && href.newTab === true;
              return (
                <div key={`action-${index}`} style={{ display: 'grid', gap: 6 }}>
                  <input
                    value={action?.label ?? ''}
                    onChange={(e) => {
                      const next = actions.map((item: any, idx: number) => idx === index ? { ...item, label: e.target.value } : item);
                      setData({ actions: next });
                    }}
                    placeholder="Action label"
                  />
                  <input
                    value={hrefValue}
                    onChange={(e) => {
                      const next = actions.map((item: any, idx: number) => {
                        if (idx !== index) return item;
                        return { ...item, href: buildUrlHref(href, e.target.value, newTab) };
                      });
                      setData({ actions: next });
                    }}
                    placeholder="https://..."
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={newTab}
                      disabled={!hrefValue}
                      onChange={(e) => {
                        const next = actions.map((item: any, idx: number) => {
                          if (idx !== index) return item;
                          return { ...item, href: buildUrlHref(href, hrefValue, e.target.checked) };
                        });
                        setData({ actions: next });
                      }}
                    />
                    Open in new tab
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = actions.filter((_: any, idx: number) => idx !== index);
                      setData({ actions: next });
                    }}
                  >
                    Remove action
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const next = [...actions, { label: 'Action' }];
                setData({ actions: next });
              }}
            >
              Add action
            </button>
          </div>
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'features') {
    const items = Array.isArray(data.items) ? data.items : [];
    const layout = data.layout ?? 'grid';
    const columns = data.columns ?? 3;
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} placeholder="Why customers choose you" />
        </FieldRow>
        <FieldRow label="Subtitle">
          <input value={data.subtitle ?? ''} onChange={(e) => setData({ subtitle: e.target.value })} placeholder="Short supporting line" />
        </FieldRow>
        <FieldRow label="Layout">
          <select value={layout} onChange={(e) => setData({ layout: e.target.value })}>
            <option value="grid">Grid</option>
            <option value="stacked">Stacked</option>
            <option value="icon-left">Icon left</option>
          </select>
        </FieldRow>
        {layout === 'grid' ? (
          <FieldRow label="Columns">
            <input
              type="number"
              min={1}
              max={6}
              value={columns}
              onChange={(e) => setData({ columns: Number(e.target.value) })}
            />
          </FieldRow>
        ) : null}
        <FieldRow label="Items">
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item: any, index: number) => {
              const image = item.image && typeof item.image === 'object' ? item.image : {};
              return (
                <div key={item.id ?? `feature-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, display: 'grid', gap: 8 }}>
                  <input
                    value={item.title ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, title: e.target.value } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Feature title"
                  />
                  <textarea
                    rows={3}
                    value={item.description ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, description: e.target.value } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Short description"
                  />
                  <input
                    value={item.icon ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, icon: e.target.value } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Icon text (e.g., STAR)"
                  />
                  <input
                    value={image.src ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, image: { ...image, src: e.target.value } } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Image URL (optional)"
                  />
                  <input
                    value={image.alt ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, image: { ...image, alt: e.target.value } } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Image alt text"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = items.filter((_: any, idx: number) => idx !== index);
                      setData({ items: next });
                    }}
                  >
                    Remove item
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const next = [...items, { id: generateNodeId('feature'), title: 'New feature', description: 'Describe this benefit', icon: 'ICON' }];
                setData({ items: next });
              }}
            >
              Add feature item
            </button>
          </div>
        </FieldRow>
        <div className="panel-hint">Tip: Image URL overrides icon text if provided.</div>
      </div>
    );
  }

  if (node.type === 'gallery') {
    const items = Array.isArray(data.items) ? data.items : [];
    const columns = data.columns ?? 3;
    const aspect = data.aspect ?? '4:3';
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} placeholder="Gallery title" />
        </FieldRow>
        <FieldRow label="Subtitle">
          <input value={data.subtitle ?? ''} onChange={(e) => setData({ subtitle: e.target.value })} placeholder="Optional subtitle" />
        </FieldRow>
        <FieldRow label="Columns">
          <input type="number" min={1} max={6} value={columns} onChange={(e) => setData({ columns: Number(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Aspect">
          <select value={aspect} onChange={(e) => setData({ aspect: e.target.value })}>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
          </select>
        </FieldRow>
        <FieldRow label="Images">
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item: any, index: number) => (
              <div key={item.id ?? `gallery-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, display: 'grid', gap: 8 }}>
                <input
                  value={item.src ?? ''}
                  onChange={(e) => {
                    const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, src: e.target.value } : entry);
                    setData({ items: next });
                  }}
                  placeholder="Image URL"
                />
                <input
                  value={item.alt ?? ''}
                  onChange={(e) => {
                    const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, alt: e.target.value } : entry);
                    setData({ items: next });
                  }}
                  placeholder="Alt text"
                />
                <input
                  value={item.caption ?? ''}
                  onChange={(e) => {
                    const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, caption: e.target.value } : entry);
                    setData({ items: next });
                  }}
                  placeholder="Caption (optional)"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = items.filter((_: any, idx: number) => idx !== index);
                    setData({ items: next });
                  }}
                >
                  Remove image
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = [...items, { id: generateNodeId('media'), src: '', alt: '', caption: '' }];
                setData({ items: next });
              }}
            >
              Add image
            </button>
          </div>
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'slider') {
    const items = Array.isArray(data.items) ? data.items : [];
    const perView = data.per_view ?? 1;
    const aspect = data.aspect ?? '4:3';
    const autoPlay = data.auto_play === true;
    const intervalValue = typeof data.auto_play_interval === 'number' && Number.isFinite(data.auto_play_interval)
      ? data.auto_play_interval
      : 4500;
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} placeholder="Slider title" />
        </FieldRow>
        <FieldRow label="Subtitle">
          <input value={data.subtitle ?? ''} onChange={(e) => setData({ subtitle: e.target.value })} placeholder="Optional subtitle" />
        </FieldRow>
        <FieldRow label="Items per view">
          <input type="number" min={1} max={6} value={perView} onChange={(e) => setData({ per_view: Number(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Aspect">
          <select value={aspect} onChange={(e) => setData({ aspect: e.target.value })}>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
          </select>
        </FieldRow>
        <FieldRow label="Show arrows">
          <input type="checkbox" checked={data.show_arrows !== false} onChange={(e) => setData({ show_arrows: e.target.checked })} />
        </FieldRow>
        <FieldRow label="Show dots">
          <input type="checkbox" checked={data.show_dots !== false} onChange={(e) => setData({ show_dots: e.target.checked })} />
        </FieldRow>
        <FieldRow label="Auto slide">
          <input type="checkbox" checked={autoPlay} onChange={(e) => setData({ auto_play: e.target.checked })} />
        </FieldRow>
        {autoPlay ? (
          <FieldRow label="Interval (ms)">
            <input
              type="number"
              min={1000}
              max={15000}
              step={250}
              value={intervalValue}
              onChange={(e) => setData({ auto_play_interval: parseNumber(e.target.value) })}
            />
          </FieldRow>
        ) : null}
        <FieldRow label="Slides">
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item: any, index: number) => (
              <div key={item.id ?? `slide-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, display: 'grid', gap: 8 }}>
                <input
                  value={item.src ?? ''}
                  onChange={(e) => {
                    const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, src: e.target.value } : entry);
                    setData({ items: next });
                  }}
                  placeholder="Image URL"
                />
                <input
                  value={item.alt ?? ''}
                  onChange={(e) => {
                    const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, alt: e.target.value } : entry);
                    setData({ items: next });
                  }}
                  placeholder="Alt text"
                />
                <input
                  value={item.caption ?? ''}
                  onChange={(e) => {
                    const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, caption: e.target.value } : entry);
                    setData({ items: next });
                  }}
                  placeholder="Caption (optional)"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = items.filter((_: any, idx: number) => idx !== index);
                    setData({ items: next });
                  }}
                >
                  Remove slide
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = [...items, { id: generateNodeId('media'), src: '', alt: '', caption: '' }];
                setData({ items: next });
              }}
            >
              Add slide
            </button>
          </div>
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'testimonials') {
    const items = Array.isArray(data.items) ? data.items : [];
    const layout = data.layout ?? 'grid';
    const columns = data.columns ?? 3;
    const perView = data.per_view ?? 1;
    const clampRating = (value?: number) => {
      if (value === undefined) return undefined;
      if (!Number.isFinite(value)) return undefined;
      return Math.min(5, Math.max(0, value));
    };
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} placeholder="Customer reviews" />
        </FieldRow>
        <FieldRow label="Subtitle">
          <input value={data.subtitle ?? ''} onChange={(e) => setData({ subtitle: e.target.value })} placeholder="What guests are saying" />
        </FieldRow>
        <FieldRow label="Layout">
          <select value={layout} onChange={(e) => setData({ layout: e.target.value })}>
            <option value="grid">Grid</option>
            <option value="slider">Slider</option>
            <option value="highlight">Highlight</option>
          </select>
        </FieldRow>
        {layout === 'grid' ? (
          <FieldRow label="Columns">
            <input type="number" min={1} max={6} value={columns} onChange={(e) => setData({ columns: Number(e.target.value) })} />
          </FieldRow>
        ) : null}
        {layout === 'slider' ? (
          <>
            <FieldRow label="Items per view">
              <input type="number" min={1} max={6} value={perView} onChange={(e) => setData({ per_view: Number(e.target.value) })} />
            </FieldRow>
            <FieldRow label="Show arrows">
              <input type="checkbox" checked={data.show_arrows !== false} onChange={(e) => setData({ show_arrows: e.target.checked })} />
            </FieldRow>
            <FieldRow label="Show dots">
              <input type="checkbox" checked={data.show_dots !== false} onChange={(e) => setData({ show_dots: e.target.checked })} />
            </FieldRow>
          </>
        ) : null}
        <FieldRow label="Testimonials">
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item: any, index: number) => {
              const avatar = item.avatar && typeof item.avatar === 'object' ? item.avatar : {};
              const avatarSrc = typeof avatar.src === 'string' ? avatar.src : '';
              const avatarAlt = typeof avatar.alt === 'string' ? avatar.alt : '';
              const ratingValue = typeof item.rating === 'number' && Number.isFinite(item.rating) ? String(item.rating) : '';
              return (
                <div key={item.id ?? `testimonial-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, display: 'grid', gap: 8 }}>
                  <input
                    value={item.name ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, name: e.target.value } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Customer name"
                  />
                  <textarea
                    rows={3}
                    value={item.text ?? ''}
                    onChange={(e) => {
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, text: e.target.value } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Testimonial text"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <input
                      value={item.role ?? ''}
                      onChange={(e) => {
                        const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, role: e.target.value } : entry);
                        setData({ items: next });
                      }}
                      placeholder="Role (optional)"
                    />
                    <input
                      value={item.source ?? ''}
                      onChange={(e) => {
                        const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, source: e.target.value } : entry);
                        setData({ items: next });
                      }}
                      placeholder="Source (optional)"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    value={ratingValue}
                    onChange={(e) => {
                      const nextRating = clampRating(parseNumber(e.target.value));
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, rating: nextRating } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Rating 0-5"
                  />
                  <input
                    value={avatarSrc}
                    onChange={(e) => {
                      const srcValue = e.target.value;
                      const nextAvatar = srcValue.trim() ? { ...avatar, src: srcValue } : undefined;
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, avatar: nextAvatar } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Avatar URL (optional)"
                  />
                  <input
                    value={avatarAlt}
                    onChange={(e) => {
                      const nextAvatar = avatarSrc.trim() ? { ...avatar, alt: e.target.value, src: avatarSrc } : undefined;
                      const next = items.map((entry: any, idx: number) => idx === index ? { ...entry, avatar: nextAvatar } : entry);
                      setData({ items: next });
                    }}
                    placeholder="Avatar alt text"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = items.filter((_: any, idx: number) => idx !== index);
                      setData({ items: next });
                    }}
                  >
                    Remove testimonial
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const next = [...items, { id: generateNodeId('testimonial'), name: 'Customer name', text: 'Share a short review', rating: 5 }];
                setData({ items: next });
              }}
            >
              Add testimonial
            </button>
          </div>
        </FieldRow>
        <div className="panel-hint">Tip: Ratings are 0-5 (e.g. 4.5).</div>
      </div>
    );
  }

  if (node.type === 'list') {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <div>
        <FieldRow label="Items">
          <textarea
            rows={6}
            value={items.join('\n')}
            onChange={(e) => setData({ items: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })}
          />
        </FieldRow>
        <FieldRow label="Ordered">
          <input type="checkbox" checked={data.ordered === true} onChange={(e) => setData({ ordered: e.target.checked })} />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'input') {
    return (
      <div>
        <FieldRow label="Label">
          <input value={data.label ?? ''} onChange={(e) => setData({ label: e.target.value })} />
        </FieldRow>
        <FieldRow label="Placeholder">
          <input value={data.placeholder ?? ''} onChange={(e) => setData({ placeholder: e.target.value })} />
        </FieldRow>
        <FieldRow label="Type">
          <select value={data.type ?? 'text'} onChange={(e) => setData({ type: e.target.value })}>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="password">Password</option>
          </select>
        </FieldRow>
        <FieldRow label="Required">
          <input type="checkbox" checked={data.required === true} onChange={(e) => setData({ required: e.target.checked })} />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'textarea') {
    return (
      <div>
        <FieldRow label="Label">
          <input value={data.label ?? ''} onChange={(e) => setData({ label: e.target.value })} />
        </FieldRow>
        <FieldRow label="Placeholder">
          <input value={data.placeholder ?? ''} onChange={(e) => setData({ placeholder: e.target.value })} />
        </FieldRow>
        <FieldRow label="Rows">
          <input
            type="number"
            min={2}
            max={12}
            value={data.rows ?? 4}
            onChange={(e) => setData({ rows: Number(e.target.value) })}
          />
        </FieldRow>
        <FieldRow label="Required">
          <input type="checkbox" checked={data.required === true} onChange={(e) => setData({ required: e.target.checked })} />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'select') {
    const options = Array.isArray(data.options) ? data.options : [];
    return (
      <div>
        <FieldRow label="Label">
          <input value={data.label ?? ''} onChange={(e) => setData({ label: e.target.value })} />
        </FieldRow>
        <FieldRow label="Options">
          <div style={{ display: 'grid', gap: 8 }}>
            {options.map((option: any, index: number) => (
              <div key={`option-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                <input
                  value={option?.label ?? ''}
                  onChange={(e) => {
                    const next = options.map((item: any, idx: number) => idx === index ? { ...item, label: e.target.value } : item);
                    setData({ options: next });
                  }}
                  placeholder="Label"
                />
                <input
                  value={option?.value ?? ''}
                  onChange={(e) => {
                    const next = options.map((item: any, idx: number) => idx === index ? { ...item, value: e.target.value } : item);
                    setData({ options: next });
                  }}
                  placeholder="value"
                />
                <button
                  type="button"
                  disabled={options.length <= 1}
                  onClick={() => {
                    const next = options.filter((_: any, idx: number) => idx !== index);
                    setData({ options: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const nextIndex = options.length + 1;
                const next = [...options, { label: `Option ${nextIndex}`, value: `option-${nextIndex}` }];
                setData({ options: next });
              }}
            >
              Add option
            </button>
          </div>
        </FieldRow>
        <FieldRow label="Required">
          <input type="checkbox" checked={data.required === true} onChange={(e) => setData({ required: e.target.checked })} />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'menu_grid') {
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} />
        </FieldRow>
        <FieldRow label="Subtitle">
          <input value={data.subtitle ?? ''} onChange={(e) => setData({ subtitle: e.target.value })} />
        </FieldRow>
        <FieldRow label="Columns">
          <input type="number" min={1} max={6} value={data.columns ?? 3} onChange={(e) => setData({ columns: Number(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Domain">
          <input value={data.domain ?? ''} onChange={(e) => setData({ domain: e.target.value })} placeholder="mybrand.com" />
        </FieldRow>
        <FieldRow label="API Base">
          <input value={data.api_base ?? ''} onChange={(e) => setData({ api_base: e.target.value })} placeholder="https://api.yoursite.com" />
        </FieldRow>
        <FieldRow label="Category IDs">
          <input
            value={Array.isArray(data.category_filter) ? data.category_filter.join(',') : ''}
            onChange={(e) => {
              const ids = e.target.value.split(',').map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
              setData({ category_filter: ids.length ? ids : undefined });
            }}
            placeholder="1,2,3"
          />
        </FieldRow>
        <FieldRow label="Show images">
          <input type="checkbox" checked={data.show_images !== false} onChange={(e) => setData({ show_images: e.target.checked })} />
        </FieldRow>
        <FieldRow label="Show prices">
          <input type="checkbox" checked={data.show_prices !== false} onChange={(e) => setData({ show_prices: e.target.checked })} />
        </FieldRow>
        <FieldRow label="Add to cart">
          <input type="checkbox" checked={data.show_add_to_cart !== false} onChange={(e) => setData({ show_add_to_cart: e.target.checked })} />
        </FieldRow>
        <FieldRow label="Category tabs">
          <input type="checkbox" checked={data.show_category_tabs !== false} onChange={(e) => setData({ show_category_tabs: e.target.checked })} />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'cart') {
    return (
      <div>
        <FieldRow label="Title">
          <input value={data.title ?? ''} onChange={(e) => setData({ title: e.target.value })} />
        </FieldRow>
        <FieldRow label="Empty text">
          <input value={data.empty_text ?? ''} onChange={(e) => setData({ empty_text: e.target.value })} />
        </FieldRow>
        <FieldRow label="Checkout label">
          <input value={data.checkout_label ?? ''} onChange={(e) => setData({ checkout_label: e.target.value })} />
        </FieldRow>
        <FieldRow label="Payment method">
          <select value={data.payment_method ?? 'card'} onChange={(e) => setData({ payment_method: e.target.value })}>
            <option value="card">Card</option>
            <option value="pay_on_pickup">Pay on pickup</option>
          </select>
        </FieldRow>
        <FieldRow label="Success URL">
          <input value={data.success_url ?? ''} onChange={(e) => setData({ success_url: e.target.value })} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="Cancel URL">
          <input value={data.cancel_url ?? ''} onChange={(e) => setData({ cancel_url: e.target.value })} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="Domain">
          <input value={data.domain ?? ''} onChange={(e) => setData({ domain: e.target.value })} placeholder="mybrand.com" />
        </FieldRow>
        <FieldRow label="API Base">
          <input value={data.api_base ?? ''} onChange={(e) => setData({ api_base: e.target.value })} placeholder="https://api.yoursite.com" />
        </FieldRow>
      </div>
    );
  }

  if (node.type === 'header') {
    const navItems = Array.isArray(data.navItems) ? data.navItems : [];
    const layoutValue = data.layout ?? 'top';
    const mobile = data.mobile && typeof data.mobile === 'object' ? data.mobile : {};
    const setMobile = (patch: Record<string, unknown>) => setData({ mobile: { ...mobile, ...patch } });
    return (
      <div>
        <FieldRow label="Layout">
          <select value={layoutValue} onChange={(e) => setData({ layout: e.target.value })}>
            <option value="top">Top navigation</option>
            <option value="side">Side navigation</option>
          </select>
        </FieldRow>
        <FieldRow label="Mobile menu">
          <select value={mobile.behavior ?? 'collapse'} onChange={(e) => setMobile({ behavior: e.target.value })}>
            <option value="collapse">Collapsible</option>
            <option value="drawer">Drawer</option>
          </select>
        </FieldRow>
        <FieldRow label="Menu label">
          <input value={mobile.label ?? ''} onChange={(e) => setMobile({ label: e.target.value })} placeholder="Menu" />
        </FieldRow>
        <FieldRow label="Nav items">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navItems.map((item: any) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                <input
                  value={item.label ?? ''}
                  onChange={(e) => {
                    const next = navItems.map((nav: any) => nav.id === item.id ? { ...nav, label: e.target.value } : nav);
                    setData({ navItems: next });
                  }}
                  placeholder="Label"
                />
                <input
                  value={item.slug ?? ''}
                  onChange={(e) => {
                    const next = navItems.map((nav: any) => nav.id === item.id ? { ...nav, slug: e.target.value } : nav);
                    setData({ navItems: next });
                  }}
                  placeholder="slug"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = navItems.filter((nav: any) => nav.id !== item.id);
                    setData({ navItems: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = [...navItems, { id: generateNodeId('nav'), label: 'New', kind: 'route', slug: '' }];
                setData({ navItems: next });
              }}
            >
              Add nav item
            </button>
          </div>
        </FieldRow>
        <div className="panel-hint">Tip: Side layout works best for dashboard-style pages.</div>
      </div>
    );
  }

  if (node.type === 'footer') {
    const navItems = Array.isArray(data.navItems) ? data.navItems : [];
    const socialLinks = Array.isArray(data.socialLinks) ? data.socialLinks : [];
    const legal = data.legal && typeof data.legal === 'object' ? data.legal : {};
    const legalLinks = Array.isArray(legal.links) ? legal.links : [];
    const legalText = typeof legal.text === 'string' ? legal.text : '';
    const setLegal = (patch: Record<string, unknown>) => setData({ legal: { ...legal, ...patch } });
    return (
      <div>
        <FieldRow label="Navigation links">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navItems.map((item: any) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                <input
                  value={item.label ?? ''}
                  onChange={(e) => {
                    const next = navItems.map((nav: any) => nav.id === item.id ? { ...nav, label: e.target.value } : nav);
                    setData({ navItems: next });
                  }}
                  placeholder="Label"
                />
                <input
                  value={item.slug ?? ''}
                  onChange={(e) => {
                    const next = navItems.map((nav: any) => nav.id === item.id ? { ...nav, slug: e.target.value } : nav);
                    setData({ navItems: next });
                  }}
                  placeholder="slug"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = navItems.filter((nav: any) => nav.id !== item.id);
                    setData({ navItems: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = [...navItems, { id: generateNodeId('nav'), label: 'New', kind: 'route', slug: '' }];
                setData({ navItems: next });
              }}
            >
              Add nav item
            </button>
          </div>
        </FieldRow>
        <FieldRow label="Social icons">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {socialLinks.map((link: any) => (
              <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 6 }}>
                <select
                  value={link.platform ?? 'instagram'}
                  onChange={(e) => {
                    const next = socialLinks.map((item: any) => item.id === link.id ? { ...item, platform: e.target.value } : item);
                    setData({ socialLinks: next });
                  }}
                >
                  {SOCIAL_PLATFORM_OPTIONS.map((platform) => (
                    <option key={platform.key} value={platform.key}>{platform.label}</option>
                  ))}
                </select>
                <input
                  value={link.href ?? ''}
                  onChange={(e) => {
                    const next = socialLinks.map((item: any) => item.id === link.id ? { ...item, href: e.target.value } : item);
                    setData({ socialLinks: next });
                  }}
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = socialLinks.filter((item: any) => item.id !== link.id);
                    setData({ socialLinks: next });
                  }}
                >
                  Remove
                </button>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    value={link.label ?? ''}
                    onChange={(e) => {
                      const next = socialLinks.map((item: any) => item.id === link.id ? { ...item, label: e.target.value } : item);
                      setData({ socialLinks: next });
                    }}
                    placeholder="Optional label"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={link.newTab !== false}
                      onChange={(e) => {
                        const next = socialLinks.map((item: any) => item.id === link.id ? { ...item, newTab: e.target.checked } : item);
                        setData({ socialLinks: next });
                      }}
                    />
                    Open in new tab
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = [...socialLinks, { id: generateNodeId('social'), platform: 'instagram', href: '', newTab: true }];
                setData({ socialLinks: next });
              }}
            >
              Add social icon
            </button>
          </div>
        </FieldRow>
        <FieldRow label="Legal text">
          <input
            value={legalText}
            onChange={(e) => setLegal({ text: e.target.value })}
            placeholder="(c) 2026 Your brand. All rights reserved."
          />
        </FieldRow>
        <FieldRow label="Legal links">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {legalLinks.map((link: any) => {
              const hrefValue = link?.kind === 'route'
                ? `/${link.slug ?? ''}`
                : (link?.href ?? '');
              return (
                <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                  <input
                    value={link.label ?? ''}
                    onChange={(e) => {
                      const next = legalLinks.map((item: any) => item.id === link.id ? { ...item, label: e.target.value } : item);
                      setLegal({ links: next });
                    }}
                    placeholder="Label"
                  />
                  <input
                    value={hrefValue}
                    onChange={(e) => {
                      const next = legalLinks.map((item: any) => item.id === link.id ? { ...item, href: e.target.value, kind: 'url' } : item);
                      setLegal({ links: next });
                    }}
                    placeholder="/terms or https://..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = legalLinks.filter((item: any) => item.id !== link.id);
                      setLegal({ links: next });
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const next = [...legalLinks, { id: generateNodeId('legal'), label: 'Privacy', kind: 'url', href: '/privacy', newTab: false }];
                setLegal({ links: next });
              }}
            >
              Add legal link
            </button>
          </div>
        </FieldRow>
        <div className="panel-hint">Tip: Footer columns can be edited by selecting their content blocks.</div>
      </div>
    );
  }

  if (node.type === 'container') {
    const maxWidth = data.maxWidth ?? 'full';
    return (
      <div>
        <FieldRow label="Max width">
          <select value={maxWidth} onChange={(e) => setData({ maxWidth: e.target.value })}>
            {['full','xs','sm','md','lg','xl','2xl','3xl','4xl'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </FieldRow>
        <div className="panel-hint">Tip: Use max width to keep content centered and readable.</div>
      </div>
    );
  }

  if (node.type === 'row') {
    return (
      <div>
        <FieldRow label="Gap">
          <input
            type="number"
            min={0}
            max={12}
            value={data.gap ?? 0}
            onChange={(e) => setData({ gap: Number(e.target.value) })}
          />
        </FieldRow>
        <FieldRow label="Align items">
          <select value={data.align ?? ''} onChange={(e) => setData({ align: e.target.value || undefined })}>
            <option value="">(none)</option>
            <option value="start">Top</option>
            <option value="center">Center</option>
            <option value="end">Bottom</option>
            <option value="stretch">Stretch</option>
            <option value="baseline">Baseline</option>
          </select>
        </FieldRow>
        <FieldRow label="Justify">
          <select value={data.justify ?? ''} onChange={(e) => setData({ justify: e.target.value || undefined })}>
            <option value="">(none)</option>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="between">Space between</option>
            <option value="around">Space around</option>
            <option value="evenly">Space evenly</option>
          </select>
        </FieldRow>
        <div className="panel-hint">Tip: Rows use a 12-column grid. Adjust gaps and alignment here.</div>
      </div>
    );
  }

  if (node.type === 'column') {
    return (
      <div>
        <FieldRow label="Span">
          <input
            type="number"
            min={1}
            max={12}
            value={data.span ?? 12}
            onChange={(e) => setData({ span: Number(e.target.value) })}
          />
        </FieldRow>
        <FieldRow label="Offset">
          <input
            type="number"
            min={0}
            max={11}
            value={data.offset ?? 0}
            onChange={(e) => setData({ offset: Number(e.target.value) })}
          />
        </FieldRow>
        <div className="panel-hint">Tip: Use offset to center a column (e.g., span 6 + offset 3).</div>
      </div>
    );
  }

  return <div>No editable content for this node. Use Styles or select a child node.</div>;
}
