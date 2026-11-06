import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth';
import { Review, ReviewPage } from '../core/models';
import { DateTnPipe } from '../core/pipes';
import { Icon } from '../shared/icon';
import { Stars } from '../shared/stars';

/** Avis clients : résumé, répartition des notes, liste paginée et formulaire. */
@Component({
  selector: 'app-product-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Stars, Icon, DateTnPipe],
  template: `
    <section id="avis" class="card reviews">
      <h2>Avis clients</h2>
      @if (page(); as pg) {
        <div class="layout">
          <div class="summary">
            @if (pg.summary.count > 0) {
              <div class="avg">
                <strong>{{ format(pg.summary.average) }}</strong>
                <div class="stack" style="gap: 4px">
                  <app-stars [value]="pg.summary.average" [size]="20" />
                  <span class="muted small">{{ pg.summary.count }} avis</span>
                </div>
              </div>
              <ul class="dist" aria-label="Répartition des notes">
                @for (n of pg.summary.distribution; track $index) {
                  <li>
                    <span class="small">{{ 5 - $index }} étoile{{ 5 - $index > 1 ? 's' : '' }}</span>
                    <span class="bar"><span [style.width.%]="pct(n, pg.summary.count)"></span></span>
                    <span class="small muted num">{{ pct(n, pg.summary.count) }} %</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">Aucun avis pour le moment. Soyez le premier à donner le vôtre !</p>
            }
            <button type="button" class="btn btn-outline btn-block" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">
              {{ showForm() ? 'Fermer' : 'Donner mon avis' }}
            </button>
          </div>

          <div class="list">
            @if (showForm()) {
              <form class="card card-tight stack form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <fieldset class="rate">
                  <legend>Votre note *</legend>
                  <div class="row" style="gap: 4px">
                    @for (n of [1, 2, 3, 4, 5]; track n) {
                      <button type="button" class="star-btn" [class.on]="n <= form.controls.rating.value"
                              (click)="form.controls.rating.setValue(n)" [attr.aria-label]="n + ' sur 5'"
                              [attr.aria-pressed]="form.controls.rating.value === n">
                        <app-icon name="star" [size]="26" />
                      </button>
                    }
                  </div>
                </fieldset>
                <div class="form-grid">
                  <label class="field">Votre prénom *<input class="input" formControlName="authorName" maxlength="80" /></label>
                  <label class="field">N° de commande <span class="hint">(pour le badge « Achat vérifié »)</span>
                    <input class="input" formControlName="orderReference" placeholder="CMD-…" />
                  </label>
                </div>
                <label class="field">Titre<input class="input" formControlName="title" maxlength="120" /></label>
                <label class="field">Votre avis<textarea class="textarea" formControlName="comment" maxlength="2000" rows="4"></textarea></label>
                @if (formError()) { <p class="alert alert-error" role="alert">{{ formError() }}</p> }
                <button type="submit" class="btn btn-primary" [disabled]="sending()">{{ sending() ? 'Envoi…' : 'Publier mon avis' }}</button>
              </form>
            }
            @if (thanks()) { <p class="alert alert-success" role="status">{{ thanks() }}</p> }

            @for (r of items(); track r.id) {
              <article class="review">
                <div class="row" style="gap: 10px">
                  <span class="avatar" aria-hidden="true">{{ r.authorName.charAt(0) }}</span>
                  <strong>{{ r.authorName }}</strong>
                  @if (r.verifiedPurchase) { <span class="badge badge-green"><app-icon name="check" [size]="12" [stroke]="3" /> Achat vérifié</span> }
                </div>
                <div class="row" style="gap: 10px">
                  <app-stars [value]="r.rating" [size]="15" />
                  @if (r.title) { <strong>{{ r.title }}</strong> }
                </div>
                <span class="muted small">{{ r.createdAt | dateTn }}</span>
                @if (r.comment) { <p>{{ r.comment }}</p> }
              </article>
            }
            @if (pg.page + 1 < pg.totalPages) {
              <button type="button" class="btn btn-outline" (click)="loadMore()">Voir plus d'avis</button>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .reviews { display: flex; flex-direction: column; gap: 20px; scroll-margin-top: 140px; }
    .layout { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
    .summary { flex: 1 1 260px; display: flex; flex-direction: column; gap: 16px; }
    .avg { display: flex; gap: 16px; align-items: center; }
    .avg strong { font-family: var(--font-display); font-size: 44px; line-height: 1; }
    .dist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .dist li { display: grid; grid-template-columns: 64px 1fr 40px; gap: 10px; align-items: center; }
    .bar { height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: #f59e0b; border-radius: 999px; }
    .num { text-align: right; }
    .list { flex: 999 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
    .review { display: flex; flex-direction: column; gap: 6px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
    .review p { color: var(--ink-2); white-space: pre-line; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--blue-tint); color: var(--blue-dark);
      display: inline-flex; align-items: center; justify-content: center; font-weight: 700; text-transform: uppercase; }
    .rate { border: 0; padding: 0; margin: 0; }
    .rate legend { font-size: 14px; font-weight: 500; margin-bottom: 6px; padding: 0; }
    .star-btn { border: 0; background: none; cursor: pointer; color: #cbd5e1; padding: 6px; border-radius: 8px; }
    .star-btn.on { color: #f59e0b; }
    .star-btn.on ::ng-deep path { fill: #f59e0b; }
  `,
})
export class ProductReviews implements OnInit {
  private api = inject(ApiService);
  slug = input.required<string>();

  protected page = signal<ReviewPage | null>(null);
  protected items = signal<Review[]>([]);
  protected showForm = signal(false);
  protected sending = signal(false);
  protected formError = signal<string | null>(null);
  protected thanks = signal<string | null>(null);

  protected form = inject(FormBuilder).nonNullable.group({
    rating: [0, [Validators.min(1), Validators.max(5)]],
    authorName: ['', [Validators.required, Validators.maxLength(80)]],
    orderReference: [''],
    title: [''],
    comment: [''],
  });

  ngOnInit() {
    this.load(0);
  }

  private load(n: number) {
    this.api.reviews(this.slug(), n).subscribe({
      next: (pg) => {
        this.page.set(pg);
        this.items.update((list) => (n === 0 ? pg.items : [...list, ...pg.items]));
      },
      error: () => this.page.set({ summary: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] }, items: [], page: 0, totalPages: 0 }),
    });
  }

  loadMore() {
    const pg = this.page();
    if (pg) this.load(pg.page + 1);
  }

  protected pct(n: number, total: number) {
    return total ? Math.round((n / total) * 100) : 0;
  }

  protected format(v: number) {
    return Number(v).toFixed(1).replace('.', ',');
  }

  submit() {
    if (this.form.controls.rating.value < 1) {
      this.formError.set('Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Indiquez votre prénom.');
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.formError.set(null);
    this.api
      .submitReview(this.slug(), {
        rating: v.rating,
        authorName: v.authorName,
        orderReference: v.orderReference || null,
        title: v.title || null,
        comment: v.comment || null,
      })
      .subscribe({
        next: (r) => {
          this.sending.set(false);
          this.showForm.set(false);
          this.form.reset();
          this.thanks.set(r.message);
        },
        error: (e) => {
          this.sending.set(false);
          this.formError.set(errorMessage(e));
        },
      });
  }
}
