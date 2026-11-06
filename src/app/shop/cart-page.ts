import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth';
import { CartService, MAX_QTY } from '../core/cart.service';
import { CouponQuote, GOVERNORATES, PAYMENT_LABELS, PaymentMethod, ProductSummary, ShopSettings } from '../core/models';
import { ProductCarousel } from '../shared/carousel';
import { DtPipe } from '../core/pipes';
import { Icon } from '../shared/icon';

const PAYMENTS: { value: PaymentMethod; desc: string }[] = [
  { value: 'CASH_ON_DELIVERY', desc: 'En espèces à la réception du colis' },
  { value: 'CARD', desc: 'Visa, Mastercard et cartes CIB tunisiennes' },
  { value: 'E_DINAR', desc: 'Carte e-Dinar La Poste Tunisienne' },
  { value: 'MOBILE_WALLET', desc: 'Flouci, Konnect…' },
];

@Component({
  selector: 'app-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DtPipe, Icon, ProductCarousel],
  template: `
    <div class="container page">
      <h1>Mon panier</h1>

      @if (!cart.lines().length) {
        <div class="card empty">
          <p>Votre panier est vide.</p>
          <a routerLink="/catalogue" class="btn btn-primary" style="margin-top: 16px">Découvrir le catalogue</a>
        </div>
      } @else {
        <form class="layout" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="col-main">
            @if (settings(); as st) {
              @if (st.freeShippingThreshold > 0) {
                <div class="card card-tight ship" role="status">
                  @if (remainingForFree() > 0) {
                    <p><app-icon name="truck" [size]="18" /> Plus que <strong>{{ remainingForFree() | dt }}</strong> pour profiter de la <strong>livraison offerte</strong></p>
                  } @else {
                    <p class="ok"><app-icon name="check" [size]="18" [stroke]="2.5" /> Bravo, la livraison vous est offerte !</p>
                  }
                  <div class="ship-bar" aria-hidden="true"><span [style.width.%]="shipProgress()"></span></div>
                </div>
              }
            }
            <section class="card">
              <h2 class="sec-title">Articles ({{ cart.count() }})</h2>
              @for (l of cart.lines(); track l.productId) {
                <div class="line">
                  <a class="thumb big-thumb" [routerLink]="['/produit', l.slug]">
                    @if (l.image) { <img [src]="l.image" [alt]="l.name" /> } @else { <span class="img-placeholder"><app-icon name="image" [size]="24" /></span> }
                  </a>
                  <div class="line-info">
                    <a [routerLink]="['/produit', l.slug]" class="line-name">{{ l.name }}</a>
                    <span class="muted small">{{ l.price | dt }} l'unité</span>
                  </div>
                  <div class="qty" role="group" [attr.aria-label]="'Quantité de ' + l.name">
                    <button type="button" class="icon-btn" aria-label="Diminuer" (click)="cart.setQuantity(l.productId, l.quantity - 1)"><app-icon name="minus" [size]="16" /></button>
                    <span>{{ l.quantity }}</span>
                    <button type="button" class="icon-btn" aria-label="Augmenter" [disabled]="l.quantity >= min(maxQty, l.stock)" (click)="cart.setQuantity(l.productId, l.quantity + 1)"><app-icon name="plus" [size]="16" /></button>
                  </div>
                  <strong class="line-total">{{ l.price * l.quantity | dt }}</strong>
                  <button type="button" class="icon-btn" [attr.aria-label]="'Retirer ' + l.name" (click)="cart.remove(l.productId)"><app-icon name="trash" [size]="18" /></button>
                </div>
              }
            </section>

            <section class="card">
              <h2 class="sec-title">Adresse de livraison</h2>
              <div class="form-grid">
                <label class="field">Nom et prénom *
                  <input class="input" formControlName="customerName" autocomplete="name" />
                </label>
                <label class="field">Téléphone *
                  <input class="input" formControlName="phone" type="tel" autocomplete="tel" placeholder="XX XXX XXX" />
                  @if (form.controls.phone.touched && form.controls.phone.invalid) { <span class="error-text">8 chiffres, ex. 22 123 456</span> }
                </label>
                <label class="field">E-mail <span class="hint">(recommandé : on vous prévient dès l'expédition)</span>
                  <input class="input" formControlName="email" type="email" autocomplete="email" />
                </label>
                <label class="field">Gouvernorat *
                  <select class="select" formControlName="governorate">
                    <option value="" disabled>Choisir…</option>
                    @for (g of governorates; track g) { <option [value]="g">{{ g }}</option> }
                  </select>
                </label>
                <label class="field">Ville / Délégation
                  <input class="input" formControlName="city" autocomplete="address-level2" />
                </label>
                <label class="field full">Adresse complète *
                  <input class="input" formControlName="address" autocomplete="street-address" placeholder="Rue, numéro, immeuble, étage" />
                </label>
                <label class="field full">Note pour le livreur <span class="hint">(facultatif)</span>
                  <textarea class="textarea" formControlName="note" rows="2" style="min-height: 72px"></textarea>
                </label>
              </div>
            </section>

            <section class="card">
              <h2 class="sec-title">Mode de paiement</h2>
              <div class="pay-list" role="radiogroup" aria-label="Mode de paiement">
                @for (p of payments; track p.value) {
                  <label class="pay" [class.on]="form.controls.paymentMethod.value === p.value">
                    <input type="radio" formControlName="paymentMethod" [value]="p.value" />
                    <span class="stack" style="gap: 2px">
                      <strong>{{ labels[p.value] }}</strong>
                      <span class="muted small">{{ p.desc }}</span>
                    </span>
                  </label>
                }
              </div>
              @if (form.controls.paymentMethod.value !== 'CASH_ON_DELIVERY') {
                <p class="alert alert-info" style="margin-top: 12px">
                  Le paiement en ligne sera disponible après le branchement de la passerelle de paiement.
                  Votre commande est enregistrée et notre équipe vous contactera.
                </p>
              }
            </section>
          </div>

          <aside class="card summary" aria-label="Récapitulatif">
            <h2 class="sec-title">Récapitulatif</h2>
            <div class="sum-row"><span class="muted">Sous-total</span><span>{{ cart.subtotal() | dt }}</span></div>
            @if (coupon(); as c) {
              <div class="sum-row promo"><span>Code {{ c.code }} <button type="button" class="link" (click)="removeCoupon()">retirer</button></span><span>-{{ c.discount | dt }}</span></div>
            }
            <div class="sum-row"><span class="muted">Livraison</span><span>{{ shipping() === 0 ? 'Offerte' : (shipping() | dt) }}</span></div>
            <div class="sum-row"><span class="muted">Timbre fiscal</span><span>{{ settings()?.fiscalStamp | dt }}</span></div>
            @if (settings(); as s) {
              @if (shipping() > 0 && s.freeShippingThreshold > 0) {
                <p class="small muted">Livraison offerte dès {{ s.freeShippingThreshold | dt }} d'achat.</p>
              }
            }
            @if (!coupon()) {
              <div class="coupon">
                <label for="coupon" class="sr-only">Code promo</label>
                <input id="coupon" class="input" placeholder="Code promo" [value]="couponInput()"
                       (input)="couponInput.set($any($event.target).value)" (keydown.enter)="$event.preventDefault(); applyCoupon()" />
                <button type="button" class="btn btn-outline" [disabled]="!couponInput().trim() || couponBusy()" (click)="applyCoupon()">Appliquer</button>
              </div>
              @if (couponError()) { <p class="error-text" role="alert">{{ couponError() }}</p> }
            }
            <div class="sum-row total"><span>Total TTC</span><span class="price">{{ total() | dt }}</span></div>
            @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
            <button type="submit" class="btn btn-primary btn-block" [disabled]="submitting()">
              {{ submitting() ? 'Envoi…' : 'Confirmer la commande' }}
            </button>
            <p class="small muted">Vous serez contacté par téléphone pour confirmer la livraison.</p>
            <a routerLink="/catalogue" class="small" style="text-align: center">← Continuer mes achats</a>
          </aside>
        </form>
        @if (suggestions().length) {
          <app-product-carousel title="Complétez votre commande" subtitle="Sélectionnés d'après votre panier" [products]="suggestions()" />
        }
      }
    </div>
  `,
  styles: `
    .page { padding-top: 28px; display: flex; flex-direction: column; gap: 24px; }
    .layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
    .col-main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
    .sec-title { font-size: 20px; margin-bottom: 16px; }
    .line { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 14px 0; border-top: 1px solid var(--line); }
    .line:first-of-type { border-top: 0; }
    .big-thumb { width: 72px; height: 72px; }
    .line-info { flex: 1 1 180px; display: flex; flex-direction: column; gap: 2px; }
    .line-name { font-weight: 600; color: var(--ink); text-decoration: none; }
    .line-total { min-width: 100px; text-align: right; font-family: var(--font-display); }
    .qty { display: flex; align-items: center; border: 1px solid var(--line-2); border-radius: 10px; }
    .qty span { min-width: 28px; text-align: center; font-weight: 600; }
    .pay-list { display: flex; flex-direction: column; gap: 10px; }
    .pay { display: flex; gap: 14px; align-items: center; padding: 14px 16px; border: 1px solid var(--line-2); border-radius: 12px; cursor: pointer; }
    .pay.on { border: 2px solid var(--blue); background: var(--blue-soft); }
    .pay input { width: 18px; height: 18px; accent-color: var(--blue); }
    .summary { flex: 1 1 300px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 140px; }
    .sum-row { display: flex; justify-content: space-between; font-size: 15px; }
    .total { border-top: 1px solid var(--line); padding-top: 12px; font-weight: 600; align-items: baseline; }
    .promo { color: var(--green); font-weight: 500; }
    .link { border: 0; background: none; color: var(--muted); text-decoration: underline; cursor: pointer; font-size: 13px; padding: 0 4px; }
    .coupon { display: flex; gap: 8px; }
    .coupon .input { min-width: 0; text-transform: uppercase; }
    .ship p { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 15px; margin-bottom: 10px; }
    .ship .ok { color: var(--green); font-weight: 600; }
    .ship-bar { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
    .ship-bar span { display: block; height: 100%; background: var(--green); border-radius: 999px; transition: width .3s; }
  `,
})
export class CartPage {
  private api = inject(ApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  protected cart = inject(CartService);

  protected readonly payments = PAYMENTS;
  protected readonly labels = PAYMENT_LABELS;
  protected readonly governorates = GOVERNORATES;
  protected readonly maxQty = MAX_QTY;
  protected readonly min = Math.min;

  protected settings = toSignal(this.api.settings().pipe(catchError(() => of(null as ShopSettings | null))), {
    initialValue: null,
  });
  // Code promo : vérifié par le serveur, recalculé quand le panier change
  protected couponInput = signal('');
  protected couponBusy = signal(false);
  protected couponError = signal<string | null>(null);
  protected coupon = signal<CouponQuote | null>(null);
  private couponFor = 0;

  protected afterDiscount = computed(() => Math.max(0, this.cart.subtotal() - (this.coupon()?.discount ?? 0)));
  protected shipping = computed(() => {
    const s = this.settings();
    if (!s) return 0;
    return this.afterDiscount() >= s.freeShippingThreshold ? 0 : s.shippingFee;
  });
  protected total = computed(() => this.afterDiscount() + this.shipping() + (this.settings()?.fiscalStamp ?? 0));
  protected remainingForFree = computed(() => Math.max(0, (this.settings()?.freeShippingThreshold ?? 0) - this.afterDiscount()));
  protected shipProgress = computed(() => {
    const t = this.settings()?.freeShippingThreshold ?? 0;
    return t ? Math.min(100, Math.round((this.afterDiscount() / t) * 100)) : 100;
  });

  protected suggestions = toSignal(
    this.cart.lines().length
      ? this.api.forYou(this.cart.lines().map((l) => l.productId), 8).pipe(catchError(() => of([] as ProductSummary[])))
      : of([] as ProductSummary[]),
    { initialValue: [] },
  );

  constructor() {
    // Si le sous-total change, on revérifie le code (minimum d'achat, montant de la remise)
    effect(() => {
      const subtotal = this.cart.subtotal();
      const c = untracked(() => this.coupon());
      if (c && subtotal !== this.couponFor) this.checkCoupon(c.code, true);
    });
  }

  applyCoupon() {
    this.checkCoupon(this.couponInput().trim(), false);
  }

  removeCoupon() {
    this.coupon.set(null);
    this.couponError.set(null);
  }

  private checkCoupon(code: string, silent: boolean) {
    if (!code) return;
    this.couponBusy.set(true);
    const subtotal = this.cart.subtotal();
    this.api.checkCoupon(code, subtotal).subscribe({
      next: (q) => {
        this.couponFor = subtotal;
        this.coupon.set(q);
        this.couponError.set(null);
        this.couponBusy.set(false);
      },
      error: (e) => {
        this.coupon.set(null);
        this.couponError.set(errorMessage(e, 'Code promo invalide'));
        this.couponBusy.set(false);
        if (silent) this.couponInput.set(code);
      },
    });
  }

  protected submitting = signal(false);
  protected error = signal<string | null>(null);

  protected form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(150)]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+?216)?[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}$/)]],
    email: ['', [Validators.email]],
    governorate: ['', Validators.required],
    city: [''],
    address: ['', [Validators.required, Validators.maxLength(300)]],
    note: [''],
    paymentMethod: ['CASH_ON_DELIVERY' as PaymentMethod, Validators.required],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Merci de compléter les champs obligatoires.');
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .checkout({
        ...v,
        email: v.email || null,
        city: v.city || null,
        note: v.note || null,
        couponCode: this.coupon()?.code ?? null,
        items: this.cart.lines().map((l) => ({ productId: l.productId, quantity: l.quantity })),
      })
      .subscribe({
        next: (order) => {
          this.cart.clear();
          this.router.navigate(['/commande', order.reference], { state: { order } });
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(errorMessage(err, "La commande n'a pas pu être enregistrée."));
        },
      });
  }
}
