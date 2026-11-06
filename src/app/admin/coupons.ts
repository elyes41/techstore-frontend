import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { Coupon, CouponForm } from '../core/models';
import { DateTnPipe, DtPipe } from '../core/pipes';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-coupons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DtPipe, DateTnPipe, Icon],
  template: `
    <div class="head">
      <div class="stack" style="gap: 4px">
        <h1>Codes promo</h1>
        <p class="muted">Les clients saisissent le code dans leur panier. La remise est vérifiée par le serveur.</p>
      </div>
      @if (!editing()) { <button type="button" class="btn btn-primary" (click)="startNew()">+ Nouveau code</button> }
    </div>

    @if (editing()) {
      <form class="card stack" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2 style="font-size: 18px">{{ editId() ? 'Modifier le code' : 'Nouveau code' }}</h2>
        <div class="form-grid">
          <label class="field">Code *
            <input class="input upper" formControlName="code" placeholder="ex. RENTREE2026" maxlength="40" />
          </label>
          <label class="field">Type de remise
            <select class="select" formControlName="type">
              <option value="PERCENT">Pourcentage (%)</option>
              <option value="FIXED">Montant fixe (DT)</option>
            </select>
          </label>
          <label class="field">Valeur * <span class="hint">{{ form.controls.type.value === 'PERCENT' ? 'en %' : 'en DT' }}</span>
            <input class="input" type="number" min="0" step="0.001" formControlName="value" />
          </label>
          <label class="field">Achat minimum (DT)
            <input class="input" type="number" min="0" step="0.001" formControlName="minOrder" />
          </label>
          <label class="field">Utilisations max <span class="hint">(vide = illimité)</span>
            <input class="input" type="number" min="1" step="1" formControlName="maxUses" />
          </label>
          <label class="field">Début
            <input class="input" type="datetime-local" formControlName="startsAt" />
          </label>
          <label class="field">Fin
            <input class="input" type="datetime-local" formControlName="endsAt" />
          </label>
          <label class="check" style="align-self: end"><input type="checkbox" formControlName="active" /> Actif</label>
        </div>
        @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
        <div class="row">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" class="btn btn-outline" (click)="editing.set(false)">Annuler</button>
        </div>
      </form>
    }

    @if (message()) { <p class="alert alert-success" role="status">{{ message() }}</p> }

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Code</th><th>Remise</th><th>Minimum</th><th>Utilisations</th><th>Validité</th><th>Statut</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          @for (c of coupons(); track c.id) {
            <tr>
              <td><strong class="mono">{{ c.code }}</strong></td>
              <td>{{ c.type === 'PERCENT' ? '-' + c.value + ' %' : '-' + (c.value | dt) }}</td>
              <td>{{ c.minOrder > 0 ? (c.minOrder | dt) : '—' }}</td>
              <td>{{ c.usedCount }}{{ c.maxUses ? ' / ' + c.maxUses : '' }}</td>
              <td class="small">
                @if (c.startsAt || c.endsAt) { {{ c.startsAt ? (c.startsAt | dateTn) : '…' }} → {{ c.endsAt ? (c.endsAt | dateTn) : '…' }} } @else { Sans limite }
              </td>
              <td>@if (c.active) { <span class="badge badge-green">Actif</span> } @else { <span class="badge badge-gray">Inactif</span> }</td>
              <td class="num">
                <button type="button" class="icon-btn" [attr.aria-label]="'Modifier ' + c.code" (click)="startEdit(c)"><app-icon name="edit" [size]="18" /></button>
                <button type="button" class="icon-btn danger" [attr.aria-label]="'Supprimer ' + c.code" (click)="remove(c)"><app-icon name="trash" [size]="18" /></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">Aucun code promo.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-end; }
    .upper { text-transform: uppercase; }
    .mono { font-family: ui-monospace, monospace; letter-spacing: .04em; }
    .danger { color: var(--red); }
  `,
})
export class CouponsPage {
  private api = inject(AdminApiService);
  private fb = inject(FormBuilder);
  protected coupons = signal<Coupon[]>([]);
  protected editing = signal(false);
  protected editId = signal<string | null>(null);
  protected error = signal<string | null>(null);
  protected message = signal<string | null>(null);

  protected form = this.fb.group({
    code: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]),
    type: this.fb.nonNullable.control<'PERCENT' | 'FIXED'>('PERCENT'),
    value: this.fb.control<number | null>(10, [Validators.required, Validators.min(0.001)]),
    minOrder: this.fb.control<number | null>(0),
    maxUses: this.fb.control<number | null>(null),
    startsAt: this.fb.control<string | null>(null),
    endsAt: this.fb.control<string | null>(null),
    active: this.fb.nonNullable.control(true),
  });

  constructor() {
    this.load();
  }

  private load() {
    this.api.coupons().subscribe({ next: (list) => this.coupons.set(list), error: (e) => this.error.set(errorMessage(e)) });
  }

  startNew() {
    this.editId.set(null);
    this.form.reset({ code: '', type: 'PERCENT', value: 10, minOrder: 0, maxUses: null, startsAt: null, endsAt: null, active: true });
    this.error.set(null);
    this.editing.set(true);
  }

  startEdit(c: Coupon) {
    this.editId.set(c.id);
    this.form.reset({
      code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxUses: c.maxUses,
      startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt), active: c.active,
    });
    this.error.set(null);
    this.editing.set(true);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Code (lettres, chiffres, - et _) et valeur obligatoires.');
      return;
    }
    const v = this.form.getRawValue();
    const body: CouponForm = {
      code: v.code.trim().toUpperCase(),
      type: v.type,
      value: Number(v.value),
      minOrder: Number(v.minOrder ?? 0),
      maxUses: v.maxUses ? Number(v.maxUses) : null,
      startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      active: v.active,
    };
    const id = this.editId();
    (id ? this.api.updateCoupon(id, body) : this.api.createCoupon(body)).subscribe({
      next: (c) => {
        this.editing.set(false);
        this.message.set(`Code ${c.code} enregistré.`);
        this.load();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  remove(c: Coupon) {
    if (!confirm(`Supprimer le code ${c.code} ?`)) return;
    this.api.deleteCoupon(c.id).subscribe({
      next: () => {
        this.message.set(`Code ${c.code} supprimé.`);
        this.load();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}

/** ISO -> valeur d'un champ datetime-local (heure locale). */
function toLocalInput(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
