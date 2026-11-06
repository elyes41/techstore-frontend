import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { ProductSummary } from '../core/models';
import { DtPipe, discount } from '../core/pipes';
import { CompareService, WishlistService } from '../core/stores';
import { Icon } from './icon';
import { Stars } from './stars';

/** Seuil d'unités vendues pour le badge « Meilleure vente ». */
export const BEST_SELLER_MIN = 10;

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DtPipe, Icon, Stars],
  template: `
    @let p = product();
    <article class="pc">
      <div class="pc-media">
        <a [routerLink]="['/produit', p.slug]" [attr.aria-label]="p.name" class="pc-img">
          @if (p.image) {
            <img [src]="p.image" [alt]="p.name" loading="lazy" />
          } @else {
            <span class="img-placeholder"><app-icon name="image" [size]="36" [stroke]="1.5" /></span>
          }
        </a>
        <div class="pc-flags">
          @if (off(); as o) { <span class="badge badge-promo">-{{ o }} %</span> }
          @if (p.soldCount >= bestSellerMin) { <span class="badge badge-best">Meilleure vente</span> }
        </div>
        <button type="button" class="pc-wish" [class.on]="wished()" (click)="wishlist.toggle(p)"
                [attr.aria-pressed]="wished()" [attr.aria-label]="(wished() ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + p.name">
          <app-icon [name]="wished() ? 'heartFill' : 'heart'" [size]="18" />
        </button>
      </div>
      <div class="pc-body">
        @if (p.brand) { <span class="pc-brand">{{ p.brand }}</span> }
        <a class="pc-name" [routerLink]="['/produit', p.slug]">{{ p.name }}</a>
        @if (p.ratingCount > 0) {
          <app-stars [value]="p.ratingAvg" [count]="p.ratingCount" [size]="14" />
        }
        <div class="pc-price">
          <span class="price">{{ p.price | dt }}</span>
          @if (p.oldPrice && off()) { <span class="old-price">{{ p.oldPrice | dt }}</span> }
        </div>
        @if (p.stock === 0) {
          <span class="out-stock">● Rupture de stock</span>
        } @else if (p.stock <= 5) {
          <span class="low-stock">● Plus que {{ p.stock }} en stock</span>
        } @else {
          <span class="in-stock">● En stock</span>
        }
        <div class="pc-actions">
          <button type="button" class="btn btn-dark btn-sm grow" [disabled]="p.stock === 0" (click)="add()">
            {{ added() ? 'Ajouté ✓' : 'Ajouter au panier' }}
          </button>
          <button type="button" class="btn btn-outline btn-sm cmp" [class.on]="compared()" (click)="toggleCompare()"
                  [attr.aria-pressed]="compared()" [attr.aria-label]="'Comparer ' + p.name" [title]="compareHint()">
            <app-icon name="compare" [size]="16" />
          </button>
        </div>
      </div>
    </article>
  `,
  styles: `
    .pc { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden;
      display: flex; flex-direction: column; height: 100%; transition: box-shadow .15s; }
    .pc:hover { box-shadow: 0 8px 24px rgba(15,23,42,.08); }
    .pc-media { position: relative; aspect-ratio: 4 / 3; background: #f1f5f9; }
    .pc-img { display: block; width: 100%; height: 100%; }
    .pc-img img { width: 100%; height: 100%; object-fit: contain; padding: 12px; }
    .pc-flags { position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .badge-best { background: #f59e0b; color: #1c1917; border-radius: 6px; }
    .pc-wish { position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; border-radius: 50%; border: 0;
      background: rgba(255,255,255,.92); color: var(--ink-2); display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 1px 4px rgba(15,23,42,.12); }
    .pc-wish.on { color: #e11d48; }
    .pc-body { padding: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .pc-brand { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
    .pc-name { font-weight: 600; color: var(--ink); text-decoration: none; line-height: 1.35; }
    .pc-name:hover { color: var(--blue); }
    .pc-price { display: flex; gap: 8px; align-items: baseline; margin-top: auto; flex-wrap: wrap; }
    .low-stock { color: var(--promo); font-size: 13px; font-weight: 600; }
    .pc-actions { display: flex; gap: 8px; margin-top: 8px; }
    .grow { flex: 1; white-space: nowrap; padding: 0 10px; }
    .cmp { padding: 0 10px; }
    .cmp.on { border-color: var(--blue); background: var(--blue-soft); color: var(--blue); }
  `,
})
export class ProductCard {
  private cart = inject(CartService);
  protected wishlist = inject(WishlistService);
  private compare = inject(CompareService);
  product = input.required<ProductSummary>();

  protected readonly bestSellerMin = BEST_SELLER_MIN;
  protected added = signal(false);
  protected off = computed(() => discount(this.product().price, this.product().oldPrice));
  protected wished = computed(() => this.wishlist.ids().includes(this.product().id));
  protected compared = computed(() => this.compare.ids().includes(this.product().id));
  protected compareHint = computed(() =>
    this.compared() ? 'Retirer du comparateur' : this.compare.full() ? 'Comparateur plein (4 produits)' : 'Ajouter au comparateur',
  );

  add() {
    this.cart.add(this.product());
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1500);
  }

  toggleCompare() {
    if (!this.compare.toggle(this.product())) {
      alert('Le comparateur contient déjà 4 produits. Retirez-en un pour en ajouter un autre.');
    }
  }
}
