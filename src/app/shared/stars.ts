import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Étoiles de notation (lecture seule), avec demi-étoile. */
@Component({
  selector: 'app-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="stars" role="img" [attr.aria-label]="label()">
      @for (f of fills(); track $index) {
        <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient [attr.id]="gid + $index">
              <stop [attr.offset]="f + '%'" stop-color="#f59e0b" />
              <stop [attr.offset]="f + '%'" stop-color="#cbd5e1" />
            </linearGradient>
          </defs>
          <path [attr.fill]="'url(#' + gid + $index + ')'"
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
        </svg>
      }
    </span>
    @if (count() !== null) {
      <span class="count">{{ count() }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 6px; }
    .stars { display: inline-flex; gap: 1px; }
    .count { font-size: 13px; color: var(--muted); }
  `,
})
export class Stars {
  private static seq = 0;
  protected gid = `st${++Stars.seq}-`;
  value = input(0);
  count = input<number | null>(null);
  size = input(16);

  protected fills = computed(() =>
    [0, 1, 2, 3, 4].map((i) => Math.round(Math.max(0, Math.min(1, this.value() - i)) * 100)),
  );
  protected label = computed(() => `Note : ${this.value().toFixed(1).replace('.', ',')} sur 5`);
}
