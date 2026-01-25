import type { BlueprintStateSnapshot } from '../types';
import { buildExportFilename } from './naming';

const JSON_CONTENT_TYPE = 'application/json';

export interface DownloadDependencies {
  document?: Document;
  navigator?: Navigator & { msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => void };
  url?: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  setTimeout?: typeof setTimeout;
}

export interface SnapshotDownloadPayload {
  filename: string;
  json: string;
  blob: Blob;
}

export function serializeSnapshot(snapshot: BlueprintStateSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function prepareSnapshotDownload(
  snapshot: BlueprintStateSnapshot,
  slug: string | null | undefined,
): SnapshotDownloadPayload {
  const json = serializeSnapshot(snapshot);
  const filename = buildExportFilename(slug);
  const blob = new Blob([json], { type: JSON_CONTENT_TYPE });
  return { filename, json, blob };
}

export function triggerSnapshotDownload(
  snapshot: BlueprintStateSnapshot,
  slug: string | null | undefined,
  deps: DownloadDependencies = {},
): { filename: string } {
  const { filename, blob } = prepareSnapshotDownload(snapshot, slug);

  const navigatorRef = deps.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  if (navigatorRef && (navigatorRef as any).msSaveOrOpenBlob) {
    (navigatorRef as any).msSaveOrOpenBlob(blob, filename);
    return { filename };
  }

  const documentRef = deps.document ?? (typeof document !== 'undefined' ? document : undefined);
  const urlApi = deps.url ?? (typeof URL !== 'undefined' ? URL : undefined);
  const schedule = deps.setTimeout ?? setTimeout;

  if (!documentRef || typeof documentRef.createElement !== 'function') {
    throw new Error('Document is required to trigger download');
  }
  if (!documentRef.body || typeof documentRef.body.appendChild !== 'function' || typeof documentRef.body.removeChild !== 'function') {
    throw new Error('Document body must support appendChild/removeChild');
  }
  if (!urlApi || typeof urlApi.createObjectURL !== 'function' || typeof urlApi.revokeObjectURL !== 'function') {
    throw new Error('URL.createObjectURL and URL.revokeObjectURL are required to trigger download');
  }

  const anchor = documentRef.createElement('a');
  const objectUrl = urlApi.createObjectURL(blob);
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  documentRef.body.appendChild(anchor);
  anchor.click();
  documentRef.body.removeChild(anchor);

  schedule(() => urlApi.revokeObjectURL(objectUrl), 0);

  return { filename };
}
