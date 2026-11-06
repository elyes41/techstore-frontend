import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container empty">
      <h1>Page introuvable</h1>
      <p style="margin: 12px 0 20px">La page demandée n'existe pas.</p>
      <a routerLink="/" class="btn btn-primary">Retour à l'accueil</a>
    </div>
  `,
})
export class NotFoundPage {}
