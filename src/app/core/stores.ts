import { Injectable, computed, effect, signal } from '@angular/core';
import { Id, ProductDetail, ProductSummary } from './models';

/** Liste de produits conservée dans le navigateur (localStorage), réactive via les signals. */
abstract class ProductListStore {
  protected abstract readonly key: string;
  protected abstract readonly max: number;
  readonly items = signal<ProductSummary[]>([]);
  readonly count = computed(() => this.items().length);
  readonly ids = computed(() => this.items().map((p) => p.id));

  protected init() {
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : [];
      // Les listes enregistrées avant MongoDB (identifiants numériques) sont ignorées
      if (Array.isArray(parsed)) this.items.set(parsed.filter((p) => typeof p?.id === 'string'));
    } catch {
      /* stockage indisponible */
    }
    effect(() => {
      const items = this.items();
      try {
        localStorage.setItem(this.key, JSON.stringify(items));
      } catch {
        /* ignore */
      }
    });
  }

  has(id: Id) {
    return this.ids().includes(id);
  }

  remove(id: Id) {
    this.items.update((list) => list.filter((p) => p.id !== id));
  }

  clear() {
    this.items.set([]);
  }
}

/** Convertit une fiche complète en résumé pour le stockage local. */
export function toSummary(p: ProductSummary | ProductDetail): ProductSummary {
  if ('image' in p) return p;
  const { images, specs, description, createdAt, updatedAt, ...rest } = p;
  void specs; void description; void createdAt; void updatedAt;
  return { ...rest, image: images[0] ?? null };
}

@Injectable({ providedIn: 'root' })
export class RecentlyViewedService extends ProductListStore {
  protected readonly key = 'techstore.recent';
  protected readonly max = 12;

  constructor() {
    super();
    this.init();
  }

  push(p: ProductSummary | ProductDetail) {
    const s = toSummary(p);
    this.items.update((list) => [s, ...list.filter((x) => x.id !== s.id)].slice(0, this.max));
  }
}

@Injectable({ providedIn: 'root' })
export class WishlistService extends ProductListStore {
  protected readonly key = 'techstore.wishlist';
  protected readonly max = 100;

  constructor() {
    super();
    this.init();
  }

  toggle(p: ProductSummary | ProductDetail) {
    if (this.has(p.id)) this.remove(p.id);
    else this.items.update((list) => [toSummary(p), ...list].slice(0, this.max));
  }
}

@Injectable({ providedIn: 'root' })
export class CompareService extends ProductListStore {
  protected readonly key = 'techstore.compare';
  protected readonly max = 4;
  readonly full = computed(() => this.count() >= this.max);

  constructor() {
    super();
    this.init();
  }

  /** Renvoie false si le comparateur est plein. */
  toggle(p: ProductSummary | ProductDetail): boolean {
    if (this.has(p.id)) {
      this.remove(p.id);
      return true;
    }
    if (this.full()) return false;
    this.items.update((list) => [...list, toSummary(p)]);
    return true;
  }
}

/** Identifiant anonyme du visiteur, utilisé seulement pour les recommandations « aussi consultés ». */
@Injectable({ providedIn: 'root' })
export class VisitorService {
  readonly id: string = this.load();

  private load(): string {
    const key = 'techstore.visitor';
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id = crypto.randomUUID();
      localStorage.setItem(key, id);
      return id;
    } catch {
      return crypto.randomUUID();
    }
  }
}
