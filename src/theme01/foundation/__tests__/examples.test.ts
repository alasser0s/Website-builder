import { describe, it, expect } from 'vitest';
import { validateTree } from '../../foundation/validators';
import * as examples from '../../blueprint/examples';

describe('examples validate', () => {
  it('all examples pass validateTree', () => {
    const entries = Object.entries(examples);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, s] of entries) {
      try {
        validateTree(s as any);
      } catch (e: any) {
        throw new Error(`Example ${name} failed: ${e?.message ?? e}`);
      }
    }
  });
});


