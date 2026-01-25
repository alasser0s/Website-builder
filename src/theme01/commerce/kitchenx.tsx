import React, { useEffect, useMemo, useState } from 'react';
import type { MenuGridNode, CartNode } from '../foundation/types';
import { mapStylesToClasses } from '../styles/mapper';
import { theme01Tokens } from '../styles/tokens';
import { cartActions, calculateTotals, useCartStore } from './cartStore';

const USE_MOCKS = (() => {
  const flag = (import.meta as any)?.env?.VITE_USE_MOCKS as string | undefined;
  return flag === 'true' || flag === '1';
})();

type KitchenXMenuItem = {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  vat_percent: string;
  image?: string | null;
  attributes?: Record<string, unknown>;
  category?: number | null;
};

type KitchenXCategory = {
  id: number;
  name: string;
  slug?: string | null;
  items: KitchenXMenuItem[];
};

type KitchenXMenuResponse = {
  tenant: { id: number; name: string; subdomain: string };
  kitchen: { id: number; name: string; vat_percent?: string };
  categories: KitchenXCategory[];
};

const MOCK_MENU: KitchenXMenuResponse = {
  tenant: { id: 1, name: 'Mock Kitchen', subdomain: 'mock' },
  kitchen: { id: 1, name: 'Mock Kitchen', vat_percent: '15' },
  categories: [
    {
      id: 1,
      name: 'Burgers',
      items: [
        { id: 101, name: 'Classic Burger', description: 'Beef patty, cheese, lettuce.', price: '32.00', vat_percent: '15', image: null, category: 1 },
        { id: 102, name: 'Chicken Burger', description: 'Crispy chicken, spicy mayo.', price: '28.00', vat_percent: '15', image: null, category: 1 },
      ],
    },
    {
      id: 2,
      name: 'Sides',
      items: [
        { id: 201, name: 'Fries', description: 'Crispy golden fries.', price: '12.00', vat_percent: '15', image: null, category: 2 },
        { id: 202, name: 'Onion Rings', description: 'Battered and fried.', price: '14.00', vat_percent: '15', image: null, category: 2 },
      ],
    },
  ],
};

type MenuState = {
  data?: KitchenXMenuResponse;
  error?: string;
  loading: boolean;
};

const menuCache = new Map<string, KitchenXMenuResponse>();
const menuPromises = new Map<string, Promise<KitchenXMenuResponse>>();

function normalizeBase(input?: string) {
  if (!input) return '';
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

function resolveApiBase(explicit?: string) {
  if (explicit) return normalizeBase(explicit);
  const globalBase = typeof window !== 'undefined' ? (window as any).__KX_API_BASE__ as string | undefined : undefined;
  if (globalBase) return normalizeBase(globalBase);
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  if (envBase) return normalizeBase(envBase);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBase(window.location.origin);
  }
  return '';
}

function resolveDomain(explicit?: string) {
  if (explicit && explicit.trim()) return explicit.trim();
  const globalDomain = typeof window !== 'undefined' ? (window as any).__KX_DOMAIN__ as string | undefined : undefined;
  if (globalDomain && globalDomain.trim()) return globalDomain.trim();
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return '';
}

async function fetchKitchenXMenu(domain: string, apiBase: string): Promise<KitchenXMenuResponse> {
  if (USE_MOCKS) {
    return Promise.resolve(MOCK_MENU);
  }
  const base = normalizeBase(apiBase);
  const url = `${base}/api/v1/kitchenx/public/menu?domain=${encodeURIComponent(domain)}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Unable to load menu.');
  }
  return response.json() as Promise<KitchenXMenuResponse>;
}

function useKitchenXMenu(domain: string, apiBase: string): MenuState {
  const key = `${apiBase}|${domain}`;
  const cached = menuCache.get(key);
  const [state, setState] = useState<MenuState>({
    data: cached,
    loading: !cached && !!domain,
    error: undefined,
  });

  useEffect(() => {
    if (!domain) {
      setState({ data: undefined, loading: false, error: 'Missing domain.' });
      return;
    }
    if (menuCache.has(key)) {
      setState({ data: menuCache.get(key), loading: false, error: undefined });
      return;
    }
    let active = true;
    const promise = menuPromises.get(key) ?? fetchKitchenXMenu(domain, apiBase);
    menuPromises.set(key, promise);
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    promise
      .then((payload) => {
        menuCache.set(key, payload);
        menuPromises.delete(key);
        if (!active) return;
        setState({ data: payload, loading: false, error: undefined });
      })
      .catch((err) => {
        menuPromises.delete(key);
        if (!active) return;
        setState({ data: undefined, loading: false, error: err?.message || 'Unable to load menu.' });
      });
    return () => {
      active = false;
    };
  }, [apiBase, domain, key]);

  return state;
}

function formatMoney(value: number, currency = 'SAR') {
  if (!Number.isFinite(value)) return '';
  return `${value.toFixed(2)} ${currency}`;
}

function mapInlineStyles(styles: Record<string, unknown> | undefined): React.CSSProperties | undefined {
  if (!styles) return undefined;
  const style: React.CSSProperties = {};
  const bgImage = (styles as any)['bgImage'];
  if (typeof bgImage === 'string' && bgImage.trim() !== '') {
    style.backgroundImage = /^url\(/.test(bgImage) ? (bgImage as any) : `url("${bgImage}")`;
    const bgRepeat = (styles as any)['bgRepeat'];
    const bgSize = (styles as any)['bgSize'];
    const bgPosition = (styles as any)['bgPosition'];
    if (typeof bgRepeat === 'string' && bgRepeat) style.backgroundRepeat = bgRepeat as any;
    if (typeof bgSize === 'string' && bgSize) style.backgroundSize = bgSize as any;
    if (typeof bgPosition === 'string' && bgPosition) style.backgroundPosition = bgPosition as any;
    if (!style.backgroundRepeat) style.backgroundRepeat = 'no-repeat';
    if (!style.backgroundSize) style.backgroundSize = 'cover';
    if (!style.backgroundPosition) style.backgroundPosition = 'center';
  }
  return Object.keys(style).length ? style : undefined;
}

export function MenuGrid({ node }: { node: MenuGridNode }) {
  const data = (node.data ?? {}) as any;
  const domain = resolveDomain(data.domain);
  const apiBase = resolveApiBase(data.api_base);
  const { data: menu, loading, error } = useKitchenXMenu(domain, apiBase);
  const categories = useMemo(() => {
    if (!menu?.categories) return [];
    const filter = Array.isArray(data.category_filter) ? data.category_filter : null;
    if (!filter || filter.length === 0) return menu.categories;
    return menu.categories.filter((cat) => filter.includes(cat.id));
  }, [data.category_filter, menu]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!categories.length) {
      setActiveCategoryId(null);
      return;
    }
    if (activeCategoryId && categories.some((cat) => cat.id === activeCategoryId)) return;
    setActiveCategoryId(categories[0].id);
  }, [categories, activeCategoryId]);

  useEffect(() => {
    if (menu?.kitchen?.id) {
      cartActions.setKitchen(menu.kitchen.id, 'SAR');
    }
  }, [menu]);

  const activeCategory = categories.find((cat) => cat.id === activeCategoryId) ?? categories[0];
  const columns = Math.max(1, Math.min(6, Number(data.columns) || 3));
  const showImages = data.show_images !== false;
  const showPrices = data.show_prices !== false;
  const showAddToCart = data.show_add_to_cart !== false;
  const showCategoryTabs = data.show_category_tabs !== false;

  const classes = mapStylesToClasses(node.styles ?? {}, theme01Tokens);
  const inline = mapInlineStyles(node.styles as Record<string, unknown> | undefined);

  return (
    <section
      data-node-id={node.id}
      data-node-type={node.type}
      data-kx-menu="true"
      data-domain={domain || undefined}
      data-api-base={apiBase || undefined}
      data-columns={String(columns)}
      data-show-images={String(showImages)}
      data-show-prices={String(showPrices)}
      data-show-add-to-cart={String(showAddToCart)}
      data-show-category-tabs={String(showCategoryTabs)}
      data-category-filter={Array.isArray(data.category_filter) ? data.category_filter.join(',') : undefined}
      className={classes}
      style={inline}
    >
      {data.title ? <h2 className="text-xl font-bold mb-2">{data.title}</h2> : null}
      {data.subtitle ? <p className="text-sm opacity-80 mb-4">{data.subtitle}</p> : null}

      <div data-kx-menu-tabs>
        {showCategoryTabs && categories.length > 1 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={cat.id === activeCategoryId ? 'px-3 py-1 rounded-md bg-primary text-surface' : 'px-3 py-1 rounded-md border border-muted text-text'}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? <div className="text-sm opacity-70">Loading menu...</div> : null}
      {error ? <div className="text-sm text-primary">{error}</div> : null}

      <div data-kx-menu-items>
        {activeCategory ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 16 }}>
            {activeCategory.items.map((item) => {
              const price = Number(item.price || 0);
              const vatRate = Number(item.vat_percent || 0);
              const image = item.image || '';
              return (
                <article key={item.id} className="border border-muted rounded-md overflow-hidden">
                  {showImages && image ? (
                    <img src={image} alt={item.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  ) : null}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold">{item.name}</h3>
                      {showPrices ? <span className="text-sm font-medium">{formatMoney(price, 'SAR')}</span> : null}
                    </div>
                    {item.description ? <p className="text-sm opacity-80 mt-2">{item.description}</p> : null}
                    {showAddToCart ? (
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-surface"
                        onClick={() => cartActions.addItem({ id: item.id, name: item.name, price, vatRate, image }, 1)}
                      >
                        Add to cart
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

async function createKitchenXOrder(args: {
  apiBase: string;
  kitchenId: number;
  items: { id: number; quantity: number; price: number; vatRate: number }[];
  successUrl?: string;
  cancelUrl?: string;
  paymentMethod: 'card' | 'pay_on_pickup';
}) {
  if (USE_MOCKS) {
    return { payment: { requires_redirect: false } };
  }
  const payload: Record<string, unknown> = {
    kitchen: args.kitchenId,
    payment_method: args.paymentMethod,
    items: args.items.map((item) => ({
      item: item.id,
      quantity: String(item.quantity),
      unit_price: String(item.price.toFixed(2)),
      vat_rate: String(item.vatRate || 0),
    })),
  };
  if (args.paymentMethod === 'card') {
    payload.success_url = args.successUrl;
    payload.cancel_url = args.cancelUrl || args.successUrl;
  }
  const url = `${normalizeBase(args.apiBase)}/api/v1/kitchenx/public/orders`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const msg = typeof data?.detail === 'string' ? data.detail : 'Unable to place order.';
    throw new Error(msg);
  }
  return data as { payment?: { redirect_url?: string; requires_redirect?: boolean } };
}

export function CartPanel({ node }: { node: CartNode }) {
  const cart = useCartStore();
  const data = (node.data ?? {}) as any;
  const apiBase = resolveApiBase(data.api_base);
  const domain = resolveDomain(data.domain);
  const [error, setError] = useState<string | null>(null);
  const totals = calculateTotals(cart);
  const currency = cart.currency || 'SAR';
  const paymentMethod = data.payment_method === 'pay_on_pickup' ? 'pay_on_pickup' : 'card';

  const checkoutLabel = data.checkout_label || 'Checkout';
  const emptyText = data.empty_text || 'Your cart is empty.';

  const classes = mapStylesToClasses(node.styles ?? {}, theme01Tokens);
  const inline = mapInlineStyles(node.styles as Record<string, unknown> | undefined);

  const handleCheckout = async () => {
    setError(null);
    if (!cart.kitchenId) {
      setError('Kitchen is not resolved yet.');
      return;
    }
    if (cart.items.length === 0) {
      setError('Cart is empty.');
      return;
    }
    if (paymentMethod === 'card' && !data.success_url) {
      setError('Checkout links are not configured.');
      return;
    }
    try {
      const result = await createKitchenXOrder({
        apiBase,
        kitchenId: cart.kitchenId,
        items: cart.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          vatRate: item.vatRate,
        })),
        successUrl: data.success_url,
        cancelUrl: data.cancel_url,
        paymentMethod,
      });
      cartActions.clear();
      if (result?.payment?.requires_redirect && result.payment.redirect_url) {
        window.location.href = result.payment.redirect_url;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to place order.');
    }
  };

  return (
    <aside
      data-node-id={node.id}
      data-node-type={node.type}
      data-kx-cart="true"
      data-domain={domain || undefined}
      data-api-base={apiBase || undefined}
      data-success-url={data.success_url || undefined}
      data-cancel-url={data.cancel_url || undefined}
      data-payment-method={paymentMethod}
      className={classes}
      style={inline}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{data.title || 'Cart'}</h3>
        {cart.items.length > 0 ? (
          <button type="button" className="text-sm underline" onClick={() => cartActions.clear()}>
            Clear
          </button>
        ) : null}
      </div>
      {cart.items.length === 0 ? (
        <p className="text-sm opacity-75">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div data-kx-cart-items>
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs opacity-70">{formatMoney(item.price, currency)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-2 py-1 border rounded-md" onClick={() => cartActions.updateQty(item.id, item.quantity - 1)}>-</button>
                  <span className="text-sm">{item.quantity}</span>
                  <button type="button" className="px-2 py-1 border rounded-md" onClick={() => cartActions.updateQty(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div data-kx-cart-totals className="border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(totals.subtotal, currency)}</span></div>
            <div className="flex justify-between"><span>VAT</span><span>{formatMoney(totals.vat, currency)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(totals.total, currency)}</span></div>
          </div>
          <div data-kx-cart-error>{error ? <div className="text-sm text-primary">{error}</div> : null}</div>
          <button type="button" data-kx-checkout="true" className="mt-2 px-4 py-2 rounded-md bg-primary text-surface" onClick={handleCheckout}>
            {checkoutLabel}
          </button>
        </div>
      )}
    </aside>
  );
}
