import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';

import { CycleService } from '../../core/services/cycle.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-cycles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatMenuModule, EmptyStateComponent, FechaCortaPipe],
  template: `
    <section class="page">
      <div class="row-space">
        <h2 class="page-title">Ciclos de nómina</h2>
        <a mat-flat-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Nuevo
        </a>
      </div>

      @if (cycles.ciclos().length === 0) {
        <app-empty-state
          icon="event"
          title="Aún no hay ciclos"
          subtitle="Crea el primer ciclo con la fecha de tu último pago."
          ctaLabel="Crear ciclo"
          ctaLink="new">
        </app-empty-state>
      } @else {
        <div class="list">
          @for (c of cycles.ciclos(); track c.id) {
            <mat-card class="ciclo">
              <mat-card-content>
                <div class="row-space">
                  <div>
                    <div class="row">
                      <strong>{{ c.fechaPago | fechaCorta }}</strong>
                      @if (c.id === cycles.cicloActivoId()) {
                        <span class="chip semaforo-verde">Activo</span>
                      }
                      @if (c.estado === 'Cerrado') {
                        <span class="chip muted-chip">Cerrado</span>
                      }
                    </div>
                    <div class="muted small">ID {{ c.id }}</div>
                  </div>
                  <button mat-icon-button [matMenuTriggerFor]="m" aria-label="Acciones">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #m="matMenu">
                    @if (c.id !== cycles.cicloActivoId()) {
                      <button mat-menu-item (click)="cycles.marcarActivo(c.id)">
                        <mat-icon>check_circle</mat-icon> Marcar como activo
                      </button>
                    }
                    @if (c.estado === 'Abierto') {
                      <button mat-menu-item (click)="cycles.cerrarCiclo(c.id)">
                        <mat-icon>lock</mat-icon> Cerrar ciclo
                      </button>
                    }
                    <a mat-menu-item [routerLink]="[c.id, 'edit']">
                      <mat-icon>edit</mat-icon> Editar
                    </a>
                    <button mat-menu-item (click)="confirmDelete(c.id)">
                      <mat-icon>delete</mat-icon> Eliminar
                    </button>
                  </mat-menu>
                </div>
                @if (c.notas) { <p class="notas">{{ c.notas }}</p> }
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .list { display: flex; flex-direction: column; gap: 8px; }
    .ciclo { border-radius: 12px !important; }
    .small { font-size: 12px; }
    .muted-chip { background: var(--border); color: var(--muted); padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .notas { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
  `]
})
export class CyclesListComponent {
  protected cycles = inject(CycleService);

  async confirmDelete(id: string) {
    if (confirm('¿Eliminar este ciclo? Esto NO borra los ingresos/gastos asociados.')) {
      await this.cycles.eliminar(id);
    }
  }
}
