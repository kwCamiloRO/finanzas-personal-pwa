import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'start',
    loadComponent: () =>
      import('./features/onboarding/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'cycles',
    loadChildren: () =>
      import('./features/cycles/cycles.routes').then(m => m.CYCLES_ROUTES),
  },
  {
    path: 'incomes',
    loadChildren: () =>
      import('./features/incomes/incomes.routes').then(m => m.INCOMES_ROUTES),
  },
  {
    path: 'expenses',
    loadChildren: () =>
      import('./features/expenses/expenses.routes').then(m => m.EXPENSES_ROUTES),
  },
  {
    path: 'obligations',
    loadChildren: () =>
      import('./features/obligations/obligations.routes').then(m => m.OBLIGATIONS_ROUTES),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
