import { describe, expect, it, vi } from 'vitest';

import type { BlueprintStateSnapshot } from '../../foundation/types';
import {
  prepareSnapshotDownload,
  serializeSnapshot,
  triggerSnapshotDownload,
} from '../../foundation/export/download';

const sampleSnapshot: BlueprintStateSnapshot = {
  root: {
    id: 'page_root',
    type: 'page',
    children: [
      {
        id: 'section_hero',
        type: 'section',
        children: [],
        data: { title: 'Hero' },
      } as any,
    ],
  },
};

describe('export download utilities', () => {
  it('serializes snapshot using 2-space pretty print', () => {
    const json = serializeSnapshot(sampleSnapshot);
    expect(json).toContain('\n  "root"');
    expect(JSON.parse(json)).toEqual(sampleSnapshot);
  });

  it('prepares payload with filename, json, and blob', async () => {
    const payload = prepareSnapshotDownload(sampleSnapshot, 'Hero Page');
    expect(payload.filename).toBe('theme01-hero-page.json');
    expect(JSON.parse(payload.json)).toEqual(sampleSnapshot);
    const blobText = await payload.blob.text();
    expect(JSON.parse(blobText)).toEqual(sampleSnapshot);
  });

  it('triggers anchor-based download flow when msSaveOrOpenBlob is unavailable', async () => {
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const click = vi.fn();
    const anchor: any = { click, style: {} };
    const documentMock: Partial<Document> = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        expect(tag).toBe('a');
        return anchor;
      }),
      body: {
        appendChild,
        removeChild,
      } as any,
    };

    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    const setTimeoutMock = vi.fn((cb: () => void) => {
      cb();
      return 0 as any;
    });

    triggerSnapshotDownload(sampleSnapshot, 'Landing Hero', {
      document: documentMock as Document,
      navigator: {} as Navigator,
      url: { createObjectURL, revokeObjectURL },
      setTimeout: setTimeoutMock,
    });

    expect(documentMock.createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('theme01-landing-hero.json');
    expect(anchor.href).toBe('blob:mock-url');
    expect(anchor.rel).toBe('noopener');
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(setTimeoutMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    const blobText = await blobArg.text();
    expect(JSON.parse(blobText)).toEqual(sampleSnapshot);
  });

  it('uses msSaveOrOpenBlob when available (legacy Edge)', async () => {
    const msSaveOrOpenBlob = vi.fn();
    const result = triggerSnapshotDownload(sampleSnapshot, 'Edge Export', {
      navigator: { msSaveOrOpenBlob } as any,
    });

    expect(result.filename).toBe('theme01-edge-export.json');
    expect(msSaveOrOpenBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = msSaveOrOpenBlob.mock.calls[0];
    expect(filename).toBe('theme01-edge-export.json');
    const text = await (blob as Blob).text();
    expect(JSON.parse(text)).toEqual(sampleSnapshot);
  });
});
