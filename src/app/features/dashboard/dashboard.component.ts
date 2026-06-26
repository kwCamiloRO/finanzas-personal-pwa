import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { FinancialAnalysisService } from '../../core/services/financial-analysis.service';
import { CycleService } from '../../core/services/cycle.service';
import { ProjectionService } from '../../core/services/projection.service';
import { IncomeService } from '../../core/services/income.service';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule, MatDividerModule, MatProgressBarModule,
    MatSelectModule, MatSnackBarModule,
    CopPipe, FechaCortaPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected fa = inject(FinancialAnalysisService);
  protected cycles = inject(CycleService);
  private projection = inject(ProjectionService);
  private income = inject(IncomeService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  preparando = signal(false);
  confirmandoPago = signal(false);

  ngOnInit() {
    if (!this.cycles.cicloActivoId()) {
      this.router.navigateByUrl('/start');
    }
  }

  saludVariant(): 'verde' | 'amarillo' | 'rojo' {
    return this.fa.saludCiclo().toLowerCase() as 'verde' | 'amarillo' | 'rojo';
  }

  saludLabel(): string {
    const s = this.fa.saludCiclo();
    if (s === 'VERDE') return 'Saludable';
    if (s === 'AMARILLO') return 'Atento';
    return 'En riesgo';
  }

  modoLabel(): string {
    if (this.fa.esDiaDePago()) return 'Día de pago';
    return this.fa.modo() === 'PLANIFICACION' ? 'Planificación' : 'Ejecución';
  }

  onCambioCicloVisualizado(ev: string) {
    this.cycles.setCicloViendo(ev || null);
  }

  async prepararSiguienteCiclo() {
    this.preparando.set(true);
    try {
      const res = await this.projection.crearSiguienteCicloAutomatico();
      this.snack.open(
        `Ciclo creado para ${res.fechaPagoCalculadaAjustada.toLocaleDateString('es-CO')} (${res.compromisosCreados} compromisos).`,
        'OK',
        { duration: 4000 },
      );
    } catch (e) {
      console.error(e);
      this.snack.open('Error preparando ciclo', 'OK', { duration: 3000 });
    } finally {
      this.preparando.set(false);
    }
  }

  /** Día de pago: confirma "sí, recibí" → marca todos los esperados como Recibidos. */
  async confirmarRecepcionPago() {
    this.confirmandoPago.set(true);
    const ca = this.cycles.cicloActivoId();
    if (!ca) return;
    const esperados = this.fa.data().ingresos
      .filter(i => i.cicloId === ca && (i.estado === 'Esperado' || i.estado === 'Confirmado'));
    for (const i of esperados) {
      await this.income.actualizar(i.id, { estado: 'Recibido' });
    }
    this.confirmandoPago.set(false);
    this.snack.open(`${esperados.length} ingreso(s) marcados como recibidos.`, 'OK', { duration: 3000 });
  }

  /** Día de pago: "aún no" → mantiene en planificación, registra solo feedback. */
  pagoAunNoLlega() {
    this.snack.open('Seguiremos esperando. Marca tu salario cuando llegue.', 'OK', { duration: 4000 });
  }

  /** Cierra el ciclo activo desde el dashboard. */
  async cerrarCicloActual() {
    const ca = this.cycles.cicloActivoId();
    if (!ca) return;
    if (!confirm('Cerrar este ciclo? Podras seguir viendo su historial y comparativa.')) return;
    await this.cycles.cerrarCiclo(ca);
    this.snack.open('Ciclo cerrado. Prepara el siguiente cuando quieras.', 'OK', { duration: 4000 });
  }
}
