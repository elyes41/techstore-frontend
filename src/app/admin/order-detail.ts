import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService, OrderUpdate } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { OrderDetail, OrderStatus, PAYMENT_LABELS, PaymentStatus, STATUS_LABELS } from '../core/models';
import { DateTnPipe, DtPipe } from '../core/pipes';
import { Icon } from '../shared/icon';
import { StatusBadge } from './status-badge';

/** Étape suivante proposée selon le statut actuel. */
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PENDING: { to: 'CONFIRMED', label: 'Confirmer la commande' },
  CONFIRMED: { to: 'SHIPPED', label: 'Marquer comme expédiée' },
  SHIPPED: { to: 'DELIVERED', label: 'Marquer comme livrée' },
};

@Component({
  selector: 'app-order-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DtPipe, DateTnPipe, StatusBadge, Icon],
  template: `
    <a routerLink="/admin/commandes" class="back"><app-icon name="arrowLeft" [size]="18" /> Commandes</a>

    @if (error()) { <p class="alert alert-error" role="alert" style="margin: 12px 0">{{ error() }}</p> }

    @if (order(); as o) {
      <div class="head">
        <div class="stack" style="gap: 6px">
          <h1>{{ o.reference }}</h1>
          <span class="row" style="gap: 8px">
            <app-status-badge [status]="o.status" />
            <app-status-badge [payment]="o.paymentStatus" />
            <span class="muted small">{{ o.createdAt | dateTn }}</span>
          </span>
        </div>
        <div class="row">
          @if (next(o.status); as n) {
            @if (n.to === 'SHIPPED') {
              @if (!shipForm()) { <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="openShip(o)"><app-icon name="truck" [size]="18" /> {{ n.label }}</button> }
            } @else {
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="setStatus(n.to)">{{ n.label }}</button>
            }
          }
          @if (o.status !== 'CANCELLED' && o.status !== 'DELIVERED') {
            <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="cancel()">Annuler</button>
          }
        </div>
      </div>

      @if (shipForm()) {
        <form class="card stack ship-form" (submit)="$event.preventDefault(); confirmShip()">
          <h2 class="sec">Remettre le colis au livreur</h2>
          <div class="form-grid">
            <label class="field">Transporteur
              <input class="input" list="carriers" [value]="carrier()" (input)="carrier.set($any($event.target).value)" placeholder="ex. Aramex" maxlength="80" />
              <datalist id="carriers">
                @for (c of carriers; track c) { <option [value]="c"></option> }
              </datalist>
            </label>
            <label class="field">N° de suivi <span class="hint">(facultatif)</span>
              <input class="input" [value]="trackingNumber()" (input)="trackingNumber.set($any($event.target).value)" maxlength="80" />
            </label>
            <label class="field full">Lien de suivi <span class="hint">(facultatif, https://…)</span>
              <input class="input" type="url" [value]="trackingUrl()" (input)="trackingUrl.set($any($event.target).value)" placeholder="https://" maxlength="300" />
            </label>
          </div>
          @if (o.email) {
            <p class="alert alert-info"><app-icon name="check" [size]="16" /> Un e-mail « Votre colis est en route » sera envoyé à <strong>{{ o.email }}</strong>.</p>
          } @else {
            <p class="alert alert-warn">Le client n'a pas laissé d'e-mail : pensez à le prévenir par téléphone ({{ o.phone }}).</p>
          }
          <div class="row">
            <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ busy() ? 'Envoi…' : "Confirmer l'expédition" }}</button>
            <button type="button" class="btn btn-outline" (click)="shipForm.set(false)">Annuler</button>
          </div>
        </form>
      }

      @if (o.shippedAt) {
        <section class="card ship-info">
          <div class="stack" style="gap: 6px">
            <h2 class="sec">Expédition</h2>
            <span>Remise au livreur le {{ o.shippedAt | dateTn }}</span>
            @if (o.carrier) { <span>Transporteur : <strong>{{ o.carrier }}</strong></span> }
            @if (o.trackingNumber) { <span>N° de suivi : <strong class="mono">{{ o.trackingNumber }}</strong></span> }
            @if (o.trackingUrl) { <a [href]="o.trackingUrl" target="_blank" rel="noopener">Ouvrir le suivi transporteur ↗</a> }
          </div>
          <div class="mail-status">
            @if (o.shippingEmailSentAt) {
              <p class="alert alert-success"><app-icon name="check" [size]="16" /> E-mail d'expédition envoyé le {{ o.shippingEmailSentAt | dateTn }}</p>
            } @else if (o.shippingEmailError) {
              <p class="alert alert-error">E-mail non envoyé : {{ o.shippingEmailError }}</p>
            } @else if (o.email) {
              <p class="alert alert-info">Envoi de l'e-mail en cours…</p>
            }
            @if (o.email) {
              <button type="button" class="btn btn-outline btn-sm" [disabled]="busy()" (click)="resend()">
                {{ o.shippingEmailSentAt ? "Renvoyer l'e-mail" : "Envoyer l'e-mail" }}
              </button>
            }
            @if (notice()) { <p class="small muted" role="status">{{ notice() }}</p> }
          </div>
        </section>
      }

      <div class="grid">
        <section class="card">
          <h2 class="sec">Articles</h2>
          <div class="table-wrap" style="border: 0">
            <table class="table" style="min-width: 0">
              <thead><tr><th>Produit</th><th class="num">Prix</th><th class="num">Qté</th><th class="num">Total</th></tr></thead>
              <tbody>
                @for (i of o.items; track $index) {
                  <tr>
                    <td>
                      @if (i.productId) { <a [routerLink]="['/admin/produits', i.productId]">{{ i.productName }}</a> }
                      @else { {{ i.productName }} <span class="muted small">(supprimé)</span> }
                    </td>
                    <td class="num">{{ i.unitPrice | dt }}</td>
                    <td class="num">{{ i.quantity }}</td>
                    <td class="num">{{ i.lineTotal | dt }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="totals">
            <div><span class="muted">Sous-total</span><span>{{ o.subtotal | dt }}</span></div>
            <div><span class="muted">Livraison</span><span>{{ o.shippingFee | dt }}</span></div>
            <div><span class="muted">Timbre fiscal</span><span>{{ o.fiscalStamp | dt }}</span></div>
            <div class="grand"><span>Total</span><span class="price">{{ o.total | dt }}</span></div>
          </div>
        </section>

        <div class="stack">
          <section class="card stack" style="gap: 8px">
            <h2 class="sec">Client</h2>
            <strong>{{ o.customerName }}</strong>
            <a [href]="'tel:' + o.phone">{{ o.phone }}</a>
            @if (o.email) { <a [href]="'mailto:' + o.email">{{ o.email }}</a> }
          </section>
          <section class="card stack" style="gap: 8px">
            <h2 class="sec">Livraison</h2>
            <span>{{ o.address }}</span>
            <span>{{ o.city ? o.city + ', ' : '' }}{{ o.governorate }}</span>
            @if (o.note) { <p class="alert alert-info">{{ o.note }}</p> }
          </section>
          <section class="card stack" style="gap: 10px">
            <h2 class="sec">Paiement</h2>
            <span>{{ paymentLabels[o.paymentMethod] }}</span>
            <label class="field">Statut du paiement
              <select class="select" [value]="o.paymentStatus" (change)="setPayment($any($event.target).value)" [disabled]="busy()">
                <option value="UNPAID">Non payée</option>
                <option value="PAID">Payée</option>
                <option value="REFUNDED">Remboursée</option>
              </select>
            </label>
          </section>
        </div>
      </div>
    } @else if (!error()) {
      <div class="spinner" role="status" aria-label="Chargement"></div>
    }
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 500; }
    .head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center; margin: 12px 0 20px; }
    .grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: 20px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .sec { font-size: 18px; margin-bottom: 8px; }
    .ship-form { margin-bottom: 20px; border: 2px solid var(--blue); }
    .ship-info { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; margin-bottom: 20px; }
    .mail-status { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; max-width: 420px; }
    .alert-warn { background: var(--amber-soft); color: var(--amber); }
    .alert { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .mono { font-family: ui-monospace, monospace; }
    .totals { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; max-width: 320px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; }
    .grand { border-top: 1px solid var(--line); padding-top: 8px; font-weight: 600; align-items: baseline; }
  `,
})
export class OrderDetailPage implements OnInit {
  private api = inject(AdminApiService);
  id = input.required<string>();

  protected readonly paymentLabels = PAYMENT_LABELS;
  protected order = signal<OrderDetail | null>(null);
  protected error = signal<string | null>(null);
  protected busy = signal(false);
  protected notice = signal<string | null>(null);

  // Formulaire d'expédition
  protected readonly carriers = ['Aramex', 'Rapid-Poste', 'First Delivery', 'Intigo', 'Livreur de la boutique'];
  protected shipForm = signal(false);
  protected carrier = signal('');
  protected trackingNumber = signal('');
  protected trackingUrl = signal('');

  ngOnInit() {
    this.api.order(this.id()).subscribe({
      next: (o) => this.order.set(o),
      error: (e) => this.error.set(e?.status === 404 ? 'Commande introuvable.' : errorMessage(e)),
    });
  }

  protected next(status: OrderStatus) {
    return NEXT[status] ?? null;
  }

  setStatus(status: OrderStatus) {
    this.update({ status });
  }

  openShip(o: OrderDetail) {
    this.carrier.set(o.carrier ?? '');
    this.trackingNumber.set(o.trackingNumber ?? '');
    this.trackingUrl.set(o.trackingUrl ?? '');
    this.shipForm.set(true);
  }

  confirmShip() {
    const url = this.trackingUrl().trim();
    if (url && !/^https?:\/\//.test(url)) {
      this.error.set('Le lien de suivi doit commencer par http:// ou https://');
      return;
    }
    this.update(
      { status: 'SHIPPED', carrier: this.carrier().trim() || null, trackingNumber: this.trackingNumber().trim() || null, trackingUrl: url || null },
      () => {
        this.shipForm.set(false);
        // L'e-mail part juste après l'enregistrement : on rafraîchit pour afficher le résultat
        setTimeout(() => this.reload(), 2500);
      },
    );
  }

  resend() {
    this.busy.set(true);
    this.notice.set(null);
    this.api.notifyShipped(this.id()).subscribe({
      next: (r) => {
        this.order.set(r.order);
        this.notice.set(r.message);
        this.busy.set(false);
      },
      error: (e) => {
        this.busy.set(false);
        this.notice.set(errorMessage(e));
      },
    });
  }

  private reload() {
    this.api.order(this.id()).subscribe({ next: (o) => this.order.set(o) });
  }

  cancel() {
    if (confirm('Annuler cette commande ? Le stock des articles sera restitué.')) this.update({ status: 'CANCELLED' });
  }

  setPayment(paymentStatus: PaymentStatus) {
    this.update({ paymentStatus });
  }

  private update(body: OrderUpdate, done?: () => void) {
    this.busy.set(true);
    this.error.set(null);
    this.api.updateOrder(this.id(), body).subscribe({
      next: (o) => {
        this.order.set(o);
        this.busy.set(false);
        done?.();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected readonly statusLabels = STATUS_LABELS;
}
