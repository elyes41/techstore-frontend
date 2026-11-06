import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { OrderStatus, OrderSummary, PAYMENT_LABELS, PageResult, STATUS_LABELS } from '../core/models';
import { DateTnPipe, DtPipe } from '../core/pipes';
import { StatusBadge } from './status-badge';

@Component({
  selector: 'app-orders-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, DtPipe, DateTnPipe, StatusBadge],
  template: `
    <h1 style="margin-bottom: 20px">Commandes</h1>

    <div class="tabs" role="tablist" aria-label="Filtrer par statut">
      @for (t of tabs; track t.value) {
        <button type="button" role="tab" [attr.aria-selected]="(filters().status ?? '') === t.value"
                [class.on]="(filters().status ?? '') === t.value" (click)="apply({ status: t.value || null })">{{ t.label }}</button>
      }
    </div>

    <form class="filters" (ngSubmit)="apply({ q: q || null })">
      <label class="field grow">
        <span class="sr-only">Rechercher</span>
        <input class="input" type="search" name="q" [(ngModel)]="q" placeholder="Référence, nom du client ou téléphone…" />
      </label>
      <button type="submit" class="btn btn-outline">Rechercher</button>
    </form>

    @if (result(); as r) {
      @if (r.items.length) {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Référence</th><th>Client</th><th>Date</th><th>Paiement</th><th>Statut</th><th class="num">Total</th></tr>
            </thead>
            <tbody>
              @for (o of r.items; track o.id) {
                <tr>
                  <td><a [routerLink]="['/admin/commandes', o.id]"><strong>{{ o.reference }}</strong></a><br /><span class="muted small">{{ o.itemCount }} article(s)</span></td>
                  <td>{{ o.customerName }}<br /><span class="muted small">{{ o.phone }} · {{ o.governorate }}</span></td>
                  <td>{{ o.createdAt | dateTn }}</td>
                  <td>{{ paymentLabels[o.paymentMethod] }}<br /><app-status-badge [payment]="o.paymentStatus" /></td>
                  <td><app-status-badge [status]="o.status" /></td>
                  <td class="num"><strong>{{ o.total | dt }}</strong></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nav class="pagination" aria-label="Pagination" style="margin-top: 16px">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page === 0" (click)="apply({ page: r.page - 1 || null }, false)">← Précédent</button>
          <span class="muted small">{{ r.total }} commande(s) · page {{ r.page + 1 }} / {{ r.totalPages || 1 }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page + 1 >= r.totalPages" (click)="apply({ page: r.page + 1 }, false)">Suivant →</button>
        </nav>
      } @else {
        <div class="card empty">Aucune commande dans cette vue.</div>
      }
    } @else {
      <div class="spinner" role="status" aria-label="Chargement"></div>
    }
  `,
  styles: `
    .tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--line-2); margin-bottom: 16px; }
    .tabs button { min-height: 44px; padding: 0 16px; border: 0; background: none; font: 500 15px var(--font-body); color: var(--muted);
      cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px; }
    .tabs button.on { color: var(--ink); font-weight: 600; border-bottom-color: var(--blue); }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .grow { flex: 1 1 260px; }
  `,
})
export class OrdersListPage {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly paymentLabels = PAYMENT_LABELS;
  protected readonly tabs: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'Toutes' },
    ...(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
  ];
  protected q = this.route.snapshot.queryParamMap.get('q') ?? '';

  private filters$ = this.route.queryParamMap.pipe(
    map((qp) => ({
      status: (qp.get('status') as OrderStatus | null) ?? undefined,
      q: qp.get('q') ?? undefined,
      page: Number(qp.get('page') ?? 0) || 0,
      size: 20,
    })),
  );
  protected filters = toSignal(this.filters$, { requireSync: true });
  protected result = toSignal<PageResult<OrderSummary> | null>(
    this.filters$.pipe(
      switchMap((f) => this.api.orders(f).pipe(catchError(() => of({ items: [], page: 0, size: 20, total: 0, totalPages: 0 } as PageResult<OrderSummary>)))),
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
}
