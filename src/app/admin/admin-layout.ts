import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="shell">
      <aside class="side" [class.open]="menuOpen()">
        <div class="side-head">
          <a routerLink="/admin" class="logo">Tech<span>Store</span> <small>admin</small></a>
          <button type="button" class="icon-btn menu-btn" aria-label="Menu" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())">
            <app-icon [name]="menuOpen() ? 'close' : 'menu'" />
          </button>
        </div>
        <nav class="nav" aria-label="Administration" (click)="menuOpen.set(false)">
          <a routerLink="/admin" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }"><app-icon name="dashboard" /> Tableau de bord</a>
          <a routerLink="/admin/produits" routerLinkActive="on"><app-icon name="box" /> Produits</a>
          <a routerLink="/admin/categories" routerLinkActive="on"><app-icon name="tag" /> Catégories</a>
          <a routerLink="/admin/commandes" routerLinkActive="on"><app-icon name="receipt" /> Commandes</a>
          <a routerLink="/admin/avis" routerLinkActive="on"><app-icon name="star" /> Avis clients</a>
          <a routerLink="/admin/codes-promo" routerLinkActive="on"><app-icon name="gift" /> Codes promo</a>
          <hr />
          <a routerLink="/" target="_blank"><app-icon name="store" /> Voir la boutique</a>
          <button type="button" (click)="auth.logout()"><app-icon name="logout" /> Déconnexion</button>
        </nav>
        <p class="who">{{ auth.user()?.fullName || auth.user()?.email }}</p>
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell { display: flex; flex-wrap: wrap; min-height: 100vh; }
    .side { flex: 1 1 240px; max-width: 260px; background: var(--navy); color: #cbd5e1; padding: 20px 14px;
      display: flex; flex-direction: column; gap: 20px; }
    .side-head { display: flex; align-items: center; justify-content: space-between; padding: 0 8px; }
    .logo { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: #fff; text-decoration: none; }
    .logo span { color: #60a5fa; }
    .logo small { font: 500 12px var(--font-body); color: #94a3b8; margin-left: 4px; }
    .menu-btn { display: none; color: #fff; }
    .nav { display: flex; flex-direction: column; gap: 4px; }
    .nav a, .nav button { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 10px; color: #cbd5e1;
      text-decoration: none; font: 500 15px var(--font-body); background: none; border: 0; cursor: pointer; text-align: left; }
    .nav a:hover, .nav button:hover { background: #1e293b; color: #fff; }
    .nav a.on { background: var(--blue); color: #fff; }
    .nav hr { border: 0; border-top: 1px solid #1e293b; margin: 8px 0; width: 100%; }
    .who { margin-top: auto; padding: 0 12px; font-size: 13px; color: #94a3b8; word-break: break-all; }
    .content { flex: 999 1 600px; min-width: 0; padding: 28px clamp(16px, 3vw, 40px); }
    @media (max-width: 860px) {
      .side { max-width: none; flex-basis: 100%; padding: 12px 14px; gap: 12px; }
      .menu-btn { display: inline-flex; }
      .nav, .who { display: none; }
      .side.open .nav { display: flex; }
    }
  `,
})
export class AdminLayout {
  protected auth = inject(AuthService);
  protected menuOpen = signal(false);
}
