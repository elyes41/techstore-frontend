import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { LoginResponse } from './models';

const STORAGE_KEY = 'techstore.admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private session = signal<LoginResponse | null>(readSession());

  readonly user = computed(() => this.session());
  readonly isLoggedIn = computed(() => {
    const s = this.session();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  });

  get token(): string | null {
    return this.isLoggedIn() ? this.session()!.token : null;
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((res) => {
        this.session.set(res);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
        } catch {
          /* stockage indisponible : session en mémoire seulement */
        }
      }),
    );
  }

  logout(redirect = true) {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (redirect) this.router.navigate(['/admin/connexion']);
  }
}

function readSession(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  } catch {
    return null;
  }
}

/** Ajoute le jeton aux appels /api/admin et déconnecte si le serveur répond 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/admin')) return next(req);
  const auth = inject(AuthService);
  const token = auth.token;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) auth.logout();
      return throwError(() => err);
    }),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/admin/connexion']);
};

/** Message lisible à partir d'une erreur HTTP de l'API. */
export function errorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Serveur injoignable. Vérifiez que le backend est démarré.';
    const body = err.error;
    if (body?.message) return body.message;
    if (Array.isArray(body?.violations) && body.violations.length) {
      return body.violations.map((v: { field?: string; message: string }) => v.message).join(' · ');
    }
    if (err.status === 404) return 'API introuvable (404). Vérifiez que le backend à jour est démarré.';
    if (err.status >= 500) return `Erreur serveur (${err.status}). Le backend est-il démarré ? Consultez sa console.`;
  }
  return fallback;
}
