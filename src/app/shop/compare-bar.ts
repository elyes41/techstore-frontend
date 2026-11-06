import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { CompareService } from '../core/stores';
import { Icon } from '../shared/icon';

/** Barre flottante du comparateur, visible dès qu'un produit y est ajouté. */
@Component({
  selector: 'app-compare-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    @if (compare.count() > 0 && !onComparePage()) {
      <div class="spacer-bar" aria-hidden="true"></div>
      <aside class="bar" aria-label="Comparateur">
        <div class="items">
          @for (p of compare.items(); track p.id) {
            <span class="item">
              <span class="name">{{ p.name }}</span>
              <button type="button" class="icon-btn" [attr.aria-label]="'Retirer ' + p.name" (click)="compare.remove(p.id)"><app-icon name="close" [size]="14" /></button>
            </span>
          }
        </div>
        <div class="row" style="gap: 8px">
          <button type="button" class="btn btn-outline btn-sm" (click)="compare.clear()">Vider</button>
          <a routerLink="/comparer" class="btn btn-primary btn-sm" [class.disabled]="compare.count() < 2">
            Comparer ({{ compare.count() }})
          </a>
        </div>
      </aside>
    }
  `,
  styles: `
    .spacer-bar { height: 80px; }
    .bar { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 30; width: min(960px, calc(100% - 32px));
      background: var(--navy); color: #fff; border-radius: 14px; padding: 10px 12px; display: flex; flex-wrap: wrap; gap: 10px;
      align-items: center; justify-content: space-between; box-shadow: 0 12px 32px rgba(15,23,42,.35); }
    .items { display: flex; gap: 8px; flex-wrap: wrap; min-width: 0; }
    .item { display: inline-flex; align-items: center; gap: 2px; background: #1e293b; border-radius: 8px; padding-left: 10px; font-size: 13px; max-width: 220px; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item .icon-btn { width: 32px; height: 32px; color: #cbd5e1; }
    .btn-outline { background: transparent; color: #fff; border-color: #475569; }
    .btn-outline:hover { color: #fff; border-color: #fff; }
    .disabled { opacity: .5; pointer-events: none; }
  `,
})
export class CompareBar {
  protected compare = inject(CompareService);
  private router = inject(Router);
  // Masquée sur la page du comparateur elle-même
  protected onComparePage = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/comparer')),
      startWith(this.router.url.startsWith('/comparer')),
    ),
    { initialValue: false },
  );
}
