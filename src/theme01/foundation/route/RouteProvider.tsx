import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { pageRegistry } from './pageRegistry';

interface RouteProviderProps {
  children: React.ReactElement;
}

export const AppRoutes: React.FC<RouteProviderProps> = ({ children }) => {
  const entries = React.useMemo(() => Object.values(pageRegistry), []);
  const defaultEntry = React.useMemo(() => entries.find((entry) => entry.slug !== '404') ?? entries[0], [entries]);
  const notFoundEntry = React.useMemo(() => entries.find((entry) => entry.slug === '404') ?? null, [entries]);
  const renderChild = React.useCallback(() => React.cloneElement(children), [children]);

  return (
    <Routes>
      {defaultEntry ? (
        <Route path="/" element={<Navigate to={`/${defaultEntry.slug}`} replace />} />
      ) : (
        <Route path="/" element={renderChild()} />
      )}
      {entries.map((entry) => (
        <Route key={entry.slug} path={`/${entry.slug}`} element={renderChild()} />
      ))}
      {notFoundEntry ? (
        <Route path="*" element={<Navigate to={`/${notFoundEntry.slug}`} replace />} />
      ) : (
        <Route path="*" element={renderChild()} />
      )}
    </Routes>
  );
};

export const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
  return (
    <BrowserRouter>
      <AppRoutes>{children}</AppRoutes>
    </BrowserRouter>
  );
};
