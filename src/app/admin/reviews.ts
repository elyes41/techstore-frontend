import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { AdminReview, PageResult, ReviewStatus } from '../core/models';
import { DateTnPipe } from '../core/pipes';
import { Icon } from '../shared/icon';
import { Stars } from '../shared/stars';

const TABS: { value: ReviewStatus | ''; label: string }[] = [
  { value: 'PENDING', label: 'À modérer' },
  { value: 'APPROVED', label: 'Publiés' },
  { value: 'REJECTED', label: 'Refusés' },
  { value: '', label: 'Tous' },
];

@Component({
  selector: 'app-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DateTnPipe, Stars, Icon],
  template: `
    <h1 style="margin-bottom: 8px">Avis clients</h1>
    <p class="muted" style="margin-bottom: 20px">Les avis apparaissent sur la fiche produit une fois publiés. La note moyenne est recalculée automatiquement.</p>

    <div class="tabs" role="tablist" aria-label="Filtrer les avis">
      @for (t of tabs; track t.value) {
        <button type="button" role="tab" [attr.aria-selected]="status() === t.value" [class.on]="status() === t.value" (click)="setStatus(t.value)">{{ t.label }}</button>
      }
    </div>

    @if (message()) { <p class="alert" [class.alert-error]="message()!.error" [class.alert-success]="!message()!.error" role="status">{{ message()!.text }}</p> }

    @if (result(); as r) {
      @for (rv of r.items; track rv.id) {
        <article class="card review">
          <div class="top">
            <div class="stack" style="gap: 6px">
              <div class="row" style="gap: 10px">
                <app-stars [value]="rv.rating" [size]="16" />
                <strong>{{ rv.title || 'Sans titre' }}</strong>
                @if (rv.verifiedPurchase) { <span class="badge badge-green">Achat vérifié</span> }
                <span class="badge" [class.badge-amber]="rv.status === 'PENDING'" [class.badge-green]="rv.status === 'APPROVED'" [class.badge-red]="rv.status === 'REJECTED'">{{ statusLabel(rv.status) }}</span>
              </div>
              <span class="muted small">{{ rv.authorName }} · {{ rv.createdAt | dateTn }} · sur <a [routerLink]="['/admin/produits', rv.productId]">{{ rv.productName }}</a></span>
            </div>
            <div class="row actions">
              @if (rv.status !== 'APPROVED') { <button type="button" class="btn btn-primary btn-sm" (click)="moderate(rv, 'APPROVED')"><app-icon name="check" [size]="16" /> Publier</button> }
              @if (rv.status !== 'REJECTED') { <button type="button" class="btn btn-outline btn-sm" (click)="moderate(rv, 'REJECTED')">Refuser</button> }
              <button type="button" class="icon-btn danger" [attr.aria-label]="'Supprimer l\\'avis de ' + rv.authorName" (click)="remove(rv)"><app-icon name="trash" [size]="18" /></button>
            </div>
          </div>
          @if (rv.comment) { <p class="comment">{{ rv.comment }}</p> }
        </article>
      } @empty {
        <div class="card empty">Aucun avis dans cette vue.</div>
      }
      @if (r.totalPages > 1) {
        <nav class="pagination" aria-label="Pagination">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page === 0" (click)="load(r.page - 1)">← Précédent</button>
          <span class="muted small">Page {{ r.page + 1 }} / {{ r.totalPages }}</span>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="r.page + 1 >= r.totalPages" (click)="load(r.page + 1)">Suivant →</button>
        </nav>
      }
    } @else {
      <div class="spinner" role="status" aria-label="Chargement"></div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 12px; }
    .tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--line-2); margin-bottom: 8px; }
    .tabs button { min-height: 44px; padding: 0 16px; border: 0; background: none; font: 500 15px var(--font-body); color: var(--muted);
      cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px; }
    .tabs button.on { color: var(--ink); font-weight: 600; border-bottom-color: var(--blue); }
    .review { display: flex; flex-direction: column; gap: 10px; padding: 18px 20px; }
    .top { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-start; }
    .comment { color: var(--ink-2); white-space: pre-line; }
    .danger { color: var(--red); }
  `,
})
export class ReviewsPage {
  private api = inject(AdminApiService);
  protected readonly tabs = TABS;
  protected status = signal<ReviewStatus | ''>('PENDING');
  protected result = signal<PageResult<AdminReview> | null>(null);
  protected message = signal<{ text: string; error: boolean } | null>(null);

  constructor() {
    this.load(0);
  }

  protected statusLabel(s: ReviewStatus) {
    return s === 'PENDING' ? 'En attente' : s === 'APPROVED' ? 'Publié' : 'Refusé';
  }

  setStatus(s: ReviewStatus | '') {
    this.status.set(s);
    this.load(0);
  }

  load(page: number) {
    this.result.set(null);
    this.api.reviews({ status: this.status(), page }).subscribe({
      next: (r) => this.result.set(r),
      error: (e) => {
        this.result.set({ items: [], page: 0, size: 20, total: 0, totalPages: 0 });
        this.message.set({ text: errorMessage(e), error: true });
      },
    });
  }

  moderate(r: AdminReview, status: ReviewStatus) {
    this.api.moderateReview(r.id, status).subscribe({
      next: () => {
        this.message.set({ text: status === 'APPROVED' ? 'Avis publié.' : 'Avis refusé.', error: false });
        this.load(this.result()?.page ?? 0);
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }

  remove(r: AdminReview) {
    if (!confirm(`Supprimer définitivement l'avis de ${r.authorName} ?`)) return;
    this.api.deleteReview(r.id).subscribe({
      next: () => {
        this.message.set({ text: 'Avis supprimé.', error: false });
        this.load(this.result()?.page ?? 0);
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }
}
