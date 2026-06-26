import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CycleService } from '../../core/services/cycle.service';
import { FinancialAnalysisService } from '../../core/services/financial-analysis.service';
import { ProjectionService } from '../../core/services/projection.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';
import * as fc from '../../core/services/financial-calculations';
import { Ciclo } from '../../core/domain';

interface CicloResumen {
  ciclo: Ciclo;
  mes: string;
  esActivo: boolean;
  tipoCreacion: 'auto' | 'manual';
  fechaInicio: Date;
  fechaFin: Date;
  duracionDias: number;
  ingresos: number;
  obligaciones: number;
  dineroLibre: number;
  saludClass: 'verde' | 'amarillo' | 'rojo';
  saludLabel: string;
}

@Component({
  selector: 'app-cycles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatMenuModule, MatSnackBarModule,
    EmptyStateComponent, CopPipe, FechaCortaPipe,
  ],
  template: `
    <section class="page">
      <div class="row-space">
        <h2 class="page-title">Historial de ciclos</h2>
        <a mat-stroked-button routerLink="new">
          <mat-icon>add</mat-icon> Manual
        </a>
      </div>

      <mat-card class="cta-card">
        <mat-card-content>
          <div class="cta-row">
            <mat-icon class="cta-icon">auto_awesome</mat-icon>
            <div class="cta-text">
              <strong>Preparar siguiente ciclo</strong>
              <p class="muted small">
                Calcula la proxima fecha de pago segun tu configuracion y clona las obligaciones recurrentes activas.
                Es idempotente: si ya hay un ciclo posterior se reutiliza.
              </p>
            </div>
            <button mat-flat-button color="primary"
                    [disabled]="preparando()" (click)="prepararSiguiente()">
              <mat-icon>event_upcoming</mat-icon>
              Preparar
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      @if (resumenes().length === 0) {
        <app-empty-state
          icon="event"
          title="Aun no hay ciclos"
          subtitle="Crea el primero o usa 'Preparar siguiente ciclo' para generarlo automaticamente."
          ctaLabel="Crear ciclo manual"
          ctaLink="new">
        </app-empty-state>
      } @else {
        <div class="list">
          @for (r of resumenes(); track r.ciclo.id) {
            <mat-card class="cycle-card" [class.activo]="r.esActivo">
              <mat-card-content>
                <div class="card-head">
                  <div>
                    <div class="mes">{{ r.mes }}</div>
                    <div class="muted small">{{ r.fechaInicio | fechaCorta }} - {{ r.fechaFin | fechaCorta }} ({{ r.duracionDias }}d)</div>
                  </div>
                  <div class="chips">
                    @if (r.esActivo) {
                      <span class="chip activo-chip">Activo</span>
                    }
                    @if (r.ciclo.estado === 'Cerrado') {
                      <span class="chip cerrado-chip">Cerrado</span>
                    }
                    <span class="chip tipo-chip">{{ r.tipoCreacion === 'auto' ? 'Auto' : 'Manual' }}</span>
                    <button mat-icon-button [matMenuTriggerFor]="m">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #m="matMenu">
                      @if (!r.esActivo) {
                        <button mat-menu-item (click)="marcarActivo(r.ciclo.id)">
                          <mat-icon>check_circle</mat-icon> Marcar como activo
                        </button>
                      }
                      @if (r.ciclo.estado === 'Abierto') {
                        <button mat-menu-item (click)="cerrar(r.ciclo.id)">
                          <mat-icon>lock</mat-icon> Cerrar ciclo
                        </button>
                      }
                      <a mat-menu-item [routerLink]="[r.ciclo.id, 'edit']">
                        <mat-icon>edit</mat-icon> Editar
                      </a>
                      <a mat-menu-item [routerLink]="[r.ciclo.id, 'comparativa']">
                        <mat-icon>compare</mat-icon> Comparativa
                      </a>
                      <button mat-menu-item (click)="eliminar(r.ciclo.id)">
                        <mat-icon>delete</mat-icon> Eliminar
                      </button>
                    </mat-menu>
                  </div>
                </div>

                <div class="metrics">
                  <div class="metric">
                    <div class="metric-label">Ingresos</div>
                    <div class="metric-value">{{ r.ingresos | cop }}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">Obligaciones</div>
                    <div class="metric-value">{{ r.obligaciones | cop }}</div>
                  </div>
                  <div class="metric salud-{{ r.saludClass }}">
                    <div class="metric-label">Dinero libre</div>
                    <div class="metric-value">{{ r.dineroLibre | cop }}</div>
                    <div class="metric-foot">{{ r.saludLabel }}</div>
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
    .cta-card { background: linear-gradient(135deg, #1F4E78, #2E75B6); color: #fff; margin-bottom: 16px; }
    .cta-row { display: flex; align-items: center; gap: 12px; }
    .cta-icon { font-size: 32px; height: 32px; width: 32px; flex-shrink: 0; }
    .cta-text { flex: 1; }
    .cta-text strong { font-size: 16px; }
    .cta-text p { margin: 4px 0 0; color: rgba(255,255,255,0.85); }

    .list { display: flex; flex-direction: column; gap: 12px; }
    .cycle-card { border-left: 4px solid transparent; }
    .cycle-card.activo { border-left-color: var(--verde-500); }

    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .mes { font-size: 18px; font-weight: 700; }
    .chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .activo-chip { background: var(--verde-500); color: #fff; }
    .cerrado-chip { background: var(--muted); color: #fff; }
    .tipo-chip { background: var(--accent); color: #000; }

    .metrics {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
      margin-top: 12px;
    }
    .metric {
      background: var(--bg); border-radius: 8px;
      padding: 8px 10px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .metric-label { font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 600; }
    .metric-value { font-size: 14px; font-weight: 700; }
    .metric-foot { font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .metric.salud-verde    { background: var(--verde-50);  color: var(--verde-700); }
    .metric.salud-amarillo { background: var(--amar-50);   color: var(--amar-700); }
    .metric.salud-rojo     { background: var(--rojo-50);   color: var(--rojo-700); }
    .small { font-size: 12px; }
  `]
})
export class CyclesListComponent {
  private fa = inject(FinancialAnalysisService);
  private cycles = inject(CycleService);
  private projection = inject(ProjectionService);
  private snack = inject(MatSnackBar);

  preparando = signal(false);

  resumenes = computed<CicloResumen[]>(() => {
    const data = this.fa.data();
    const cfg = this.fa.config();
    const dur = fc.duracionEstimada(cfg);
    const activoId = this.cycles.cicloActivoId();
    const ciclosOrdenados = [...data.ciclos]
      .sort((a, b) => +new Date(b.fechaPago) - +new Date(a.fechaPago));
    return ciclosOrdenados.map(c => {
      const fechaPago = new Date(c.fechaPago);
      const mes = fechaPago.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      const inicio = fc.fechaInicioCiclo(data, c);
      const fin = fc.fechaFinCiclo(data, c, dur);
      const duracion = fc.duracionCiclo(data, c, dur);
      const ingresos = fc.ingresosRecibidos(data, c.id) + fc.ingresosEsperados(data, c.id);
      const obligaciones = fc.obligacionesProyectadas(data, c.id);
      const dineroLibre = fc.dineroLibreProyectado(data, c.id);
      const salud = fc.saludCiclo(data, c.id);
      return {
        ciclo: c,
        mes: this.capitalize(mes),
        esActivo: c.id === activoId,
        tipoCreacion: c.creadoAutomaticamente ? 'auto' : 'manual',
        fechaInicio: inicio,
        fechaFin: fin,
        duracionDias: duracion,
        ingresos,
        obligaciones,
        dineroLibre,
        saludClass: salud.toLowerCase() as 'verde' | 'amarillo' | 'rojo',
        saludLabel: salud === 'VERDE' ? 'Saludable' : salud === 'AMARILLO' ? 'Atento' : 'En riesgo',
      };
    });
  });

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async prepararSiguiente() {
    this.preparando.set(true);
    try {
      const res = await this.projection.crearSiguienteCicloAutomatico();
      const f = res.fechaPagoCalculadaAjustada.toLocaleDateString('es-CO');
      this.snack.open(
        `Listo. Proximo pago: ${f}. ${res.compromisosCreados} compromiso(s) preparados.`,
        'OK',
        { duration: 4000 },
      );
    } catch (e) {
      console.error(e);
      this.snack.open('No fue posible preparar el siguiente ciclo.', 'OK', { duration: 3000 });
    } finally {
      this.preparando.set(false);
    }
  }

  async marcarActivo(id: string) {
    await this.cycles.marcarActivo(id);
    this.snack.open('Ciclo marcado como activo.', 'OK', { duration: 2000 });
  }

  async cerrar(id: string) {
    if (!confirm('Cerrar este ciclo? Podras seguir viendo su historial.')) return;
    await this.cycles.cerrarCiclo(id);
    this.snack.open('Ciclo cerrado.', 'OK', { duration: 2000 });
  }

  async eliminar(id: string) {
    if (!confirm('Eliminar este ciclo? NO se borran ingresos/gastos asociados; quedaran sin ciclo.')) return;
    await this.cycles.eliminar(id);
    this.snack.open('Ciclo eliminado.', 'OK', { duration: 2000 });
  }
}
