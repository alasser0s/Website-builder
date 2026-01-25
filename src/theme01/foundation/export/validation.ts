import type { BlueprintStateSnapshot } from '../types';
import { validateTree, type ValidationIssue } from '../validators';

export type ExportValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationIssue[] };

export function validateSnapshotForExport(snapshot: BlueprintStateSnapshot): ExportValidationResult {
  const errors: ValidationIssue[] = [];
  try {
    validateTree(snapshot, (issue) => {
      errors.push(issue);
    });
  } catch (error) {
    errors.push(...normalizeThrownError(error));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

function normalizeThrownError(error: unknown): ValidationIssue[] {
  if (error instanceof Error) {
    return extractIssuesFromMessage(error.message);
  }
  return [{ nodeId: 'root', reason: String(error) }];
}

function extractIssuesFromMessage(message: string): ValidationIssue[] {
  const invalidNodeMatch = /^Invalid node\(([^)]+)\):\s*(.*)$/.exec(message);
  if (invalidNodeMatch) {
    const [, nodeId, reasons] = invalidNodeMatch;
    return reasons.split(/;\s*/).filter(Boolean).map((reason) => ({ nodeId, reason }));
  }

  const duplicateMatch = /^Duplicate node id detected: (.+)$/.exec(message);
  if (duplicateMatch) {
    return [{ nodeId: duplicateMatch[1], reason: message }];
  }

  return [{ nodeId: 'root', reason: message }];
}
