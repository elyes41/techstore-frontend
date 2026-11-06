import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { finalize, timeout } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, errorMessage } from '../core/auth';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="wrap">
      <form class="card box" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <a routerLink="/" class="logo">Tech<span>Store</span></a>
        <div class="stack" style="gap: 4px">
          <h1>Administration</h1>
          <p class="muted">Connectez-vous pour gérer la boutique.</p>
        </div>
        <label class="field">E-mail
          <input class="input" type="email" name="email" formControlName="email" autocomplete="username" />
          @if (showError('email')) { <small class="field-error">Saisissez une adresse e-mail valide.</small> }
        </label>
        <label class="field">Mot de passe
          <input class="input" type="password" name="password" formControlName="password" autocomplete="current-password" />
          @if (showError('password')) { <small class="field-error">Saisissez le mot de passe.</small> }
        </label>
        @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; background: var(--navy); }
    .box { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 18px; padding: 32px; }
    .logo { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--ink); text-decoration: none; }
    .logo span { color: var(--blue); }
    h1 { font-size: 26px; }
    .field-error { color: var(--red); font-size: 13px; font-weight: 500; }
    button { position: relative; z-index: 1; }
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.auth.isLoggedIn()) this.router.navigate(['/admin']);
  }

  protected showError(name: 'email' | 'password') {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  private submitted = signal(false);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  submit() {
    if (this.loading()) return;
    this.submitted.set(true);
    // Les gestionnaires de mots de passe / l'autoremplissage du navigateur ne déclenchent pas toujours
    // l'événement « input » : on relit les champs directement avant de valider.
    const read = (n: string) => (this.host.nativeElement.querySelector(`input[name=${n}]`) as HTMLInputElement | null)?.value ?? '';
    this.form.setValue({ email: read('email').trim(), password: read('password') });
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Vérifiez l’e-mail et le mot de passe.');
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .login(email, password)
      .pipe(
        timeout(15000),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () =>
          this.router.navigate(['/admin']).then((ok) => {
            if (!ok) this.error.set('Connecté, mais impossible d’ouvrir le tableau de bord. Rechargez la page.');
          }),
        error: (err) =>
          this.error.set(
            err?.name === 'TimeoutError'
              ? 'Le serveur ne répond pas. Vérifiez que le backend (port 8080) est démarré.'
              : errorMessage(err, 'Connexion impossible'),
          ),
      });
  }
}
