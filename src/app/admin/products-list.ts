import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { PageResult, ProductSummary } from '../core/models';
import { DtPipe } from '../core/pipes';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-products-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, DtPipe, Icon],
  template: `
    <div class="page-head">
      <h1>Produits</h1>
      <a routerLink="/admin/produits/nouveau" class="btn btn-primary">+ Nouveau produit</a>
    </div>

    <form class="filters" (ngSubmit)="apply({ q: q || null })">
      <label class="field grow">
        <span class="sr-only">Rechercher</span>
        <input class="input" type="search" name="q" [(ngModel)]="q" placeholder="Nom, marque ou référence…" />
      </label>
      <label class="field">
        <span class="sr-only">Catégorie</span>
        <select class="select" name="cat" [ngModel]="filters().categoryId ?? ''" (ngModelChange)="apply({ categoryId: $event || null })">
          <option value="">Toutes les catégories</option>
          @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
      </label>
      <label class="field">
        <span class="sr-only">Filtre</span>
        <select class="select" name="status" [ngModel]="filters().status ?? ''" (ngModelChange)="apply({ status: $event || null })">
          <option value="">Tous les produits</option>
          <option value="low_stock">Stock faible</option>
          <option value="promo">En promotion</option>
        </select>
      </label>
      <button type="submit" class="btn btn-outline">Rechercher</button>
    </form>

    @if (message()) { <p class="alert" [class.alert-error]="message()!.error" [class.alert-success]="!message()!.error" role="status">{{ message()!.text }}</p> }

    @if (result(); as r) {
      @if (r.items.length) {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Produit</th><th>Catégorie</th><th class="num">Prix</th><th>Stock</th><th>Statut</th><th><span class="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              @for (p of r.items; track p.id) {
                <tr>
                  <td>
                    <div class="prod">
                      <span class="thumb">
                        @if (p.image) { <img [src]="p.image" alt="" /> } @else { <span class="img-placeholder"><app-icon name="image" [size]="18" /></span> }
                      </span>
                      <span class="stack" style="gap: 2px">
                        <a [routerLink]="['/admin/produits', p.id]" class="name">{{ p.name }}</a>
                        <span class="muted small">{{ p.brand || '—' }}@if (p.sku) { · {{ p.sku }} }</span>
                      </span>
                    </div>
                  </td>
                  <td>{{ p.categoryName || '—' }}</td>
                  <td class="num">
                    {{ p.price | dt }}
                    @if (p.oldPrice) { <br /><span class="old-price">{{ p.oldPrice | dt }}</span> }
                  </td>
                  <td>
                    <label class="sr-only" [for]="'stock-' + p.id">Stock de {{ p.name }}</label>
                    <input class="input stock" type="number" min="0" [id]="'stock-' + p.id" [value]="p.stock"
                           [class.zero]="p.stock === 0" (change)="saveStock(p, $any($event.target).value)" />
                  </td>
                  <td>
                    @if (p.active) { <span class="badge badge-green">En ligne</span> } @else { <span class="badge badge-gray">Masqué</span> }
                    @if (p.featured) { <span class="badge badge-blue" style="margin-left: 4px">Phare</span> }
                  </td>
                  <td class="num">
                    <a class="icon-btn" [routerLink]="['/admin/produits', p.id]" [attr.aria-label]="'Modifier ' + p.name"><app-icon name="edit" [size]="18" /></a>
                    <button type="button" class="icon-btn danger" [attr.aria-label]="'Supprimer ' + p.name" (click)="remove(p)"><app-icon name="trash" [size]="18" /></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nav class="pagination" aria-label="Pagination" style="margin-top: 16px">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page === 0" (click)="apply({ page: r.page - 1 || null }, false)">← Précédent</button>
          <span class="muted small">{{ r.total }} produit(s) · page {{ r.page + 1 }} / {{ r.totalPages || 1 }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page + 1 >= r.totalPages" (click)="apply({ page: r.page + 1 }, false)">Suivant →</button>
        </nav>
      } @else {
        <div class="card empty">
          <p>Aucun produit trouvé.</p>
          <a routerLink="/admin/produits/nouveau" class="btn btn-primary" style="margin-top: 16px">Ajouter un produit</a>
        </div>
      }
    } @else {
      <div class="spinner" role="status" aria-label="Chargement"></div>
    }
  `,
  styles: `
    .page-head { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .filters .grow { flex: 1 1 260px; }
    .filters .select { width: auto; }
    .prod { display: flex; gap: 12px; align-items: center; }
    .name { color: var(--ink); font-weight: 600; text-decoration: none; }
    .name:hover { color: var(--blue); }
    .stock { width: 84px; min-height: 38px; padding: 6px 8px; }
    .stock.zero { border-color: #fca5a5; background: var(--red-soft); }
    .danger { color: var(--red); }
    .alert { margin-bottom: 16px; }
  `,
})
export class ProductsListPage {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reload$ = new Subject<void>();

  protected q = this.route.snapshot.queryParamMap.get('q') ?? '';
  protected message = signal<{ text: string; error: boolean } | null>(null);
  protected categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });

  private filters$ = this.route.queryParamMap.pipe(
    map((qp) => ({
      q: qp.get('q') ?? undefined,
      categoryId: qp.get('categoryId') || null,
      status: qp.get('status') ?? undefined,
      page: Number(qp.get('page') ?? 0) || 0,
      size: 20,
    })),
  );
  protected filters = toSignal(this.filters$, { requireSync: true });

  protected result = toSignal<PageResult<ProductSummary> | null>(
    combineLatest([this.filters$, this.reload$.pipe(startWith(undefined))]).pipe(
      switchMap(([f]) => this.api.products(f).pipe(catchError(() => of({ items: [], page: 0, size: 20, total: 0, totalPages: 0 } as PageResult<ProductSummary>)))),
    ),
    { initialValue: null },
  );

  apply(changes: Record<string, unknown>, resetPage = true) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: resetPage ? { ...changes, page: null } : changes,
      queryParamsHandling: 'merge',
    });
  }

  saveStock(p: ProductSummary, raw: string) {
    const stock = Math.max(0, Math.floor(Number(raw)));
    if (!Number.isFinite(stock) || stock === p.stock) return;
    this.api.updateStock(p.id, stock).subscribe({
      next: () => {
        this.message.set({ text: `Stock de « ${p.name} » mis à jour : ${stock}`, error: false });
        this.reload$.next();
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }

  remove(p: ProductSummary) {
    if (!confirm(`Supprimer définitivement « ${p.name} » ?\nLes commandes passées conservent le nom et le prix.`)) return;
    this.api.deleteProduct(p.id).subscribe({
      next: () => {
        this.message.set({ text: `« ${p.name} » a été supprimé.`, error: false });
        this.reload$.next();
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }
}
