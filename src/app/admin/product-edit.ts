import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { ProductDetail, ProductForm } from '../core/models';
import { Icon } from '../shared/icon';

type SpecGroup = FormGroup<{ key: FormControl<string>; value: FormControl<string> }>;

@Component({
  selector: 'app-product-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon],
  template: `
    <a routerLink="/admin/produits" class="back"><app-icon name="arrowLeft" [size]="18" /> Produits</a>
    <div class="page-head">
      <h1>{{ isNew() ? 'Nouveau produit' : 'Modifier le produit' }}</h1>
      @if (existing(); as p) {
        @if (p.active) { <a [href]="'/produit/' + p.slug" target="_blank" class="btn btn-outline btn-sm">Voir en boutique ↗</a> }
      }
    </div>

    @if (loadError()) {
      <p class="alert alert-error">{{ loadError() }}</p>
    } @else {
      <form class="layout" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="col-main">
          <section class="card stack">
            <h2 class="sec">Informations</h2>
            <label class="field">Nom du produit *
              <input class="input" formControlName="name" maxlength="200" />
              @if (form.controls.name.touched && form.controls.name.invalid) { <span class="error-text">Le nom est obligatoire</span> }
            </label>
            <div class="form-grid">
              <label class="field">Marque
                <input class="input" formControlName="brand" />
              </label>
              <label class="field">Référence (SKU)
                <input class="input" formControlName="sku" />
              </label>
              <label class="field">Catégorie
                <select class="select" formControlName="categoryId">
                  <option [ngValue]="null">— Aucune —</option>
                  @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                </select>
              </label>
            </div>
            <label class="field">Description
              <textarea class="textarea" formControlName="description" rows="6"></textarea>
            </label>
          </section>

          <section class="card stack">
            <h2 class="sec">Photos</h2>
            <p class="muted small">La première photo est l'image principale. JPEG, PNG ou WebP, 5 Mo maximum.</p>
            <div class="images">
              @for (url of images(); track url; let i = $index) {
                <figure class="img-item" [class.main]="i === 0">
                  <img [src]="url" [alt]="'Photo ' + (i + 1)" />
                  <div class="img-actions">
                    @if (i > 0) { <button type="button" class="btn btn-outline btn-sm" (click)="makeMain(i)">Principale</button> }
                    <button type="button" class="icon-btn" aria-label="Retirer la photo" (click)="removeImage(i)"><app-icon name="trash" [size]="16" /></button>
                  </div>
                </figure>
              }
              <label class="upload" [class.busy]="uploading()">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="sr-only" (change)="upload($event)" [disabled]="uploading()" />
                <app-icon name="upload" [size]="24" />
                <span>{{ uploading() ? 'Envoi…' : 'Ajouter des photos' }}</span>
              </label>
            </div>
          </section>

          <section class="card stack">
            <div class="row"><h2 class="sec">Caractéristiques</h2><span class="spacer"></span>
              <button type="button" class="btn btn-outline btn-sm" (click)="addSpec()">+ Ajouter</button></div>
            <p class="muted small">Ex. RAM → 8 Go, Stockage → 256 Go, Écran → 6,7".</p>
            <div formArrayName="specs" class="stack" style="gap: 10px">
              @for (s of specs.controls; track s; let i = $index) {
                <div class="spec" [formGroupName]="i">
                  <label class="sr-only" [for]="'sk' + i">Nom</label>
                  <input class="input" [id]="'sk' + i" formControlName="key" placeholder="Nom (ex. RAM)" />
                  <label class="sr-only" [for]="'sv' + i">Valeur</label>
                  <input class="input" [id]="'sv' + i" formControlName="value" placeholder="Valeur (ex. 8 Go)" />
                  <button type="button" class="icon-btn" aria-label="Supprimer la caractéristique" (click)="specs.removeAt(i)"><app-icon name="trash" [size]="16" /></button>
                </div>
              }
            </div>
          </section>
        </div>

        <aside class="col-side">
          <section class="card stack">
            <h2 class="sec">Prix et stock</h2>
            <label class="field">Prix de vente (DT) *
              <input class="input" type="number" min="0" step="0.001" formControlName="price" />
              @if (form.controls.price.touched && form.controls.price.invalid) { <span class="error-text">Prix obligatoire</span> }
            </label>
            <label class="field">Ancien prix (DT) <span class="hint">pour afficher une promo</span>
              <input class="input" type="number" min="0" step="0.001" formControlName="oldPrice" />
            </label>
            <label class="field">Quantité en stock *
              <input class="input" type="number" min="0" step="1" formControlName="stock" />
            </label>
          </section>
          <section class="card stack">
            <h2 class="sec">Visibilité</h2>
            <label class="check"><input type="checkbox" formControlName="active" /> Visible en boutique</label>
            <label class="check"><input type="checkbox" formControlName="featured" /> Produit phare (page d'accueil)</label>
          </section>
          @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="saving()">
            {{ saving() ? 'Enregistrement…' : (isNew() ? 'Créer le produit' : 'Enregistrer') }}
          </button>
        </aside>
      </form>
    }
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 500; margin-bottom: 8px; }
    .page-head { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .layout { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    .col-main { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
    .col-side { flex: 1 1 280px; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 20px; }
    .sec { font-size: 18px; }
    .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
    .img-item { margin: 0; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; }
    .img-item.main { border: 2px solid var(--blue); }
    .img-item img { aspect-ratio: 1; object-fit: contain; width: 100%; padding: 8px; }
    .img-actions { display: flex; justify-content: space-between; align-items: center; padding: 4px; border-top: 1px solid var(--line); background: #fff; }
    .upload { aspect-ratio: 1; border: 2px dashed var(--line-2); border-radius: 12px; display: flex; flex-direction: column; gap: 8px;
      align-items: center; justify-content: center; color: var(--muted); cursor: pointer; font-size: 14px; text-align: center; padding: 8px; }
    .upload:hover, .upload:focus-within { border-color: var(--blue); color: var(--blue); }
    .upload.busy { opacity: .6; cursor: wait; }
    .spec { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 44px; gap: 8px; }
  `,
})
export class ProductEditPage implements OnInit {
  private api = inject(AdminApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  /** Paramètre de route ; absent pour « nouveau ». */
  id = input<string | undefined>();

  protected categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  protected existing = signal<ProductDetail | null>(null);
  protected images = signal<string[]>([]);
  protected saving = signal(false);
  protected uploading = signal(false);
  protected error = signal<string | null>(null);
  protected loadError = signal<string | null>(null);

  protected form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    brand: this.fb.control<string | null>(null),
    sku: this.fb.control<string | null>(null),
    categoryId: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    oldPrice: this.fb.control<number | null>(null, [Validators.min(0)]),
    stock: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    active: this.fb.nonNullable.control(true),
    featured: this.fb.nonNullable.control(false),
    specs: this.fb.array<SpecGroup>([]),
  });

  get specs(): FormArray<SpecGroup> {
    return this.form.controls.specs;
  }

  protected isNew = () => !this.id();

  ngOnInit() {
    const id = this.id();
    if (!id) return;
    this.api.product(id).subscribe({
      next: (p) => {
        this.existing.set(p);
        this.images.set([...p.images]);
        this.form.patchValue({
          name: p.name, brand: p.brand, sku: p.sku, categoryId: p.categoryId, description: p.description,
          price: p.price, oldPrice: p.oldPrice, stock: p.stock, active: p.active, featured: p.featured,
        });
        Object.entries(p.specs).forEach(([k, v]) => this.form.controls.specs.push(this.specGroup(k, v)));
      },
      error: (e) => this.loadError.set(e?.status === 404 ? 'Produit introuvable.' : errorMessage(e)),
    });
  }

  private specGroup(key = '', value = ''): SpecGroup {
    return this.fb.nonNullable.group({ key: [key], value: [value] });
  }

  addSpec() {
    this.form.controls.specs.push(this.specGroup());
  }

  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.uploading.set(true);
    this.error.set(null);
    let pending = files.length;
    for (const file of files) {
      this.api.uploadImage(file).subscribe({
        next: (r) => this.images.update((list) => [...list, r.url]),
        error: (e) => this.error.set(`${file.name} : ${errorMessage(e, "échec de l'envoi")}`),
        complete: () => {
          if (--pending === 0) this.uploading.set(false);
        },
      });
    }
  }

  makeMain(i: number) {
    this.images.update((list) => [list[i], ...list.filter((_, j) => j !== i)]);
  }

  removeImage(i: number) {
    this.images.update((list) => list.filter((_, j) => j !== i));
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Vérifiez les champs obligatoires.');
      return;
    }
    const v = this.form.getRawValue();
    const specs: Record<string, string> = {};
    for (const s of v.specs) {
      if (s.key.trim() && s.value.trim()) specs[s.key.trim()] = s.value.trim();
    }
    const body: ProductForm = {
      name: v.name,
      brand: v.brand || null,
      sku: v.sku || null,
      categoryId: v.categoryId ?? null,
      description: v.description || null,
      price: Number(v.price),
      oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
      stock: Number(v.stock),
      active: v.active,
      featured: v.featured,
      images: this.images(),
      specs,
    };
    this.saving.set(true);
    this.error.set(null);
    const id = this.id();
    const req = id ? this.api.updateProduct(id, body) : this.api.createProduct(body);
    req.subscribe({
      next: () => this.router.navigate(['/admin/produits']),
      error: (e) => {
        this.saving.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
