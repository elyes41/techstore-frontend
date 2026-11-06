import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { DashboardStats } from '../core/models';
import { DateTnPipe, DtPipe } from '../core/pipes';
import { StatusBadge } from './status-badge';

type State = { stats: DashboardStats | null; error: boolean };

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DtPipe, DateTnPipe, StatusBadge],
  template: `
    <div class="page-head">
      <h1>Tableau de bord</h1>
      <a routerLink="/admin/produits/nouveau" class="btn btn-primary">+ Ajouter un produit</a>
    </div>

    @if (state().error) {
      <p class="alert alert-error">Impossible de charger les statistiques.</p>
    } @else if (state().stats; as s) {
      <section class="kpis" aria-label="Indicateurs">
        <div class="card kpi">
          <span class="muted small">Chiffre d'affaires (30 j)</span>
          <strong>{{ s.revenueLast30Days | dt }}</strong>
          <span class="muted small">Total : {{ s.revenue | dt }}</span>
        </div>
        <a class="card kpi link" routerLink="/admin/commandes" [queryParams]="{ status: 'PENDING' }">
          <span class="muted small">Commandes à traiter</span>
          <strong>{{ s.pendingOrderCount }}</strong>
          <span class="muted small">{{ s.orderCount }} commandes au total</span>
        </a>
        <a class="card kpi link" routerLink="/admin/produits">
          <span class="muted small">Produits en ligne</span>
          <strong>{{ s.activeProductCount }}</strong>
          <span class="muted small">{{ s.productCount }} au catalogue</span>
        </a>
        <a class="card kpi link" routerLink="/admin/avis">
          <span class="muted small">Avis à modérer</span>
          <strong [class.warn]="s.pendingReviewCount > 0">{{ s.pendingReviewCount }}</strong>
          <span class="muted small">en attente de publication</span>
        </a>
        <a class="card kpi link" routerLink="/admin/produits" [queryParams]="{ status: 'low_stock' }">
          <span class="muted small">Stock faible / rupture</span>
          <strong [class.warn]="s.lowStockCount + s.outOfStockCount > 0">{{ s.lowStockCount }} / {{ s.outOfStockCount }}</strong>
          <span class="muted small">à réapprovisionner</span>
        </a>
      </section>

      <div class="grid2">
        <section class="card">
          <h2 class="sec">Ventes des 7 derniers jours</h2>
          <div class="bars" role="img" [attr.aria-label]="chartLabel()">
            @for (d of bars(); track d.day) {
              <div class="bar-col">
                <span class="bar-val">{{ d.revenue > 0 ? (d.revenue | dt) : '' }}</span>
                <div class="bar-track"><div class="bar" [style.height.%]="d.pct"></div></div>
                <span class="bar-day">{{ d.label }}</span>
                <span class="muted small">{{ d.orders }} cmd</span>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <h2 class="sec">Meilleures ventes</h2>
          @if (s.bestSellers.length) {
            <ol class="low best">
              @for (p of s.bestSellers; track p.id) {
                <li>
                  <a [routerLink]="['/admin/produits', p.id]">{{ p.name }}</a>
                  <span class="badge badge-blue">{{ p.soldCount }} vendus</span>
                </li>
              }
            </ol>
          } @else {
            <p class="muted">Pas encore de ventes.</p>
          }
        </section>

        <section class="card">
          <h2 class="sec">Stock à surveiller</h2>
          @if (s.lowStock.length) {
            <ul class="low">
              @for (p of s.lowStock; track p.id) {
                <li>
                  <a [routerLink]="['/admin/produits', p.id]">{{ p.name }}</a>
                  <span class="badge" [class.badge-red]="p.stock === 0" [class.badge-amber]="p.stock > 0">{{ p.stock }} en stock</span>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">Tous les stocks sont au-dessus du seuil.</p>
          }
        </section>
      </div>

      <section class="stack" style="margin-top: 24px">
        <div class="page-head" style="margin: 0">
          <h2 class="sec" style="margin: 0">Dernières commandes</h2>
          <a routerLink="/admin/commandes">Toutes les commandes →</a>
        </div>
        @if (s.recentOrders.length) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Référence</th><th>Client</th><th>Date</th><th>Statut</th><th class="num">Total</th></tr></thead>
              <tbody>
                @for (o of s.recentOrders; track o.id) {
                  <tr>
                    <td><a [routerLink]="['/admin/commandes', o.id]">{{ o.reference }}</a></td>
                    <td>{{ o.customerName }}<br /><span class="muted small">{{ o.governorate }}</span></td>
                    <td>{{ o.createdAt | dateTn }}</td>
                    <td><app-status-badge [status]="o.status" /></td>
                    <td class="num">{{ o.total | dt }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="card muted">Aucune commande pour l'instant.</p>
        }
      </section>
    } @else {
      <div class="spinner" role="status" aria-label="Chargement"></div>
    }
  `,
  styles: `
    :host { display: block; }
    .page-head { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-head a:not(.btn) { font-weight: 600; text-decoration: none; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi { display: flex; flex-direction: column; gap: 6px; padding: 20px; text-decoration: none; color: var(--ink); }
    .kpi strong { font-family: var(--font-display); font-size: 28px; }
    .kpi strong.warn { color: var(--promo); }
    .kpi.link:hover { border-color: var(--blue); color: var(--ink); }
    .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .best { counter-reset: n; }
    .best li a::before { counter-increment: n; content: counter(n) '. '; color: var(--muted); }
    .sec { font-size: 18px; margin-bottom: 16px; }
    .bars { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; align-items: end; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; text-align: center; }
    .bar-val { font-size: 11px; color: var(--muted); min-height: 16px; white-space: nowrap; }
    .bar-track { width: 100%; max-width: 40px; height: 140px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden; }
    .bar { width: 100%; background: var(--blue); border-radius: 6px 6px 0 0; min-height: 2px; }
    .bar-day { font-weight: 600; text-transform: capitalize; }
    .low { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .low li { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); }
    .low li:first-child { border-top: 0; }
    .low a { color: var(--ink); text-decoration: none; font-weight: 500; }
  `,
})
export class DashboardPage {
  private api = inject(AdminApiService);

  protected state = toSignal(
    this.api.stats().pipe(
      map((stats): State => ({ stats, error: false })),
      catchError(() => of({ stats: null, error: true } as State)),
    ),
    { initialValue: { stats: null, error: false } as State },
  );

  protected bars = computed(() => {
    const days = this.state().stats?.last7Days ?? [];
    const max = Math.max(1, ...days.map((d) => d.revenue));
    return days.map((d) => ({
      ...d,
      label: DAY.format(new Date(d.day + 'T12:00:00')),
      pct: Math.round((d.revenue / max) * 100),
    }));
  });

  protected chartLabel = computed(
    () => 'Ventes par jour : ' + this.bars().map((b) => `${b.label} ${b.revenue} DT (${b.orders} commandes)`).join(', '),
  );
}
