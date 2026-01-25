import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { validateTree } from '../../foundation/validators';
import type { BlueprintStateSnapshot } from '../../foundation/types';

const exportsRoot = resolve(process.cwd(), 'docs', 'exports');

function collectJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (stats.isFile() && entry.toLowerCase().endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

const exportFiles = existsSync(exportsRoot) ? collectJsonFiles(exportsRoot) : [];

describe('theme01 exported snapshots', () => {
  if (exportFiles.length === 0) {
    it('finds no exported JSON snapshots yet', () => {
      expect(exportFiles).toHaveLength(0);
    });
    return;
  }

  for (const filePath of exportFiles) {
    const label = relative(exportsRoot, filePath) || filePath;
    it(`validates ${label}`, () => {
      const raw = readFileSync(filePath, 'utf8');
      const snapshot = JSON.parse(raw) as BlueprintStateSnapshot;
      expect(() => validateTree(snapshot)).not.toThrow();
    });
  }
});
