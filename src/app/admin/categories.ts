import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { Category } from '../core/models';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <h1 style="margin-bottom: 20px">Catégories</h1>

    <form class="card add" (ngSubmit)="create()">
      <label class="field grow">Nouvelle catégorie
        <input class="input" name="name" [(ngModel)]="newName" placeholder="Ex. Montres connectées" required maxlength="120" />
      </label>
      <button type="submit" class="btn btn-primary" [disabled]="!newName.trim()">Ajouter</button>
    </form>

    @if (message()) { <p class="alert" [class.alert-error]="message()!.error" [class.alert-success]="!message()!.error" role="status">{{ message()!.text }}</p> }

    <div class="table-wrap">
      <table class="table" style="min-width: 520px">
        <thead><tr><th>Nom</th><th>Adresse (slug)</th><th class="num">Produits</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          @for (c of categories(); track c.id) {
            <tr>
              <td>
                @if (editingId() === c.id) {
                  <form class="row" (ngSubmit)="rename(c)">
                    <label class="sr-only" [for]="'rename-' + c.id">Nouveau nom</label>
                    <input class="input" [id]="'rename-' + c.id" name="rename" [(ngModel)]="editName" style="max-width: 260px" />
                    <button type="submit" class="btn btn-primary btn-sm">OK</button>
                    <button type="button" class="btn btn-outline btn-sm" (click)="editingId.set(null)">Annuler</button>
                  </form>
                } @else {
                  <strong>{{ c.name }}</strong>
                }
              </td>
              <td class="muted">/catalogue/{{ c.slug }}</td>
              <td class="num"><a routerLink="/admin/produits" [queryParams]="{ categoryId: c.id }">{{ c.productCount }}</a></td>
              <td class="num">
                <button type="button" class="icon-btn" [attr.aria-label]="'Renommer ' + c.name" (click)="startEdit(c)"><app-icon name="edit" [size]="18" /></button>
                <button type="button" class="icon-btn danger" [attr.aria-label]="'Supprimer ' + c.name" (click)="remove(c)"><app-icon name="trash" [size]="18" /></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="empty">Aucune catégorie. Créez-en une ci-dessus.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .add { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 20px; padding: 20px; }
    .grow { flex: 1 1 260px; }
    .danger { color: var(--red); }
    .alert { margin-bottom: 16px; }
  `,
})
export class CategoriesPage {
  private api = inject(AdminApiService);
  protected categories = signal<Category[]>([]);
  protected message = signal<{ text: string; error: boolean } | null>(null);
  protected editingId = signal<string | null>(null);
  protected newName = '';
  protected editName = '';

  constructor() {
    this.load();
  }

  private load() {
    this.api.categories().subscribe({
      next: (list) => this.categories.set(list),
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }

  create() {
    const name = this.newName.trim();
    if (!name) return;
    this.api.createCategory(name).subscribe({
      next: (c) => {
        this.newName = '';
        this.message.set({ text: `Catégorie « ${c.name} » créée.`, error: false });
        this.load();
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }

  startEdit(c: Category) {
    this.editName = c.name;
    this.editingId.set(c.id);
  }

  rename(c: Category) {
    const name = this.editName.trim();
    if (!name) return;
    this.api.renameCategory(c.id, name).subscribe({
      next: () => {
        this.editingId.set(null);
        this.message.set({ text: 'Catégorie renommée.', error: false });
        this.load();
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }

  remove(c: Category) {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ?`)) return;
    this.api.deleteCategory(c.id).subscribe({
      next: () => {
        this.message.set({ text: `Catégorie « ${c.name} » supprimée.`, error: false });
        this.load();
      },
      error: (e) => this.message.set({ text: errorMessage(e), error: true }),
    });
  }
}
