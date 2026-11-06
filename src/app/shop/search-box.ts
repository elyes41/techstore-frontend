import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { SearchSuggestions } from '../core/models';
import { DtPipe } from '../core/pipes';
import { Icon } from '../shared/icon';

const EMPTY: SearchSuggestions = { products: [], categories: [], brands: [] };

/** Recherche instantanée : suggestions de produits, catégories et marques pendant la frappe. */
@Component({
  selector: 'app-search-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, DtPipe, Icon],
  template: `
    <form class="search" role="search" (ngSubmit)="submit()">
      <label for="site-search" class="sr-only">Rechercher un produit</label>
      <input id="site-search" type="search" name="q" autocomplete="off" [(ngModel)]="query"
             (ngModelChange)="typed$.next($event)" (focus)="open.set(true)" (keydown.escape)="open.set(false)"
             placeholder="Rechercher un smartphone, un PC, un accessoire…"
             role="combobox" aria-controls="search-panel" [attr.aria-expanded]="showPanel()" />
      <button type="submit" aria-label="Rechercher"><app-icon name="search" /></button>
    </form>

    @if (showPanel()) {
      @let s = suggestions();
      <div id="search-panel" class="panel" role="listbox">
        @if (s.products.length) {
          <p class="group">Produits</p>
          @for (p of s.products; track p.id) {
            <a class="item" role="option" [routerLink]="['/produit', p.slug]" (click)="close()">
              <span class="thumb">
                @if (p.image) { <img [src]="p.image" alt="" /> } @else { <span class="img-placeholder"><app-icon name="image" [size]="16" /></span> }
              </span>
              <span class="grow">{{ p.name }}<br /><span class="muted small">{{ p.brand }}</span></span>
              <strong>{{ p.price | dt }}</strong>
            </a>
          }
        }
        @if (s.categories.length || s.brands.length) {
          <p class="group">Rayons et marques</p>
          <div class="chips">
            @for (c of s.categories; track c.id) {
              <a class="chip" [routerLink]="['/catalogue', c.slug]" (click)="close()">{{ c.name }}</a>
            }
            @for (b of s.brands; track b) {
              <a class="chip" routerLink="/catalogue" [queryParams]="{ brand: b }" (click)="close()">{{ b }}</a>
            }
          </div>
        }
        @if (!s.products.length && !s.categories.length && !s.brands.length) {
          <p class="none">Aucun résultat pour « {{ query }} »</p>
        } @else {
          <button type="button" class="all" (click)="submit()">Voir tous les résultats pour « {{ query }} » →</button>
        }
      </div>
    }
  `,
  styles: `
    :host { position: relative; flex: 1 1 320px; display: block; }
    .search { display: flex; background: #fff; border-radius: 10px; overflow: hidden; }
    .search input { flex: 1; min-width: 0; border: 0; padding: 12px 14px; font: 400 15px var(--font-body); }
    .search input:focus { outline: none; }
    .search:focus-within { outline: 2px solid #60a5fa; }
    .search button { border: 0; background: var(--blue); color: #fff; padding: 0 16px; min-height: 44px; cursor: pointer; }
    .panel { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 40; background: #fff; color: var(--ink);
      border-radius: 12px; box-shadow: 0 16px 40px rgba(15,23,42,.25); padding: 8px; max-height: 70vh; overflow: auto; }
    .group { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 8px 8px 4px; }
    .item { display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 8px; color: var(--ink); text-decoration: none; font-size: 14px; }
    .item:hover, .item:focus { background: var(--blue-soft); color: var(--ink); }
    .grow { flex: 1; min-width: 0; }
    .thumb { width: 40px; height: 40px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 8px 8px; }
    .chip { background: #f1f5f9; color: var(--ink); text-decoration: none; padding: 6px 12px; border-radius: 999px; font-size: 13px; }
    .chip:hover { background: var(--blue-tint); color: var(--blue-dark); }
    .none { padding: 16px 8px; color: var(--muted); font-size: 14px; }
    .all { width: 100%; text-align: left; border: 0; border-top: 1px solid var(--line); background: none; padding: 12px 8px 6px;
      color: var(--blue); font: 600 14px var(--font-body); cursor: pointer; }
  `,
})
export class SearchBox {
  private api = inject(ApiService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  protected query = '';
  protected open = signal(false);
  protected typed$ = new Subject<string>();

  protected suggestions = toSignal(
    this.typed$.pipe(
      map((q) => q.trim()),
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) => (q.length < 2 ? of(EMPTY) : this.api.suggest(q).pipe(catchError(() => of(EMPTY))))),
    ),
    { initialValue: EMPTY },
  );

  protected showPanel() {
    return this.open() && this.query.trim().length >= 2;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  close() {
    this.open.set(false);
  }

  submit() {
    const q = this.query.trim();
    this.open.set(false);
    this.router.navigate(['/catalogue'], { queryParams: q ? { q } : {} });
  }
}
