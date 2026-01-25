#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { BlueprintStateSnapshot } from '../src/theme01/foundation/types';
import { BlueprintProvider, Renderer } from '../src/theme01/foundation/renderer/Renderer';
import { getRuntimeCSS } from '../src/theme01/styles/runtime';
import { getKitchenXRuntimeScript } from '../src/theme01/commerce/runtime';

type CLIOptions = {
  inputPath?: string;
  nodeId?: string;
};

function parseArgs(): CLIOptions {
  const options: CLIOptions = {};
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--input' || token === '-i') {
      options.inputPath = args[index + 1];
      index += 1;
    } else if (token === '--node-id' || token === '-n') {
      options.nodeId = args[index + 1];
      index += 1;
    } else if (!options.inputPath) {
      options.inputPath = token;
    } else {
      // Ignore unknown flags but keep iterating
    }
  }

  return options;
}

function readSnapshot(filePath: string): BlueprintStateSnapshot {
  const resolvedPath = path.resolve(filePath);
  const fileContents = fs.readFileSync(resolvedPath, 'utf-8');
  return JSON.parse(fileContents) as BlueprintStateSnapshot;
}

type Metadata = Record<string, unknown>;

function extractMetadata(snapshot: BlueprintStateSnapshot): Metadata {
  const rootData = (snapshot.root as any)?.data;
  if (!rootData || typeof rootData !== 'object') {
    return {};
  }
  return { ...rootData };
}

function hasKitchenXNodes(snapshot: BlueprintStateSnapshot): boolean {
  const stack = [snapshot.root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === 'menu_grid' || node.type === 'cart') {
      return true;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        stack.push(child);
      }
    }
  }
  return false;
}

function main(): void {
  try {
    const { inputPath, nodeId } = parseArgs();

    if (!inputPath) {
      throw new Error('Blueprint input path is required. Pass --input <file> or provide the path as the first argument.');
    }

    const snapshot = readSnapshot(inputPath);
    const targetId = nodeId ?? snapshot.root?.id;
    if (!targetId) {
      throw new Error('Unable to determine node id to render. Provide --node-id explicitly or ensure snapshot.root.id exists.');
    }

    const html = renderToStaticMarkup(
      React.createElement(
        BlueprintProvider,
        { snapshot },
        React.createElement(Renderer, { nodeId: targetId }),
      ),
    );

    const result = {
      html,
      css: getRuntimeCSS(),
      metadata: extractMetadata(snapshot),
      js: hasKitchenXNodes(snapshot) ? getKitchenXRuntimeScript() : '',
    };

    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

main();
