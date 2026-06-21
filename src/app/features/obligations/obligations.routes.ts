import { Routes } from '@angular/router';

export const OBLIGATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./obligations-list.component').then(m => m.ObligationsListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./obligation-form.component').then(m => m.ObligationFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./obligation-form.component').then(m => m.ObligationFormComponent),
  },
];
