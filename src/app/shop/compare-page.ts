import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { ProductDetail } from '../core/models';
import { DtPipe } from '../core/pipes';
import { CompareService } from '../core/stores';
import { Icon } from '../shared/icon';
import { Stars } from '../shared/stars';

/** Comparateur côte à côte : prix, note, stock et toutes les caractéristiques. */
@Component({
  selector: 'app-compare-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DtPipe, Icon, Stars],
  template: `
    <div class="container page">
      <div class="head">
        <h1>Comparer les produits</h1>
        @if (compare.count()) { <button type="button" class="btn btn-outline" (click)="compare.clear()">Tout retirer</button> }
      </div>

      @if (compare.count() < 2) {
        <div class="card empty">
          <p>Ajoutez au moins 2 produits avec le bouton <app-icon name="compare" [size]="16" /> pour les comparer (4 maximum).</p>
          <a routerLink="/catalogue" class="btn btn-primary" style="margin-top: 16px">Parcourir le catalogue</a>
        </div>
      } @else if (products(); as list) {
        <div class="table-wrap">
          <table class="table cmp">
            <thead>
              <tr>
                <th scope="col"><span class="sr-only">Caractéristique</span></th>
                @for (p of list; track p.id) {
                  <th scope="col">
                    <div class="prod">
                      <button type="button" class="icon-btn rm" [attr.aria-label]="'Retirer ' + p.name" (click)="compare.remove(p.id)"><app-icon name="close" [size]="16" /></button>
                      <a [routerLink]="['/produit', p.slug]" class="thumb big">
                        @if (p.images[0]) { <img [src]="p.images[0]" alt="" /> } @else { <span class="img-placeholder"><app-icon name="image" [size]="28" /></span> }
                      </a>
                      <a [routerLink]="['/produit', p.slug]" class="name">{{ p.name }}</a>
                    </div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Prix</th>
                @for (p of list; track p.id) {
                  <td [class.best]="p.price === minPrice()"><span class="price">{{ p.price | dt }}</span>
                    @if (p.price === minPrice()) { <br /><span class="badge badge-green">Le moins cher</span> }</td>
                }
              </tr>
              <tr>
                <th scope="row">Note</th>
                @for (p of list; track p.id) {
                  <td>@if (p.ratingCount) { <app-stars [value]="p.ratingAvg" [count]="p.ratingCount" [size]="14" /> } @else { <span class="muted">—</span> }</td>
                }
              </tr>
              <tr>
                <th scope="row">Marque</th>
                @for (p of list; track p.id) { <td>{{ p.brand || '—' }}</td> }
              </tr>
              <tr>
                <th scope="row">Disponibilité</th>
                @for (p of list; track p.id) {
                  <td>@if (p.stock > 0) { <span class="in-stock">En stock</span> } @else { <span class="out-stock">Rupture</span> }</td>
                }
              </tr>
              @for (key of specKeys(); track key) {
                <tr [class.diff]="differs(key)">
                  <th scope="row">{{ key }}</th>
                  @for (p of list; track p.id) { <td>{{ p.specs[key] || '—' }}</td> }
                </tr>
              }
              <tr>
                <th scope="row"><span class="sr-only">Action</span></th>
                @for (p of list; track p.id) {
                  <td><button type="button" class="btn btn-dark btn-sm" [disabled]="p.stock === 0" (click)="cart.add(p)">Ajouter au panier</button></td>
                }
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted small">Les lignes surlignées indiquent les caractéristiques qui diffèrent.</p>
      } @else {
        <div class="spinner" role="status" aria-label="Chargement"></div>
      }
    </div>
  `,
  styles: `
    .page { padding-top: 28px; display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; }
    .cmp th[scope='row'] { width: 160px; background: #f8fafc; }
    .cmp thead th { vertical-align: top; background: var(--surface); }
    .prod { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 180px; }
    .rm { position: absolute; top: -6px; right: -6px; }
    .big { width: 100%; height: 140px; border-radius: 12px; }
    .big img { object-fit: contain; }
    .name { color: var(--ink); font-weight: 600; text-decoration: none; white-space: normal; }
    .diff td, .diff th { background: #fffbeb !important; }
    .best .price { color: var(--green); }
  `,
})
export class ComparePage {
  private api = inject(ApiService);
  protected compare = inject(CompareService);
  protected cart = inject(CartService);

  protected products = toSignal<ProductDetail[] | null>(
    toObservable(this.compare.ids).pipe(
      map((ids) => ids.join(',')),
      distinctUntilChanged(),
      switchMap((key) =>
        key.split(',').length < 2 ? of([] as ProductDetail[]) : this.api.compare(key.split(',')).pipe(catchError(() => of([] as ProductDetail[]))),
      ),
    ),
    { initialValue: null },
  );

  protected specKeys = computed(() => {
    const keys = new Set<string>();
    (this.products() ?? []).forEach((p) => Object.keys(p.specs).forEach((k) => keys.add(k)));
    return [...keys].sort((a, b) => a.localeCompare(b, 'fr'));
  });
  protected minPrice = computed(() => Math.min(...(this.products() ?? []).map((p) => p.price)));

  protected differs(key: string) {
    const values = new Set((this.products() ?? []).map((p) => p.specs[key] ?? ''));
    return values.size > 1;
  }
}
