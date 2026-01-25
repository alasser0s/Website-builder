import { useSyncExternalStore } from 'react';

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  vatRate: number;
  image?: string;
};

export type CartState = {
  kitchenId?: number;
  currency: string;
  items: CartItem[];
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: CartState = {
  currency: 'SAR',
  items: [],
};

function notify() {
  for (const listener of listeners) listener();
}

function setState(next: CartState) {
  state = next;
  notify();
}

export function getCartState(): CartState {
  return state;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCartStore(): CartState {
  return useSyncExternalStore(subscribe, getCartState, getCartState);
}

function upsertItem(next: CartState, item: CartItem) {
  const existing = next.items.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    next.items = [...next.items, item];
  }
}

function updateQuantity(next: CartState, itemId: number, quantity: number) {
  if (quantity <= 0) {
    next.items = next.items.filter((entry) => entry.id !== itemId);
    return;
  }
  next.items = next.items.map((entry) => (entry.id === itemId ? { ...entry, quantity } : entry));
}

export const cartActions = {
  setKitchen(kitchenId?: number, currency?: string) {
    if (!kitchenId) return;
    const next = { ...state, kitchenId, currency: currency || state.currency };
    setState(next);
  },
  addItem(item: Omit<CartItem, 'quantity'>, quantity = 1) {
    if (!item || !Number.isFinite(item.id)) return;
    const qty = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    const next: CartState = { ...state, items: [...state.items] };
    upsertItem(next, { ...item, quantity: qty });
    setState(next);
  },
  updateQty(itemId: number, quantity: number) {
    const qty = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    const next: CartState = { ...state, items: [...state.items] };
    updateQuantity(next, itemId, qty);
    setState(next);
  },
  removeItem(itemId: number) {
    const next: CartState = { ...state, items: state.items.filter((entry) => entry.id !== itemId) };
    setState(next);
  },
  clear() {
    setState({ ...state, items: [] });
  },
};

export function calculateTotals(cart: CartState) {
  let subtotal = 0;
  let vat = 0;
  for (const item of cart.items) {
    const base = item.price * item.quantity;
    subtotal += base;
    vat += base * (item.vatRate || 0) / 100;
  }
  const total = subtotal + vat;
  return {
    subtotal,
    vat,
    total,
  };
}
