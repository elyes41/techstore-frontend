import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import { ProductSummary } from '../core/models';
import { Icon } from './icon';
import { ProductCard } from './product-card';

/** Rangée horizontale de produits défilante (style Amazon), avec flèches sur grand écran. */
@Component({
  selector: 'app-product-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductCard, Icon],
  template: `
    @if (products().length) {
      <section class="carousel" [attr.aria-label]="title()">
        <div class="head">
          <div class="stack" style="gap: 2px">
            <h2>{{ title() }}</h2>
            @if (subtitle()) { <p class="muted small">{{ subtitle() }}</p> }
          </div>
          <div class="arrows">
            <button type="button" class="btn btn-outline btn-sm" aria-label="Précédents" (click)="scroll(-1)"><app-icon name="arrowLeft" [size]="16" /></button>
            <button type="button" class="btn btn-outline btn-sm flip" aria-label="Suivants" (click)="scroll(1)"><app-icon name="arrowLeft" [size]="16" /></button>
          </div>
        </div>
        <div class="track" #track>
          @for (p of products(); track p.id) {
            <div class="slot"><app-product-card [product]="p" /></div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .carousel { display: flex; flex-direction: column; gap: 14px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
    .arrows { display: flex; gap: 6px; }
    .flip app-icon { transform: rotate(180deg); }
    .track { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 260px); gap: 16px;
      overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; scrollbar-width: thin; }
    .slot { scroll-snap-align: start; }
    @media (max-width: 640px) { .arrows { display: none; } .track { grid-auto-columns: 72%; } }
  `,
})
export class ProductCarousel {
  title = input.required<string>();
  subtitle = input<string | null>(null);
  products = input<ProductSummary[]>([]);
  private track = viewChild<ElementRef<HTMLElement>>('track');

  scroll(dir: number) {
    const el = this.track()?.nativeElement;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }
}
