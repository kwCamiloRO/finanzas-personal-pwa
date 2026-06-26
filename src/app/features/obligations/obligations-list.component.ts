import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ObligationService } from '../../core/services/obligation.service';
import { ObligationLifecycleService } from '../../core/services/obligation-lifecycle.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { PRIORIDAD_LABELS } from '../../core/domain';

@Component({
  selector: 'app-obligations-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatMenuModule, MatSnackBarModule,
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
          subtitle="Agrega arriendo, servicios, creditos y tarjetas."
          ctaLabel="Agregar obligacion"
          ctaLink="new">
        </app-empty-state>
      } @else {
        <div class="list">
          @for (o of obs.obligaciones(); track o.id) {
            <mat-card [class.inactiva]="!o.activa || o.estadoFinalizacion === 'Finalizada'">
              <mat-card-content>
                <div class="row-space">
                  <div>
                    <div class="row">
                      <strong>{{ o.nombre }}</strong>
                      <span class="chip prio-{{ o.prioridad }}">{{ o.prioridad }} - {{ priLabel(o.prioridad) }}</span>
                      @if (o.recurrente) { <span class="chip muted-chip">Recurrente</span> }
                      @if (o.estadoFinalizacion === 'Finalizada') {
                        <span class="chip rojo-chip">Finalizada</span>
                      } @else if (o.estadoFinalizacion === 'Pausada') {
                        <span class="chip amarillo-chip">Pausada</span>
                      } @else if (!o.activa) {
                        <span class="chip muted-chip">Inactiva</span>
                      }
                      @if ((o.cuotasRestantes ?? 0) > 0) {
                        <span class="chip cuotas-chip">{{ o.cuotasRestantes }}/{{ o.cuotasTotales }} cuotas</span>
                      }
                    </div>
                    <div class="muted small">{{ o.tipo }}</div>
                    @if (o.valorEsperadoTipico) {
                      <div class="small">Valor tipico: <strong>{{ o.valorEsperadoTipico | cop }}</strong></div>
                    }
                    @if (o.motivoFinalizacion) {
                      <div class="muted small">Motivo: {{ o.motivoFinalizacion }}</div>
                    }
                  </div>
                  <button mat-icon-button [matMenuTriggerFor]="m">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #m="matMenu">
                    <a mat-menu-item [routerLink]="[o.id, 'edit']">
                      <mat-icon>edit</mat-icon> Editar
                    </a>

                    @if (o.estadoFinalizacion === 'Finalizada' || o.estadoFinalizacion === 'Pausada') {
                      <button mat-menu-item (click)="reactivar(o.id)">
                        <mat-icon>play_arrow</mat-icon> Reactivar
                      </button>
                    } @else {
                      <button mat-menu-item (click)="pausar(o.id)">
                        <mat-icon>pause</mat-icon> Pausar
                      </button>
                      <button mat-menu-item (click)="finalizar(o.id)">
                        <mat-icon>flag</mat-icon> Finalizar
                      </button>
                    }

                    <button mat-menu-item (click)="distribuir(o.id, o.nombre)">
                      <mat-icon>view_week</mat-icon> Distribuir en cuotas
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
    .rojo-chip { background: var(--rojo-500); color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .amarillo-chip { background: var(--amar-500); color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .cuotas-chip { background: var(--primary); color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .inactiva { opacity: 0.6; }
  `]
})
export class ObligationsListComponent {
  protected obs = inject(ObligationService);
  private lifecycle = inject(ObligationLifecycleService);
  private snack = inject(MatSnackBar);

  priLabel(p: 'A'|'B'|'C'|'D') { return PRIORIDAD_LABELS[p]; }

  async finalizar(id: string) {
    const motivo = prompt('Motivo de finalizacion (opcional):') ?? undefined;
    if (motivo === null) return;
    await this.lifecycle.finalizar(id, motivo || undefined);
    this.snack.open('Obligacion finalizada. No aparecera en futuros ciclos.', 'OK', { duration: 3000 });
  }

  async pausar(id: string) {
    const motivo = prompt('Motivo de pausa (opcional):') ?? undefined;
    if (motivo === null) return;
    await this.lifecycle.pausar(id, motivo || undefined);
    this.snack.open('Obligacion pausada. No aparecera en futuros ciclos hasta reactivar.', 'OK', { duration: 3000 });
  }

  async reactivar(id: string) {
    await this.lifecycle.reactivar(id);
    this.snack.open('Obligacion reactivada.', 'OK', { duration: 2000 });
  }

  async distribuir(id: string, nombre: string) {
    const montoStr = prompt(`Distribuir "${nombre}" en cuotas. Monto total (COP):`);
    if (!montoStr) return;
    const monto = Number(montoStr);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.snack.open('Monto invalido.', 'OK', { duration: 2000 });
      return;
    }
    const cuotasStr = prompt('Numero de cuotas (1-60):');
    if (!cuotasStr) return;
    const cuotas = Math.floor(Number(cuotasStr));
    if (!Number.isFinite(cuotas) || cuotas <= 0 || cuotas > 60) {
      this.snack.open('Numero de cuotas invalido.', 'OK', { duration: 2000 });
      return;
    }
    await this.lifecycle.distribuirEnCuotas(id, monto, cuotas);
    const cuota = Math.round(monto / cuotas);
    this.snack.open(`Listo. ${cuotas} cuotas de ${cuota.toLocaleString('es-CO')} COP.`, 'OK', { duration: 4000 });
  }

  async confirmDelete(id: string) {
    if (confirm('Eliminar esta obligacion? Los compromisos pasados conservan su nombre como texto.')) {
      await this.obs.eliminar(id);
    }
  }
}
