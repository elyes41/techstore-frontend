import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { OrderDetail, PAYMENT_LABELS, STATUS_LABELS } from '../core/models';
import { DtPipe, DateTnPipe } from '../core/pipes';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-order-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, DtPipe, DateTnPipe, Icon],
  template: `
    <div class="container page">
      @if (order(); as o) {
        <div class="card done">
          <span class="ok-icon"><app-icon name="check" [size]="28" [stroke]="2.5" /></span>
          <h1>Merci {{ o.customerName }} !</h1>
          <p class="muted">Commande <strong>{{ o.reference }}</strong> du {{ o.createdAt | dateTn }} · {{ statusLabels[o.status] }}</p>
          <p>Nous vous appellerons au <strong>{{ o.phone }}</strong> pour confirmer la livraison à {{ o.governorate }}.</p>
        </div>

        @if (o.status !== 'CANCELLED') {
          <div class="card">
            <ol class="steps" aria-label="Suivi de la commande">
              @for (st of steps; track st.key; let i = $index) {
                <li [class.done]="i <= stepIndex(o.status)" [attr.aria-current]="i === stepIndex(o.status) ? 'step' : null">
                  <span class="dot">@if (i <= stepIndex(o.status)) { <app-icon name="check" [size]="14" [stroke]="3" /> }</span>
                  <span class="lbl">{{ st.label }}</span>
                </li>
              }
            </ol>
            @if (o.shippedAt) {
              <div class="track">
                <app-icon name="truck" [size]="22" />
                <div class="stack" style="gap: 2px">
                  <strong>Colis remis au livreur le {{ o.shippedAt | dateTn }}</strong>
                  @if (o.carrier || o.trackingNumber) {
                    <span class="muted">{{ o.carrier }}@if (o.carrier && o.trackingNumber) { · }@if (o.trackingNumber) { N° <span class="mono">{{ o.trackingNumber }}</span> }</span>
                  }
                </div>
                @if (o.trackingUrl) { <a [href]="o.trackingUrl" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Suivre mon colis ↗</a> }
              </div>
            }
          </div>
        } @else {
          <p class="alert alert-error">Cette commande a été annulée.</p>
        }

        <div class="card">
          <h2 style="font-size: 20px; margin-bottom: 12px">Détail</h2>
          @for (i of o.items; track $index) {
            <div class="sum-row"><span>{{ i.quantity }} × {{ i.productName }}</span><span>{{ i.lineTotal | dt }}</span></div>
          }
          <hr />
          @if (o.discount > 0) { <div class="sum-row muted"><span>Code {{ o.couponCode }}</span><span>-{{ o.discount | dt }}</span></div> }
          <div class="sum-row muted"><span>Livraison</span><span>{{ o.shippingFee | dt }}</span></div>
          <div class="sum-row muted"><span>Timbre fiscal</span><span>{{ o.fiscalStamp | dt }}</span></div>
          <div class="sum-row total"><span>Total</span><span class="price">{{ o.total | dt }}</span></div>
          <p class="muted small" style="margin-top: 12px">Paiement : {{ paymentLabels[o.paymentMethod] }}</p>
        </div>
        <a routerLink="/catalogue" class="btn btn-primary" style="align-self: flex-start">Continuer mes achats</a>
      } @else {
        <div class="card stack" style="max-width: 480px">
          <h1 style="font-size: 26px">Suivre la commande {{ reference() }}</h1>
          <p class="muted">Saisissez le numéro de téléphone utilisé pour la commande.</p>
          <form class="stack" (ngSubmit)="track()">
            <label class="field">Téléphone
              <input class="input" type="tel" name="phone" [(ngModel)]="phone" required />
            </label>
            @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
            <button type="submit" class="btn btn-primary">Afficher ma commande</button>
          </form>
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding-top: 32px; display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
    .done { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .ok-icon { width: 52px; height: 52px; border-radius: 50%; background: var(--green-soft); color: var(--green);
      display: flex; align-items: center; justify-content: center; }
    .sum-row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; font-size: 15px; }
    .total { font-weight: 600; align-items: baseline; }
    hr { border: 0; border-top: 1px solid var(--line); margin: 12px 0; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .steps li { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; font-size: 13px; color: var(--muted); position: relative; }
    .steps li + li::before { content: ''; position: absolute; top: 13px; right: 50%; width: 100%; height: 3px; background: var(--line); z-index: 0; }
    .steps li.done + li.done::before { background: var(--green); }
    .dot { width: 28px; height: 28px; border-radius: 50%; background: var(--line); color: #fff; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
    .done .dot { background: var(--green); }
    .done .lbl { color: var(--ink); font-weight: 600; }
    .track { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-top: 20px; padding: 14px 16px; background: var(--blue-soft); border-radius: 12px; color: var(--blue-dark); }
    .track .stack { flex: 1; color: var(--ink); }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class OrderConfirmationPage {
  private api = inject(ApiService);
  reference = input.required<string>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly paymentLabels = PAYMENT_LABELS;
  // Commande transmise par la page panier via l'état de navigation
  protected order = signal<OrderDetail | null>((history.state?.order as OrderDetail | undefined) ?? null);
  protected error = signal<string | null>(null);
  protected phone = '';
  protected readonly steps = [
    { key: 'PENDING', label: 'Reçue' },
    { key: 'CONFIRMED', label: 'Confirmée' },
    { key: 'SHIPPED', label: 'Expédiée' },
    { key: 'DELIVERED', label: 'Livrée' },
  ];

  protected stepIndex(status: string) {
    return this.steps.findIndex((s) => s.key === status);
  }

  track() {
    this.error.set(null);
    this.api.trackOrder(this.reference(), this.phone).subscribe({
      next: (o) => this.order.set(o),
      error: () => this.error.set('Aucune commande trouvée avec ces informations.'),
    });
  }
}
