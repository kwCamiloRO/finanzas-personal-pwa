import { Routes } from '@angular/router';

export const INCOMES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./incomes-list.component').then(m => m.IncomesListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./income-form.component').then(m => m.IncomeFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./income-form.component').then(m => m.IncomeFormComponent),
  },
];
