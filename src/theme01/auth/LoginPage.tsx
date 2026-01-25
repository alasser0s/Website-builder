import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBase } from '../editor/api';

type TokenResponse = {
  access: string;
  refresh?: string;
  role?: string;
};

type WebsiteSummary = {
  id: number;
  domain?: string | null;
  internal_domain?: string | null;
  status?: string;
  is_published?: boolean;
};

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function storeTokens(payload: TokenResponse) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', payload.access);
  if (payload.refresh) {
    localStorage.setItem('refresh_token', payload.refresh);
  }
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

async function requestJson<T>(path: string, options: RequestInit = {}) {
  const base = getApiBase();
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : 'Request failed.';
    const error: any = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data as T;
}

async function loginWithEmail(email: string, password: string) {
  return requestJson<TokenResponse>('/api/v1/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

async function fetchWebsites(token: string) {
  return requestJson<WebsiteSummary[]>('/api/v1/store/websites/', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'selecting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [websites, setWebsites] = useState<WebsiteSummary[]>([]);

  const handleSelectWebsite = useCallback((websiteId: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('website_id', String(websiteId));
    }
    navigate(`/editor?website_id=${websiteId}`, { replace: true });
  }, [navigate]);

  const resolveWebsites = useCallback(async (token: string) => {
    const list = await fetchWebsites(token);
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('No website found for this account.');
    }
    return list;
  }, []);

  const bootstrap = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const list = await resolveWebsites(token);
      setWebsites(list);
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('website_id') : null;
      if (storedId) {
        const matched = list.find((site) => String(site.id) === storedId);
        if (matched) {
          handleSelectWebsite(matched.id);
          return;
        }
      }
      if (list.length === 1) {
        handleSelectWebsite(list[0].id);
        return;
      }
      setStatus('selecting');
    } catch (err: any) {
      clearTokens();
      setStatus('idle');
      setError(err?.message || 'Unable to load websites.');
    }
  }, [handleSelectWebsite, resolveWebsites]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const isSubmitting = status === 'loading';
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;
  const helperText = useMemo(() => {
    if (status === 'selecting') return 'Select which website to open in the editor.';
    return 'Sign in to manage your website builder.';
  }, [status]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    setError(null);
    try {
      const payload = await loginWithEmail(email.trim(), password);
      storeTokens(payload);
      const list = await resolveWebsites(payload.access);
      setWebsites(list);
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('website_id') : null;
      if (storedId) {
        const matched = list.find((site) => String(site.id) === storedId);
        if (matched) {
          handleSelectWebsite(matched.id);
          return;
        }
      }
      if (list.length === 1) {
        handleSelectWebsite(list[0].id);
        return;
      }
      setStatus('selecting');
    } catch (err: any) {
      clearTokens();
      setStatus('idle');
      setError(err?.message || 'Unable to sign in.');
    }
  };

  return (
    <div className="login-root">
      <div className="login-shell">
        <div className="login-header">
          <span className="login-pill">Yami Hub Builder</span>
          <h1>Welcome back</h1>
          <p>{helperText}</p>
        </div>

        {status === 'selecting' ? (
          <div className="login-select">
            <div className="login-section-title">Your websites</div>
            <div className="login-site-list">
              {websites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  className="login-site-card"
                  onClick={() => handleSelectWebsite(site.id)}
                >
                  <div className="login-site-name">{site.domain || site.internal_domain || `Website ${site.id}`}</div>
                  <div className="login-site-meta">
                    <span>ID {site.id}</span>
                    {site.status ? <span>{site.status}</span> : null}
                    {site.is_published ? <span>Published</span> : <span>Draft</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <div className="login-error">{error}</div> : null}
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
