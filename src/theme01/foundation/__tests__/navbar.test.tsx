/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { BlueprintProvider, Renderer } from '../renderer/Renderer';
import type { BlueprintNode, BlueprintStateSnapshot } from '../types';

function createNavSnapshot(): BlueprintStateSnapshot {
  const header: BlueprintNode = {
    id: 'header-root',
    type: 'header',
    children: [],
    slots: { logo: [], right: [] },
    data: {
      navItems: [
        { id: 'about', label: 'About', kind: 'route', slug: 'about' },
        { id: 'docs', label: 'Docs', kind: 'route', slug: 'docs' },
        { id: 'external', label: 'External', kind: 'url', href: 'https://example.com', newTab: true },
      ],
    },
  } as any;

  const page: BlueprintNode = {
    id: 'page-root',
    type: 'page',
    children: [header],
  } as any;

  return { root: page };
}

function BlueprintHarness({ snapshot }: { snapshot: BlueprintStateSnapshot }) {
  return (
    <BlueprintProvider snapshot={snapshot}>
      <Renderer nodeId={snapshot.root.id} />
    </BlueprintProvider>
  );
}

describe('NavBar routing behaviour', () => {
  it('marks the active route and navigates client-side on click', async () => {
    const snapshot = createNavSnapshot();
    const locations: string[] = [];

    const LocationTracker: React.FC = () => {
      const location = useLocation();
      useEffect(() => {
        locations.push(location.pathname);
      }, [location.pathname]);
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/about']}>
        <LocationTracker />
        <BlueprintHarness snapshot={snapshot} />
      </MemoryRouter>,
    );

    const aboutLink = document.querySelector('nav[data-role="navbar"] a[data-nav-item-id="about"]') as HTMLAnchorElement | null;
    expect(aboutLink).not.toBeNull();
    expect(aboutLink!.getAttribute('data-active')).toBe('true');

    const docsLink = document.querySelector('nav[data-role="navbar"] a[data-nav-item-id="docs"]') as HTMLAnchorElement | null;
    expect(docsLink).not.toBeNull();
    expect(docsLink!.className).toMatch(/focus-visible:/);
    expect(docsLink!.getAttribute('data-active')).toBeNull();

    fireEvent.click(docsLink!);

    await waitFor(() => {
      expect(locations[locations.length - 1]).toBe('/docs');
      expect(docsLink!.getAttribute('data-active')).toBe('true');
    });
  });

  it('activates route navigation on Space key', async () => {
    const snapshot = createNavSnapshot();
    const locations: string[] = [];

    const LocationTracker: React.FC = () => {
      const location = useLocation();
      useEffect(() => {
        locations.push(location.pathname);
      }, [location.pathname]);
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/about']}>
        <LocationTracker />
        <BlueprintHarness snapshot={snapshot} />
      </MemoryRouter>,
    );

    const docsLinks = Array.from(document.querySelectorAll('nav[data-role="navbar"] a[data-nav-item-id="docs"]')) as HTMLAnchorElement[];
    expect(docsLinks.length).toBeGreaterThan(0);
    for (const link of docsLinks) {
      link.focus();
      fireEvent.keyDown(link, { key: 'Enter', code: 'Enter', charCode: 13, keyCode: 13 });
    }

    await waitFor(() => {
      expect(locations[locations.length - 1]).toBe('/docs');
      const activeLink = document.querySelector('nav[data-role="navbar"] a[data-nav-item-id="docs"][data-active="true"]');
      expect(activeLink).not.toBeNull();
    });
  });

  it('opens external links in a new tab when flagged', () => {
    const snapshot = createNavSnapshot();

    render(
      <MemoryRouter initialEntries={['/about']}>
        <BlueprintHarness snapshot={snapshot} />
      </MemoryRouter>,
    );

    const externalLink = document.querySelector('nav[data-role="navbar"] a[data-nav-item-id="external"]') as HTMLAnchorElement | null;
    expect(externalLink).not.toBeNull();
    expect(externalLink!.className).toMatch(/focus-visible:/);
    expect(externalLink!.getAttribute('target')).toBe('_blank');
    expect(externalLink!.getAttribute('rel')).toContain('noopener');
  });
});
