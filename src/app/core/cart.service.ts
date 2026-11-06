import { Injectable, computed, effect, signal } from '@angular/core';
import { Id, ProductDetail, ProductSummary } from './models';

export interface CartLine {
  productId: Id;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  stock: number;
  quantity: number;
}

const STORAGE_KEY = 'techstore.cart';
export const MAX_QTY = 20;

/** Panier conservé dans le navigateur ; les prix sont recalculés par le serveur à la commande. */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly lines = signal<CartLine[]>(load());
  readonly count = computed(() => this.lines().reduce((n, l) => n + l.quantity, 0));
  readonly subtotal = computed(() => this.lines().reduce((s, l) => s + l.price * l.quantity, 0));

  constructor() {
    effect(() => {
      const lines = this.lines();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch {
        /* ignore */
      }
    });
  }

  add(p: ProductSummary | ProductDetail, quantity = 1) {
    const image = 'image' in p ? p.image : (p.images[0] ?? null);
    this.lines.update((lines) => {
      const existing = lines.find((l) => l.productId === p.id);
      const limit = Math.min(MAX_QTY, p.stock);
      if (existing) {
        return lines.map((l) =>
          l.productId === p.id ? { ...l, stock: p.stock, quantity: Math.min(limit, l.quantity + quantity) } : l,
        );
      }
      return [
        ...lines,
        { productId: p.id, slug: p.slug, name: p.name, image, price: p.price, stock: p.stock, quantity: Math.min(limit, quantity) },
      ];
    });
  }

  setQuantity(productId: Id, quantity: number) {
    if (quantity <= 0) return this.remove(productId);
    this.lines.update((lines) =>
      lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, MAX_QTY, l.stock) } : l)),
    );
  }

  remove(productId: Id) {
    this.lines.update((lines) => lines.filter((l) => l.productId !== productId));
  }

  clear() {
    this.lines.set([]);
  }
}

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Les paniers enregistrés avant MongoDB (identifiants numériques) sont ignorés
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l?.productId === 'string') : [];
  } catch {
    return [];
  }
}
