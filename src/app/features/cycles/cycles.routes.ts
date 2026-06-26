import { Routes } from '@angular/router';

export const CYCLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cycles-list.component').then(m => m.CyclesListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./cycle-form.component').then(m => m.CycleFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./cycle-form.component').then(m => m.CycleFormComponent),
  },
  {
    path: ':id/comparativa',
    loadComponent: () =>
      import('../comparativa/comparativa.component').then(m => m.ComparativaComponent),
  },
];
