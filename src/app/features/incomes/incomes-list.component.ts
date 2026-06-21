import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';

import { IncomeService } from '../../core/services/income.service';
import { CycleService } from '../../core/services/cycle.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-incomes-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatMenuModule,
    EmptyStateComponent, CopPipe, FechaCortaPipe,
  ],
  template: `
    <section class="page">
      <div class="row-space">
        <h2 class="page-title">Ingresos</h2>
        <a mat-flat-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Nuevo
        </a>
      </div>

      @if (income.ingresos().length === 0) {
        <app-empty-state
          icon="payments"
          title="Sin ingresos registrados"
          subtitle="Registra tu primer ingreso (salario, prima, otros)."
          ctaLabel="Agregar ingreso"
          ctaLink="new">
        </app-empty-state>
      } @else {
        <div class="list">
          @for (i of income.ingresos(); track i.id) {
            <mat-card>
              <mat-card-content>
                <div class="row-space">
                  <div>
                    <div class="row">
                      <strong>{{ i.tipo }}</strong>
                      <span class="chip" [class]="estadoClass(i.estado)">{{ i.estado }}</span>
                    </div>
                    <div class="muted small">{{ i.fecha | fechaCorta }} · {{ i.cicloId }}</div>
                    @if (i.observaciones) { <div class="small">{{ i.observaciones }}</div> }
                  </div>
                  <div class="amount">
                    {{ i.valor | cop }}
                    <button mat-icon-button [matMenuTriggerFor]="m">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #m="matMenu">
                      <a mat-menu-item [routerLink]="[i.id, 'edit']">
                        <mat-icon>edit</mat-icon> Editar
                      </a>
                      <button mat-menu-item (click)="confirmDelete(i.id)">
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
    </section>
  `,
  styles: [`
    .list { display: flex; flex-direction: column; gap: 8px; }
    .small { font-size: 12px; }
    .amount { font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 4px; }
  `]
})
export class IncomesListComponent {
  protected income = inject(IncomeService);
  protected cycles = inject(CycleService);

  estadoClass(estado: string): string {
    return ({
      Recibido: 'semaforo-verde',
      Confirmado: 'semaforo-amarillo',
      Esperado: 'semaforo-amarillo',
      Cancelado: 'semaforo-rojo',
    } as Record<string, string>)[estado] ?? '';
  }

  async confirmDelete(id: string) {
    if (confirm('¿Eliminar este ingreso?')) {
      await this.income.eliminar(id);
    }
  }
}
