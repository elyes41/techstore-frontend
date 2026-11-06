import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { WishlistService } from '../core/stores';
import { Icon } from '../shared/icon';
import { CompareBar } from './compare-bar';
import { SearchBox } from './search-box';

@Component({
  selector: 'app-shop-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, SearchBox, CompareBar],
  template: `
    <div class="topbar">Livraison partout en Tunisie · Paiement à la livraison disponible</div>
    <header class="header">
      <div class="container header-main">
        <a routerLink="/" class="logo">Tech<span>Store</span></a>
        <app-search-box />
        <nav class="header-actions" aria-label="Favoris et panier">
          <a routerLink="/favoris" class="header-link">
            <app-icon name="heart" />
            <span>Favoris</span>
            @if (wishlist.count() > 0) { <span class="cart-count">{{ wishlist.count() }}</span> }
          </a>
          <a routerLink="/panier" class="header-link">
            <app-icon name="cart" />
            <span>Panier</span>
            @if (cart.count() > 0) { <span class="cart-count">{{ cart.count() }}</span> }
          </a>
        </nav>
      </div>
      <div class="header-nav">
        <nav class="container cats" aria-label="Catégories">
          <a routerLink="/catalogue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Tout</a>
          @for (c of categories(); track c.id) {
            <a [routerLink]="['/catalogue', c.slug]" routerLinkActive="active">{{ c.name }}</a>
          }
          <a routerLink="/catalogue" [queryParams]="{ sort: 'best_sellers' }">Meilleures ventes</a>
          <a routerLink="/catalogue" [queryParams]="{ promo: true }" class="promo-link">Promos</a>
        </nav>
      </div>
    </header>

    <main>
      <router-outlet />
    </main>
    <app-compare-bar />

    <footer class="footer">
      <div class="container footer-grid">
        <div class="stack" style="gap: 8px">
          <span class="logo">Tech<span>Store</span></span>
          <span>[Adresse du showroom], Tunis</span>
          <span>[Téléphone] · [WhatsApp]</span>
        </div>
        <div class="stack" style="gap: 8px">
          <strong>Boutique</strong>
          @for (c of categories(); track c.id) {
            <a [routerLink]="['/catalogue', c.slug]">{{ c.name }}</a>
          }
        </div>
        <div class="stack" style="gap: 8px">
          <strong>Aide</strong>
          <span>Livraison sous [délai] dans les 24 gouvernorats</span>
          <span>Retour sous [délai]</span>
        </div>
        <div class="stack" style="gap: 8px">
          <strong>Paiement</strong>
          <span>À la livraison · Carte bancaire · e-Dinar · Portefeuille mobile</span>
        </div>
      </div>
      <div class="container footer-bottom">© {{ year }} TechStore</div>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; }
    .topbar { background: var(--blue); color: #fff; font-size: 13px; text-align: center; padding: 8px 16px; }
    .header { background: var(--navy); color: #fff; position: sticky; top: 0; z-index: 20; }
    .header-main { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 24px; padding-top: 16px; padding-bottom: 16px; }
    .logo { font-family: var(--font-display); font-weight: 700; font-size: 26px; color: #fff; text-decoration: none; letter-spacing: -.02em; }
    .logo span { color: #60a5fa; }
    .header-actions { display: flex; gap: 8px; }
    .header-link { color: #fff; text-decoration: none; display: flex; align-items: center; gap: 8px; padding: 10px; font-size: 14px; border-radius: 10px; }
    .header-link:hover { color: #fff; background: rgba(255,255,255,.08); }
    .cart-count { background: var(--orange); color: var(--ink); border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: 12px; }
    .header-nav { border-top: 1px solid #1e293b; }
    .cats { display: flex; gap: 4px 24px; overflow-x: auto; font-size: 14px; scrollbar-width: none; }
    .cats a { color: #cbd5e1; text-decoration: none; padding: 12px 0; white-space: nowrap; border-bottom: 2px solid transparent; }
    .cats a:hover, .cats a.active { color: #fff; border-bottom-color: #60a5fa; }
    .cats .promo-link { color: #fdba74; font-weight: 600; }
    .footer { background: var(--navy); color: #cbd5e1; font-size: 14px; margin-top: 64px; }
    .footer strong { color: #fff; }
    .footer a { color: #cbd5e1; text-decoration: none; }
    .footer a:hover { color: #fff; }
    .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; padding-top: 48px; padding-bottom: 32px; }
    .footer-bottom { border-top: 1px solid #1e293b; padding-top: 16px; padding-bottom: 24px; font-size: 13px; }
  `,
})
export class ShopLayout {
  private api = inject(ApiService);
  protected cart = inject(CartService);
  protected wishlist = inject(WishlistService);
  protected categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  protected year = new Date().getFullYear();
}
