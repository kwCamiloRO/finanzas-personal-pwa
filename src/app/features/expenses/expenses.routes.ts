import { Routes } from '@angular/router';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./expenses-list.component').then(m => m.ExpensesListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./expense-form.component').then(m => m.ExpenseFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./expense-form.component').then(m => m.ExpenseFormComponent),
  },
];
