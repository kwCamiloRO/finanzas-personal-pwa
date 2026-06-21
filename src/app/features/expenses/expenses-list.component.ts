import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';

import { ExpenseService } from '../../core/services/expense.service';
import { CycleService } from '../../core/services/cycle.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatMenuModule,
    EmptyStateComponent, CopPipe, FechaCortaPipe,
  ],
  template: `
    <section class="page">
      <div class="row-space">
        <h2 class="page-title">Gastos del ciclo</h2>
        <a mat-flat-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Nuevo
        </a>
      </div>

      @if (gastos().length === 0) {
        <app-empty-state
          icon="shopping_cart"
          title="Sin gastos en este ciclo"
          subtitle="Registra el primero — toma menos de 3 segundos."
          ctaLabel="Registrar gasto"
          ctaLink="new">
        </app-empty-state>
      } @else {
        <div class="total">
          <span class="muted">Total ciclo</span>
          <strong>{{ total() | cop }}</strong>
        </div>
        <div class="list">
          @for (g of gastos(); track g.id) {
            <mat-card>
              <mat-card-content>
                <div class="row-space">
                  <div>
                    <div class="row">
                      <strong>{{ g.categoria }}</strong>
                    </div>
                    <div class="muted small">{{ g.fecha | fechaCorta }}</div>
                    @if (g.comentario) { <div class="small">{{ g.comentario }}</div> }
                  </div>
                  <div class="amount">
                    {{ g.valor | cop }}
                    <button mat-icon-button [matMenuTriggerFor]="m">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #m="matMenu">
                      <a mat-menu-item [routerLink]="[g.id, 'edit']">
                        <mat-icon>edit</mat-icon> Editar
                      </a>
                      <button mat-menu-item (click)="confirmDelete(g.id)">
                        <mat-icon>delete</mat-icon> Eliminar
                      </button>
                    </mat-menu>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <a mat-fab extended color="accent" routerLink="new" class="fab-bottom">
        <mat-icon>add</mat-icon> Gasto rápido
      </a>
    </section>
  `,
  styles: [`
    .list { display: flex; flex-direction: column; gap: 8px; }
    .small { font-size: 12px; }
    .amount { font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 4px; }
    .total {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px;
    }
    .total strong { font-size: 18px; }
  `]
})
export class ExpensesListComponent {
  protected expense = inject(ExpenseService);
  protected cycles = inject(CycleService);

  protected gastos = computed(() => {
    const ca = this.cycles.cicloActivoId();
    if (!ca) return this.expense.gastos();
    return this.expense.gastos().filter(g => g.cicloId === ca);
  });

  protected total = computed(() => this.gastos().reduce((acc, g) => acc + g.valor, 0));

  async confirmDelete(id: string) {
    if (confirm('¿Eliminar este gasto?')) {
      await this.expense.eliminar(id);
    }
  }
}
