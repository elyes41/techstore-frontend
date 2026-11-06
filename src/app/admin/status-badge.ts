import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus, PAYMENT_STATUS_LABELS, PaymentStatus, STATUS_LABELS } from '../core/models';

const ORDER_CLASS: Record<OrderStatus, string> = {
  PENDING: 'badge-amber',
  CONFIRMED: 'badge-blue',
  SHIPPED: 'badge-blue',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
};

const PAY_CLASS: Record<PaymentStatus, string> = {
  UNPAID: 'badge-gray',
  PAID: 'badge-green',
  REFUNDED: 'badge-red',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge ' + cls()">{{ label() }}</span>`,
})
export class StatusBadge {
  status = input<OrderStatus | null>(null);
  payment = input<PaymentStatus | null>(null);

  protected cls = computed(() => {
    const p = this.payment();
    return p ? PAY_CLASS[p] : ORDER_CLASS[this.status() ?? 'PENDING'];
  });
  protected label = computed(() => {
    const p = this.payment();
    return p ? PAYMENT_STATUS_LABELS[p] : STATUS_LABELS[this.status() ?? 'PENDING'];
  });
}
