import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CartService, MAX_QTY } from '../core/cart.service';
import { ProductDetail, ProductRecommendations, ProductSummary } from '../core/models';
import { DtPipe, discount } from '../core/pipes';
import { CompareService, RecentlyViewedService, VisitorService, WishlistService, toSummary } from '../core/stores';
import { ProductCarousel } from '../shared/carousel';
import { Icon } from '../shared/icon';
import { BEST_SELLER_MIN } from '../shared/product-card';
import { Stars } from '../shared/stars';
import { ProductReviews } from './product-reviews';

type Load = { state: 'loading' } | { state: 'ok'; product: ProductDetail } | { state: 'error'; notFound: boolean };

const NO_RECO: ProductRecommendations = { similar: [], boughtTogether: [], alsoViewed: [], viewsLast24h: 0 };
/** Délai de livraison annoncé, en jours ouvrés (à ajuster selon votre transporteur). */
const DELIVERY_DAYS = { min: 1, max: 3 };
const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

@Component({
  selector: 'app-product-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DtPipe, Icon, Stars, ProductCarousel, ProductReviews],
  template: `
    @switch (load().state) {
      @case ('loading') { <div class="spinner" role="status" aria-label="Chargement"></div> }
      @case ('error') {
        <div class="container empty">
          <h1>{{ notFound() ? 'Produit introuvable' : 'Erreur de chargement' }}</h1>
          <p style="margin: 12px 0 20px">{{ notFound() ? "Ce produit n'existe plus ou n'est plus en vente." : 'Réessayez dans un instant.' }}</p>
          <a routerLink="/catalogue" class="btn btn-primary">Retour au catalogue</a>
        </div>
      }
      @case ('ok') {
        @let p = product()!;
        <div class="container">
          <nav aria-label="Fil d'Ariane" class="crumbs">
            <a routerLink="/">Accueil</a><span>/</span>
            @if (p.categorySlug) { <a [routerLink]="['/catalogue', p.categorySlug]">{{ p.categoryName }}</a><span>/</span> }
            <span>{{ p.name }}</span>
          </nav>

          <section class="main">
            <div class="gallery">
              <div class="main-img">
                @if (p.images.length) {
                  <img [src]="p.images[activeImage()]" [alt]="p.name" />
                } @else {
                  <span class="img-placeholder"><app-icon name="image" [size]="64" [stroke]="1.2" /></span>
                }
                <div class="flags">
                  @if (off(); as o) { <span class="badge badge-promo">-{{ o }} %</span> }
                  @if (p.soldCount >= bestSellerMin) { <span class="badge badge-best">Meilleure vente</span> }
                </div>
              </div>
              @if (p.images.length > 1) {
                <div class="thumbs">
                  @for (img of p.images; track $index) {
                    <button type="button" [class.on]="$index === activeImage()" (click)="activeImage.set($index)"
                            [attr.aria-label]="'Photo ' + ($index + 1)">
                      <img [src]="img" alt="" />
                    </button>
                  }
                </div>
              }
            </div>

            <div class="info">
              <div class="stack" style="gap: 8px">
                <span class="muted small upper">{{ p.brand }} @if (p.sku) { · Réf. {{ p.sku }} }</span>
                <h1>{{ p.name }}</h1>
                <div class="row" style="gap: 12px">
                  @if (p.ratingCount > 0) {
                    <a href="#avis" class="rating-link"><app-stars [value]="p.ratingAvg" [size]="16" /> {{ p.ratingCount }} avis</a>
                  } @else {
                    <a href="#avis" class="rating-link muted small">Soyez le premier à donner votre avis</a>
                  }
                  @if (p.soldCount > 0) { <span class="muted small">{{ p.soldCount }} vendu{{ p.soldCount > 1 ? 's' : '' }}</span> }
                </div>
              </div>

              <div class="row" style="align-items: baseline">
                <span class="price big">{{ p.price | dt }}</span>
                @if (off()) {
                  <span class="old-price" style="font-size: 18px">{{ p.oldPrice | dt }}</span>
                  <span class="save">Vous économisez {{ (p.oldPrice! - p.price) | dt }}</span>
                }
              </div>

              @if (views() >= 2) {
                <p class="proof"><app-icon name="eye" [size]="18" /> {{ views() }} personnes ont consulté ce produit ces dernières 24 h</p>
              }

              @if (p.stock === 0) {
                <span class="out-stock">● Rupture de stock</span>
              } @else if (p.stock <= 5) {
                <span class="low-stock">● Plus que {{ p.stock }} en stock, commandez vite</span>
              } @else {
                <span class="in-stock">● En stock</span>
              }

              @if (p.stock > 0) {
                <p class="delivery"><app-icon name="truck" [size]="18" /> Livraison estimée : <strong>{{ deliveryWindow() }}</strong></p>
                <div class="row">
                  <div class="qty" role="group" aria-label="Quantité">
                    <button type="button" class="icon-btn" aria-label="Diminuer la quantité" (click)="qty.set(max1(qty() - 1))"><app-icon name="minus" [size]="18" /></button>
                    <span aria-live="polite">{{ qty() }}</span>
                    <button type="button" class="icon-btn" aria-label="Augmenter la quantité" [disabled]="qty() >= maxQty()" (click)="qty.set(qty() + 1)"><app-icon name="plus" [size]="18" /></button>
                  </div>
                  <button type="button" class="btn btn-primary grow" (click)="addToCart(false)">
                    {{ added() ? 'Ajouté au panier ✓' : 'Ajouter au panier' }}
                  </button>
                </div>
                <button type="button" class="btn btn-accent btn-block" (click)="addToCart(true)">Acheter maintenant</button>
                @if (whatsappLink(); as wa) {
                  <a [href]="wa" target="_blank" rel="noopener" class="btn btn-wa btn-block"><app-icon name="whatsapp" /> Commander sur WhatsApp</a>
                }
              }

              <div class="row tools">
                <button type="button" class="btn btn-outline btn-sm" [class.on]="wished()" (click)="wishlist.toggle(p)" [attr.aria-pressed]="wished()">
                  <app-icon [name]="wished() ? 'heartFill' : 'heart'" [size]="16" /> {{ wished() ? 'Dans mes favoris' : 'Ajouter aux favoris' }}
                </button>
                <button type="button" class="btn btn-outline btn-sm" [class.on]="compared()" (click)="toggleCompare(p)" [attr.aria-pressed]="compared()">
                  <app-icon name="compare" [size]="16" /> {{ compared() ? 'Dans le comparateur' : 'Comparer' }}
                </button>
                <button type="button" class="btn btn-outline btn-sm" (click)="share(p)">
                  <app-icon name="share" [size]="16" /> {{ shared() ? 'Lien copié ✓' : 'Partager' }}
                </button>
              </div>

              <div class="card card-tight perks">
                <div><app-icon name="truck" [size]="20" /> Livraison dans les 24 gouvernorats</div>
                <div><app-icon name="card" [size]="20" /> Paiement à la livraison ou en ligne</div>
                <div><app-icon name="shield" [size]="20" /> Garantie [durée] · produit neuf</div>
              </div>
            </div>
          </section>

          @if (bundle().length) {
            <section class="card together" aria-labelledby="fbt-title">
              <h2 id="fbt-title">Souvent achetés ensemble</h2>
              <div class="fbt">
                <div class="fbt-items">
                  @for (b of bundle(); track b.id; let last = $last) {
                    <label class="fbt-item" [class.off]="!picked().has(b.id)">
                      <input type="checkbox" [checked]="picked().has(b.id)" [disabled]="b.id === p.id" (change)="togglePick(b.id)" />
                      <span class="thumb fbt-thumb">
                        @if (b.image) { <img [src]="b.image" alt="" /> } @else { <span class="img-placeholder"><app-icon name="image" [size]="22" /></span> }
                      </span>
                      <span class="stack" style="gap: 2px">
                        <span class="fbt-name">{{ b.id === p.id ? 'Cet article : ' : '' }}{{ b.name }}</span>
                        <strong>{{ b.price | dt }}</strong>
                      </span>
                    </label>
                    @if (!last) { <span class="plus" aria-hidden="true">+</span> }
                  }
                </div>
                <div class="fbt-total">
                  <span class="muted small">Prix total</span>
                  <span class="price">{{ bundleTotal() | dt }}</span>
                  <button type="button" class="btn btn-accent" (click)="addBundle()">
                    {{ bundleAdded() ? 'Ajoutés ✓' : 'Ajouter les ' + picked().size + ' au panier' }}
                  </button>
                </div>
              </div>
            </section>
          }

          <section class="details">
            <div class="card stack">
              <h2>Description</h2>
              <p class="desc">{{ p.description || 'Description à venir.' }}</p>
            </div>
            @if (specs().length) {
              <div class="card stack">
                <h2>Caractéristiques</h2>
                <table class="specs">
                  <tbody>
                    @for (s of specs(); track s[0]) {
                      <tr><th scope="row">{{ s[0] }}</th><td>{{ s[1] }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <div class="reco">
            <app-product-carousel title="Les clients ayant consulté ce produit ont aussi regardé" [products]="reco().alsoViewed" />
            <app-product-carousel title="Produits similaires" [products]="reco().similar" />
          </div>

          @defer (on idle) {
            <app-product-reviews [slug]="p.slug" />
          } @placeholder {
            <div class="card" style="min-height: 200px"></div>
          }

          @if (recentOthers().length) {
            <div class="reco">
              <app-product-carousel title="Vos produits récemment consultés" [products]="recentOthers()" />
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    .crumbs { font-size: 14px; color: var(--muted); display: flex; gap: 8px; flex-wrap: wrap; padding: 24px 0 8px; }
    .crumbs a { text-decoration: none; }
    .main { display: flex; flex-wrap: wrap; gap: 40px; padding: 16px 0 32px; align-items: flex-start; }
    .gallery { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 140px; }
    @media (max-width: 900px) { .gallery { position: static; } }
    .main-img { position: relative; aspect-ratio: 1; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
    .main-img img { width: 100%; height: 100%; object-fit: contain; padding: 24px; }
    .flags { position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .badge-best { background: #f59e0b; color: #1c1917; border-radius: 6px; }
    .thumbs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .thumbs button { aspect-ratio: 1; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 6px; cursor: pointer; }
    .thumbs button.on { border: 2px solid var(--blue); }
    .thumbs img { width: 100%; height: 100%; object-fit: contain; }
    .info { flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 18px; }
    .upper { text-transform: uppercase; letter-spacing: .05em; }
    .rating-link { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-size: 14px; }
    .big { font-size: 36px; }
    .save { background: var(--red-soft); color: var(--promo); font-weight: 600; font-size: 13px; padding: 3px 10px; border-radius: 999px; }
    .proof { display: flex; gap: 8px; align-items: center; font-size: 14px; color: var(--promo); font-weight: 500; }
    .low-stock { color: var(--promo); font-size: 14px; font-weight: 600; }
    .delivery { display: flex; gap: 8px; align-items: center; font-size: 14px; color: var(--ink-2); flex-wrap: wrap; }
    .qty { display: flex; align-items: center; border: 1px solid var(--line-2); border-radius: 10px; background: var(--surface); }
    .qty span { min-width: 32px; text-align: center; font-weight: 600; }
    .grow { flex: 1 1 200px; }
    .btn-wa { background: #128c3e; color: #fff; }
    .btn-wa:hover { background: #0f7535; color: #fff; }
    .tools .btn.on { border-color: var(--blue); color: var(--blue); background: var(--blue-soft); }
    .perks { display: flex; flex-direction: column; gap: 12px; font-size: 14px; }
    .perks div { display: flex; gap: 10px; align-items: center; color: var(--ink-2); }
    .together { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .fbt { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: space-between; }
    .fbt-items { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; flex: 999 1 480px; }
    .fbt-item { display: flex; gap: 10px; align-items: center; padding: 10px; border: 1px solid var(--line); border-radius: 12px;
      max-width: 280px; cursor: pointer; }
    .fbt-item.off { opacity: .55; }
    .fbt-item input { width: 18px; height: 18px; accent-color: var(--blue); flex: none; }
    .fbt-thumb { width: 56px; height: 56px; }
    .fbt-name { font-size: 14px; line-height: 1.3; }
    .plus { font-size: 24px; color: var(--muted); font-weight: 300; }
    .fbt-total { flex: 1 1 220px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .details { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px; }
    .desc { white-space: pre-line; color: var(--ink-2); }
    .specs { width: 100%; border-collapse: collapse; font-size: 15px; }
    .specs th { text-align: left; color: var(--muted); font-weight: 500; padding: 10px 16px 10px 0; width: 40%; }
    .specs td { padding: 10px 0; }
    .specs tr + tr { border-top: 1px solid var(--line); }
    .reco { display: flex; flex-direction: column; gap: 32px; margin: 32px 0; }
  `,
})
export class ProductPage {
  private api = inject(ApiService);
  private cart = inject(CartService);
  private router = inject(Router);
  private titleService = inject(Title);
  private visitor = inject(VisitorService);
  private recent = inject(RecentlyViewedService);
  private compare = inject(CompareService);
  protected wishlist = inject(WishlistService);

  slug = input.required<string>();

  protected readonly bestSellerMin = BEST_SELLER_MIN;

  protected load = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        this.api.product(slug).pipe(
          map((product): Load => ({ state: 'ok', product })),
          startWith({ state: 'loading' } as Load),
          catchError((e) => of({ state: 'error', notFound: e?.status === 404 } as Load)),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  protected reco = toSignal(
    toObservable(this.slug).pipe(
      switchMap((s) => this.api.recommendations(s).pipe(startWith(NO_RECO), catchError(() => of(NO_RECO)))),
    ),
    { initialValue: NO_RECO },
  );

  private settings = toSignal(this.api.settings().pipe(catchError(() => of(null))), { initialValue: null });
  protected views = signal(0);

  protected product = computed(() => {
    const l = this.load();
    return l.state === 'ok' ? l.product : null;
  });
  protected notFound = computed(() => {
    const l = this.load();
    return l.state === 'error' && l.notFound;
  });
  protected specs = computed(() => Object.entries(this.product()?.specs ?? {}));
  protected off = computed(() => {
    const p = this.product();
    return p ? discount(p.price, p.oldPrice) : null;
  });
  protected maxQty = computed(() => Math.min(MAX_QTY, this.product()?.stock ?? 1));
  protected wished = computed(() => this.wishlist.ids().includes(this.product()?.id ?? ''));
  protected compared = computed(() => this.compare.ids().includes(this.product()?.id ?? ''));
  protected recentOthers = computed(() => this.recent.items().filter((r) => r.id !== this.product()?.id));

  // « Souvent achetés ensemble » : l'article courant + les produits co-achetés, tous cochés par défaut
  protected bundle = computed<ProductSummary[]>(() => {
    const p = this.product();
    const together = this.reco().boughtTogether;
    return p && together.length && p.stock > 0 ? [toSummary(p), ...together] : [];
  });
  protected picked = signal<Set<string>>(new Set());
  protected bundleTotal = computed(() =>
    this.bundle().filter((b) => this.picked().has(b.id)).reduce((s, b) => s + b.price, 0),
  );
  protected bundleAdded = signal(false);

  protected deliveryWindow = computed(() => {
    const from = addBusinessDays(new Date(), DELIVERY_DAYS.min);
    const to = addBusinessDays(new Date(), DELIVERY_DAYS.max);
    return `${DAY_FMT.format(from)} – ${DAY_FMT.format(to)}`;
  });

  protected whatsappLink = computed(() => {
    const num = this.settings()?.whatsappNumber;
    const p = this.product();
    if (!num || !p) return null;
    const text = `Bonjour, je souhaite commander : ${p.name} (${p.price} DT)\n${location.origin}/produit/${p.slug}`;
    return `https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  });

  protected activeImage = signal(0);
  protected qty = signal(1);
  protected added = signal(false);
  protected shared = signal(false);

  constructor() {
    effect(() => {
      const p = this.product();
      if (!p) return;
      this.titleService.setTitle(`${p.name} – TechStore`);
      this.recent.push(p);
      this.api.recordView(p.slug, this.visitor.id).subscribe({
        next: (r) => this.views.set(r.viewsLast24h),
        error: () => this.views.set(0),
      });
    });
    effect(() => {
      this.picked.set(new Set(this.bundle().map((b) => b.id)));
    });
    // Remet la galerie et la quantité à zéro quand on change de produit
    effect(() => {
      this.slug();
      this.activeImage.set(0);
      this.qty.set(1);
      this.views.set(0);
    });
  }

  protected max1(n: number) {
    return Math.max(1, n);
  }

  addToCart(checkout: boolean) {
    const p = this.product();
    if (!p) return;
    this.cart.add(p, this.qty());
    if (checkout) {
      this.router.navigate(['/panier']);
      return;
    }
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1800);
  }

  togglePick(id: string) {
    this.picked.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  addBundle() {
    this.bundle().filter((b) => this.picked().has(b.id)).forEach((b) => this.cart.add(b));
    this.bundleAdded.set(true);
    setTimeout(() => this.bundleAdded.set(false), 1800);
  }

  toggleCompare(p: ProductDetail) {
    if (!this.compare.toggle(p)) alert('Le comparateur contient déjà 4 produits.');
  }

  async share(p: ProductDetail) {
    const url = `${location.origin}/produit/${p.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.name, text: `${p.name} – ${p.price} DT`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.shared.set(true);
      setTimeout(() => this.shared.set(false), 2000);
    } catch {
      /* partage annulé */
    }
  }
}

function addBusinessDays(d: Date, n: number): Date {
  const r = new Date(d);
  let added = 0;
  while (added < n) {
    r.setDate(r.getDate() + 1);
    if (r.getDay() !== 0) added++; // dimanche non travaillé
  }
  return r;
}
