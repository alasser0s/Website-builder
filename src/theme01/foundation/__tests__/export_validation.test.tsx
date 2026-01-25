import { describe, expect, it } from 'vitest';

import { validateSnapshotForExport } from '../../foundation/export/validation';
import type { BlueprintStateSnapshot } from '../../foundation/types';

describe('validateSnapshotForExport', () => {
  it('returns ok for valid snapshot', () => {
    const snapshot: BlueprintStateSnapshot = {
      root: {
        id: 'page_root',
        type: 'page',
        children: [],
      } as any,
    };

    expect(validateSnapshotForExport(snapshot)).toEqual({ ok: true });
  });

  it('collects node-specific errors when snapshot invalid', () => {
    const snapshot = {
      root: {
        id: 'page_root',
        type: 'page',
        children: [
          {
            id: 'header_main',
            type: 'header',
            slots: { logo: ['missing'], right: [] },
            children: [{ id: 'logo1', type: 'component', children: [] }] as any,
            data: {
              navItems: [
                { id: 'nav1', label: '', kind: 'route', slug: 42 as any },
              ],
            },
          } as any,
          {
            id: 'logo1',
            type: 'section',
            children: [],
          } as any,
        ],
      },
    } as BlueprintStateSnapshot;

    const result = validateSnapshotForExport(snapshot);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected validation to fail');

    const issues = result.errors.map(({ nodeId, reason }) => [nodeId, reason]);
    expect(issues).toContainEqual(['header_main', 'Header slot references missing child id: missing']);
    expect(issues).toContainEqual(['header_main', 'Header child not referenced by slots: logo1']);
    expect(issues).toContainEqual(['header_main', 'navItem(nav1) missing label']);
    expect(issues).toContainEqual(['header_main', 'navItem(nav1) slug must be string']);
    expect(issues).toContainEqual(['logo1', 'Duplicate node id detected: logo1']);
  });

  it('reports structural errors on snapshot shape', () => {
    const result = validateSnapshotForExport({} as BlueprintStateSnapshot);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected validation to fail');
    expect(result.errors).toContainEqual({ nodeId: 'root', reason: 'Snapshot missing root' });
  });
});
