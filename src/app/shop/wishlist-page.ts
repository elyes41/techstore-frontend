import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { WishlistService } from '../core/stores';
import { ProductCard } from '../shared/product-card';

@Component({
  selector: 'app-wishlist-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProductCard],
  template: `
    <div class="container page">
      <div class="head">
        <div class="stack" style="gap: 4px">
          <h1>Mes favoris</h1>
          <p class="muted">{{ wishlist.count() }} produit{{ wishlist.count() > 1 ? 's' : '' }} · enregistrés sur cet appareil</p>
        </div>
        @if (wishlist.count()) {
          <div class="row">
            <button type="button" class="btn btn-primary" (click)="addAll()">Tout ajouter au panier</button>
            <button type="button" class="btn btn-outline" (click)="wishlist.clear()">Vider la liste</button>
          </div>
        }
      </div>
      @if (wishlist.count()) {
        <div class="product-grid">
          @for (p of wishlist.items(); track p.id) { <app-product-card [product]="p" /> }
        </div>
      } @else {
        <div class="card empty">
          <p>Votre liste est vide. Touchez le cœur d'un produit pour l'y ajouter.</p>
          <a routerLink="/catalogue" class="btn btn-primary" style="margin-top: 16px">Parcourir le catalogue</a>
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding-top: 28px; display: flex; flex-direction: column; gap: 24px; }
    .head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end; }
  `,
})
export class WishlistPage {
  protected wishlist = inject(WishlistService);
  private cart = inject(CartService);

  addAll() {
    this.wishlist.items().filter((p) => p.stock > 0).forEach((p) => this.cart.add(p));
  }
}
