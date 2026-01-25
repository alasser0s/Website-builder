/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import path from 'node:path';
import { existsSync } from 'node:fs';

import * as storyModule from '../stories/BlueprintComponents.stories';

expect.extend({ toHaveNoViolations });

afterEach(() => {
  cleanup();
});

type MetaType = {
  render?: (args: Record<string, unknown>) => React.ReactElement;
  args?: Record<string, unknown>;
};

type StoryExport = {
  args?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  render?: (args: Record<string, unknown>) => React.ReactElement;
};

const { default: metaRaw, ...storyExports } = storyModule as { default: MetaType } & Record<string, StoryExport>;
const meta = metaRaw ?? {};

describe('Blueprint component stories', () => {
  for (const [name, story] of Object.entries(storyExports)) {
    if (!story || typeof story !== 'object') continue;

    it(`${name} story passes axe`, async () => {
      const storyArgs = { ...(meta.args ?? {}), ...(story.args ?? {}) };
      const renderFn = story.render ?? meta.render;
      if (typeof renderFn !== 'function') {
        throw new Error(`Story ${name} is missing a render function`);
      }
      const element = renderFn(storyArgs) as React.ReactElement;
      const { container } = render(element);
      const results = await axe(container, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
      const criticalViolations = results.violations.filter((violation) => violation.impact === 'critical');
      expect(criticalViolations, () => JSON.stringify(results.violations, null, 2)).toHaveLength(0);
    });

    it(`${name} story exposes screenshot asset`, () => {
      const screenshotParam = story.parameters?.screenshot as unknown;
      const imagePath = typeof screenshotParam === 'string'
        ? screenshotParam
        : screenshotParam && typeof screenshotParam === 'object'
          ? (screenshotParam as { image?: string; src?: string }).image
              ?? (screenshotParam as { image?: string; src?: string }).src
              ?? ''
          : '';

      expect(imagePath).toBeTruthy();
      const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      const absolutePath = path.resolve(__dirname, '../../../..', 'public', relativePath);
      expect(existsSync(absolutePath)).toBe(true);
    });
  }
});
