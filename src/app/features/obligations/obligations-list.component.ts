import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';

import { ObligationService } from '../../core/services/obligation.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { PRIORIDAD_LABELS } from '../../core/domain';

@Component({
  selector: 'app-obligations-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatMenuModule,
    EmptyStateComponent, CopPipe,
  ],
  template: `
    <section class="page">
      <div class="row-space">
        <h2 class="page-title">Obligaciones</h2>
        <a mat-flat-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Nueva
        </a>
      </div>

      @if (obs.obligaciones().length === 0) {
        <app-empty-state
          icon="receipt_long"
          title="Sin obligaciones"
          subtitle="Agrega arriendo, servicios, créditos y tarjetas."
          ctaLabel="Agregar obligación"
          ctaLink="new">
        </app-empty-state>
      } @else {
        <div class="list">
          @for (o of obs.obligaciones(); track o.id) {
            <mat-card [class.inactiva]="!o.activa">
              <mat-card-content>
                <div class="row-space">
                  <div>
                    <div class="row">
                      <strong>{{ o.nombre }}</strong>
                      <span class="chip prio-{{ o.prioridad }}">{{ o.prioridad }} · {{ priLabel(o.prioridad) }}</span>
                      @if (o.recurrente) { <span class="chip muted-chip">Recurrente</span> }
                      @if (!o.activa) { <span class="chip muted-chip">Inactiva</span> }
                    </div>
                    <div class="muted small">{{ o.tipo }}</div>
                    @if (o.valorEsperadoTipico) {
                      <div class="small">Valor típico: <strong>{{ o.valorEsperadoTipico | cop }}</strong></div>
                    }
                  </div>
                  <button mat-icon-button [matMenuTriggerFor]="m">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #m="matMenu">
                    <a mat-menu-item [routerLink]="[o.id, 'edit']">
                      <mat-icon>edit</mat-icon> Editar
                    </a>
                    <button mat-menu-item (click)="toggleActiva(o.id, !o.activa)">
                      <mat-icon>{{ o.activa ? 'visibility_off' : 'visibility' }}</mat-icon>
                      {{ o.activa ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button mat-menu-item (click)="confirmDelete(o.id)">
                      <mat-icon>delete</mat-icon> Eliminar
                    </button>
                  </mat-menu>
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
    .prio-A { background: #C62828; color: #fff; }
    .prio-B { background: #F57F17; color: #fff; }
    .prio-C { background: #2E7D32; color: #fff; }
    .prio-D { background: #6B7280; color: #fff; }
    .muted-chip { background: var(--border); color: var(--muted); padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .inactiva { opacity: 0.6; }
  `]
})
export class ObligationsListComponent {
  protected obs = inject(ObligationService);

  priLabel(p: 'A'|'B'|'C'|'D') { return PRIORIDAD_LABELS[p]; }

  async toggleActiva(id: string, activa: boolean) {
    await this.obs.actualizar(id, { activa });
  }

  async confirmDelete(id: string) {
    if (confirm('¿Eliminar esta obligación? Los compromisos pasados conservan su nombre como texto.')) {
      await this.obs.eliminar(id);
    }
  }
}
