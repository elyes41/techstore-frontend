import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ApiService, CatalogFilters } from '../core/api.service';
import { Facets, PageResult, ProductSummary } from '../core/models';
import { DtPipe } from '../core/pipes';
import { Icon } from '../shared/icon';
import { ProductCard } from '../shared/product-card';
import { Stars } from '../shared/stars';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ProductCard, Icon, DtPipe, Stars],
  template: `
    @let f = filters();
    <div class="container head">
      <nav aria-label="Fil d'Ariane" class="crumbs">
        <a routerLink="/">Accueil</a> <span>/</span>
        @if (currentCategory(); as c) {
          <a routerLink="/catalogue">Catalogue</a> <span>/</span> <span>{{ c.name }}</span>
        } @else {
          <span>Catalogue</span>
        }
      </nav>
      <h1>{{ title() }}</h1>
      @if (result(); as r) { <p class="muted">{{ r.total }} produit{{ r.total > 1 ? 's' : '' }}</p> }
    </div>

    <div class="container layout">
      <button type="button" class="btn btn-outline filters-toggle" (click)="showFilters.set(!showFilters())"
              [attr.aria-expanded]="showFilters()" aria-controls="filters">
        <app-icon name="filter" [size]="18" /> Filtres
      </button>

      <aside id="filters" class="filters card" [class.open]="showFilters()" aria-label="Filtres">
        <fieldset>
          <legend>Catégorie</legend>
          <a class="cat-link" [class.on]="!f.category" routerLink="/catalogue" [queryParams]="keepQuery()">Toutes</a>
          @for (c of categories(); track c.id) {
            <a class="cat-link" [class.on]="f.category === c.slug" [routerLink]="['/catalogue', c.slug]"
               [queryParams]="keepQuery()">{{ c.name }} <span class="muted">({{ c.productCount }})</span></a>
          }
        </fieldset>

        @if (facets().brands.length) {
          <fieldset>
            <legend>Marque</legend>
            @for (b of facets().brands; track b) {
              <label class="check">
                <input type="checkbox" [checked]="f.brand!.includes(b)" (change)="toggleBrand(b)" /> {{ b }}
              </label>
            }
          </fieldset>
        }

        <fieldset>
          <legend>Prix (DT)</legend>
          <form class="price-row" (ngSubmit)="applyPrice()">
            <label class="field">Min
              <input class="input" type="number" min="0" name="min" [(ngModel)]="minPrice"
                     [placeholder]="facets().minPrice ?? 0" />
            </label>
            <label class="field">Max
              <input class="input" type="number" min="0" name="max" [(ngModel)]="maxPrice"
                     [placeholder]="facets().maxPrice ?? ''" />
            </label>
            <button type="submit" class="btn btn-outline btn-sm">OK</button>
          </form>
          @if (facets().minPrice !== null) {
            <span class="muted small">De {{ facets().minPrice | dt }} à {{ facets().maxPrice | dt }}</span>
          }
        </fieldset>

        <fieldset>
          <legend>Avis clients</legend>
          @for (r of [4, 3]; track r) {
            <label class="check">
              <input type="radio" name="minRating" [checked]="f.minRating === r" (change)="setParam('minRating', '' + r)" />
              <app-stars [value]="r" [size]="15" /> et plus
            </label>
          }
          @if (f.minRating) { <button type="button" class="link-btn" (click)="setParam('minRating', null)">Toutes les notes</button> }
        </fieldset>

        <fieldset>
          <legend>Disponibilité</legend>
          <label class="check"><input type="checkbox" [checked]="f.inStock" (change)="setFlag('inStock', !f.inStock)" /> En stock uniquement</label>
          <label class="check"><input type="checkbox" [checked]="f.promo" (change)="setFlag('promo', !f.promo)" /> En promotion</label>
        </fieldset>

        @if (hasFilters()) {
          <button type="button" class="btn btn-outline btn-sm" (click)="reset()">Réinitialiser les filtres</button>
        }
      </aside>

      <section class="results">
        <div class="toolbar">
          <div class="row chips">
            @if (f.q) { <button type="button" class="badge badge-blue chip" (click)="setParam('q', null)">« {{ f.q }} » ✕</button> }
            @for (b of f.brand; track b) { <button type="button" class="badge badge-blue chip" (click)="toggleBrand(b)">{{ b }} ✕</button> }
            @if (f.inStock) { <button type="button" class="badge badge-blue chip" (click)="setFlag('inStock', false)">En stock ✕</button> }
            @if (f.promo) { <button type="button" class="badge badge-blue chip" (click)="setFlag('promo', false)">Promo ✕</button> }
            @if (f.minRating) { <button type="button" class="badge badge-blue chip" (click)="setParam('minRating', null)">{{ f.minRating }} ★ et plus ✕</button> }
          </div>
          <label class="sort">Trier par
            <select class="select" [ngModel]="f.sort || 'popular'" (ngModelChange)="setParam('sort', $event === 'popular' ? null : $event)">
              <option value="popular">Pertinence</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="best_sellers">Meilleures ventes</option>
              <option value="rating">Mieux notés</option>
              <option value="newest">Nouveautés</option>
              <option value="name">Nom (A-Z)</option>
            </select>
          </label>
        </div>

        @if (result(); as r) {
          @if (r.items.length) {
            <div class="product-grid">
              @for (p of r.items; track p.id) { <app-product-card [product]="p" /> }
            </div>
            @if (r.totalPages > 1) {
              <nav class="pagination" aria-label="Pagination">
                <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page === 0" (click)="goPage(r.page - 1)">← Précédent</button>
                <span class="muted">Page {{ r.page + 1 }} / {{ r.totalPages }}</span>
                <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page + 1 >= r.totalPages" (click)="goPage(r.page + 1)">Suivant →</button>
              </nav>
            }
          } @else {
            <div class="empty card">
              <p>Aucun produit ne correspond à ces critères.</p>
              @if (hasFilters()) { <button type="button" class="btn btn-primary" style="margin-top: 16px" (click)="reset()">Effacer les filtres</button> }
            </div>
          }
        } @else if (error()) {
          <div class="alert alert-error">Impossible de charger les produits. Réessayez dans un instant.</div>
        } @else {
          <div class="spinner" role="status" aria-label="Chargement"></div>
        }
      </section>
    </div>
  `,
  styles: `
    .head { padding-top: 24px; padding-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
    .crumbs { font-size: 14px; color: var(--muted); display: flex; gap: 8px; flex-wrap: wrap; }
    .crumbs a { text-decoration: none; }
    .layout { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start; }
    .filters { flex: 1 1 240px; max-width: 100%; display: flex; flex-direction: column; gap: 22px; padding: 20px; }
    fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    legend { font-weight: 600; margin-bottom: 8px; padding: 0; }
    .cat-link { color: var(--ink); text-decoration: none; padding: 6px 0; font-size: 15px; }
    .cat-link.on { color: var(--blue); font-weight: 600; }
    .link-btn { border: 0; background: none; color: var(--blue); cursor: pointer; text-align: left; padding: 4px 0; font: 500 14px var(--font-body); }
    .price-row { display: flex; gap: 8px; align-items: flex-end; }
    .price-row .field { flex: 1; font-size: 13px; color: var(--muted); }
    .results { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
    .toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
    .chip { border: 0; cursor: pointer; padding: 6px 12px; font-size: 13px; }
    .sort { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
    .sort .select { width: auto; }
    .filters-toggle { display: none; }
    @media (max-width: 820px) {
      .filters-toggle { display: inline-flex; }
      .filters { display: none; flex-basis: 100%; }
      .filters.open { display: flex; }
    }
  `,
})
export class CatalogPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected showFilters = signal(false);
  protected minPrice: number | null = null;
  protected maxPrice: number | null = null;

  private filters$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    map(([params, qp]): CatalogFilters => {
      const num = (k: string) => (qp.get(k) !== null && qp.get(k) !== '' ? Number(qp.get(k)) : null);
      return {
        category: params.get('category'),
        q: qp.get('q'),
        brand: qp.getAll('brand'),
        minPrice: num('minPrice'),
        maxPrice: num('maxPrice'),
        inStock: qp.get('inStock') === 'true',
        promo: qp.get('promo') === 'true',
        minRating: num('minRating'),
        sort: qp.get('sort'),
        page: Number(qp.get('page') ?? 0) || 0,
        size: PAGE_SIZE,
      };
    }),
  );

  protected filters = toSignal(this.filters$, { requireSync: true });
  protected categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  protected error = signal(false);

  protected result = toSignal(
    this.filters$.pipe(
      switchMap((f) => {
        this.minPrice = f.minPrice ?? null;
        this.maxPrice = f.maxPrice ?? null;
        this.error.set(false);
        return this.api.products(f).pipe(
          startWith(null),
          catchError(() => {
            this.error.set(true);
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: null as PageResult<ProductSummary> | null },
  );

  protected facets = toSignal(
    this.filters$.pipe(
      map((f) => f.category ?? null),
      distinctUntilChanged(),
      switchMap((cat) => this.api.facets(cat).pipe(catchError(() => of({ brands: [], minPrice: null, maxPrice: null })))),
    ),
    { initialValue: { brands: [], minPrice: null, maxPrice: null } as Facets },
  );

  protected currentCategory = computed(() => this.categories().find((c) => c.slug === this.filters().category) ?? null);
  protected title = computed(() => {
    const f = this.filters();
    if (f.q) return `Résultats pour « ${f.q} »`;
    if (f.promo && !f.category) return 'Promotions';
    if (f.sort === 'best_sellers' && !f.category) return 'Meilleures ventes';
    return this.currentCategory()?.name ?? 'Tous les produits';
  });
  protected hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.q || f.brand?.length || f.minPrice !== null || f.maxPrice !== null || f.inStock || f.promo || f.minRating);
  });

  /** Garde les filtres (hors marque, propres à une catégorie) quand on change de catégorie. */
  protected keepQuery() {
    const qp = { ...this.route.snapshot.queryParams };
    delete qp['brand'];
    delete qp['page'];
    return qp;
  }

  toggleBrand(b: string) {
    const current = this.filters().brand ?? [];
    const next = current.includes(b) ? current.filter((x) => x !== b) : [...current, b];
    this.navigate({ brand: next.length ? next : null });
  }

  setFlag(key: 'inStock' | 'promo', value: boolean) {
    this.navigate({ [key]: value ? 'true' : null });
  }

  setParam(key: string, value: string | null) {
    this.navigate({ [key]: value });
  }

  applyPrice() {
    this.navigate({ minPrice: this.minPrice || null, maxPrice: this.maxPrice || null });
  }

  goPage(page: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: page || null }, queryParamsHandling: 'merge' });
  }

  reset() {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private navigate(changes: Record<string, unknown>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...changes, page: null },
      queryParamsHandling: 'merge',
    });
  }
}
