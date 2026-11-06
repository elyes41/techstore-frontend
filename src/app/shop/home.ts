import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { ProductSummary } from '../core/models';
import { Icon } from '../shared/icon';
import { ProductCard } from '../shared/product-card';
import { ProductCarousel } from '../shared/carousel';
import { RecentlyViewedService } from '../core/stores';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProductCard, Icon, ProductCarousel],
  template: `
    <section class="container hero">
      <div class="hero-text">
        <span class="badge badge-blue">Nouveautés de la saison</span>
        <h1>La tech qu'il vous faut, livrée chez vous.</h1>
        <p class="muted lead">Smartphones, PC, composants et accessoires, avec garantie et livraison dans les 24 gouvernorats.</p>
        <div class="row">
          <a routerLink="/catalogue" class="btn btn-primary">Voir le catalogue</a>
          <a routerLink="/catalogue" [queryParams]="{ promo: true }" class="btn btn-outline">Offres du moment</a>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <app-icon name="image" [size]="64" [stroke]="1.2" />
        <span>[Visuel produit phare]</span>
      </div>
    </section>

    <section class="container perks" aria-label="Nos engagements">
      <div class="perk"><app-icon name="truck" [size]="26" /><div><strong>Livraison rapide</strong><span class="muted small">Grand Tunis et régions</span></div></div>
      <div class="perk"><app-icon name="card" [size]="26" /><div><strong>Paiement à la livraison</strong><span class="muted small">Ou carte, e-Dinar, mobile</span></div></div>
      <div class="perk"><app-icon name="shield" [size]="26" /><div><strong>Garantie officielle</strong><span class="muted small">[Durée] sur tous les produits</span></div></div>
      <div class="perk"><app-icon name="refresh" [size]="26" /><div><strong>Retour facile</strong><span class="muted small">[Délai] après réception</span></div></div>
    </section>

    @if (forYou().length) {
      <div class="container block">
        <app-product-carousel title="Recommandé pour vous" subtitle="D'après les produits que vous avez consultés" [products]="forYou()" />
      </div>
    }

    @if (categories().length) {
      <section class="container block">
        <h2>Acheter par catégorie</h2>
        <div class="cat-grid">
          @for (c of categories(); track c.id) {
            <a class="cat" [routerLink]="['/catalogue', c.slug]">
              <strong>{{ c.name }}</strong>
              <span class="muted small">{{ c.productCount }} produit{{ c.productCount > 1 ? 's' : '' }}</span>
            </a>
          }
        </div>
      </section>
    }

    @if (trending().length) {
      <div class="container block">
        <app-product-carousel title="Tendances de la semaine" subtitle="Les plus vus et les plus achetés ces 7 derniers jours" [products]="trending()" />
      </div>
    }

    <section class="container block">
      <div class="block-head">
        <h2>Produits phares</h2>
        <a routerLink="/catalogue">Tout voir →</a>
      </div>
      @if (featured() === null) {
        <div class="spinner" role="status" aria-label="Chargement"></div>
      } @else if (featured()!.length) {
        <div class="product-grid">
          @for (p of featured(); track p.id) { <app-product-card [product]="p" /> }
        </div>
      } @else {
        <p class="empty">Aucun produit pour le moment. Ajoutez-en depuis le dashboard.</p>
      }
    </section>

    @if (promos()?.length) {
      <section class="container block">
        <div class="promo-banner">
          <div class="stack" style="gap: 8px">
            <span class="promo-kicker">Offres limitées</span>
            <h2>Les promos du moment</h2>
            <p>Profitez des remises tant qu'il reste du stock.</p>
          </div>
          <a routerLink="/catalogue" [queryParams]="{ promo: true }" class="btn btn-accent">Voir toutes les promos</a>
        </div>
        <div class="product-grid">
          @for (p of promos(); track p.id) { <app-product-card [product]="p" /> }
        </div>
      </section>
    }

    @if (recent.items().length) {
      <div class="container block">
        <app-product-carousel title="Récemment consultés" [products]="recent.items()" />
      </div>
    }
  `,
  styles: `
    .hero { display: flex; flex-wrap: wrap; gap: 40px; align-items: center; padding-top: 48px; padding-bottom: 32px; }
    .hero-text { flex: 1 1 420px; display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }
    .hero h1 { font-size: clamp(34px, 5vw, 52px); }
    .lead { font-size: 18px; max-width: 520px; }
    .hero-visual { flex: 1 1 380px; min-height: 340px; background: var(--navy); border-radius: 20px; color: #94a3b8;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; font-size: 14px; }
    .perks { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; padding-bottom: 24px; }
    .perk { background: var(--surface); border-radius: var(--radius); padding: 20px; display: flex; gap: 14px; align-items: center; color: var(--blue); }
    .perk div { display: flex; flex-direction: column; color: var(--ink); }
    .block { padding-top: 32px; padding-bottom: 16px; display: flex; flex-direction: column; gap: 20px; }
    .block-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
    .block-head a { font-weight: 600; text-decoration: none; }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .cat { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 22px 18px; text-decoration: none;
      color: var(--ink); display: flex; flex-direction: column; gap: 4px; transition: border-color .15s; }
    .cat:hover { border-color: var(--blue); color: var(--ink); }
    .promo-banner { background: var(--navy); color: #fff; border-radius: 20px; padding: 32px; display: flex; flex-wrap: wrap;
      gap: 20px; align-items: center; justify-content: space-between; }
    .promo-banner p { color: #cbd5e1; }
    .promo-kicker { color: #fdba74; font-weight: 600; font-size: 14px; }
  `,
})
export class HomePage {
  private api = inject(ApiService);
  protected recent = inject(RecentlyViewedService);

  protected trending = toSignal(this.api.trending(10).pipe(catchError(() => of([]))), { initialValue: [] });
  // « Pour vous » seulement si le visiteur a déjà consulté des produits
  protected forYou = toSignal(
    this.recent.ids().length
      ? this.api.forYou(this.recent.ids().slice(0, 8), 10).pipe(catchError(() => of([])))
      : of([] as ProductSummary[]),
    { initialValue: [] },
  );

  protected categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  protected featured = toSignal<ProductSummary[] | null>(
    this.api.products({ featured: true, size: 8 }).pipe(map((r) => r.items), catchError(() => of([]))),
    { initialValue: null },
  );
  protected promos = toSignal<ProductSummary[] | null>(
    this.api.products({ promo: true, size: 4 }).pipe(map((r) => r.items), catchError(() => of([]))),
    { initialValue: null },
  );
}
