/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { AppRoutes } from '../route/RouteProvider';
import { BuilderShell } from '../../../App';

describe('RouteProvider 404 fallback', () => {
  it('redirects unknown paths to the 404 blueprint while keeping nav functional', async () => {
    const locations: string[] = [];

    const LocationTracker: React.FC = () => {
      const location = useLocation();
      useEffect(() => {
        locations.push(location.pathname);
      }, [location.pathname]);
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/nope']}>
        <LocationTracker />
        <AppRoutes>
          <BuilderShell />
        </AppRoutes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-node-id="header_404"]')).not.toBeNull();
    });

    const aboutLink = document.querySelector('nav[data-role="navbar"] a[data-nav-item-id="nav_about"]') as HTMLAnchorElement | null;
    expect(aboutLink).not.toBeNull();

    fireEvent.click(aboutLink!);

    await waitFor(() => {
      expect(locations[locations.length - 1]).toBe('/about');
    });

    expect(document.querySelector('[data-node-id="header_404"]')).toBeNull();
  });
});
