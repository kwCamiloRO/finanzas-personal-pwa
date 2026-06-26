import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { FinancialAnalysisService } from '../../core/services/financial-analysis.service';
import { ObligationLifecycleService } from '../../core/services/obligation-lifecycle.service';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-checklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatChipsModule, MatSnackBarModule,
    CopPipe, FechaCortaPipe,
  ],
  template: `
    <section class="page">
      <div class="row-space">
        <h2 class="page-title">Checklist del ciclo</h2>
        <button mat-stroked-button (click)="confirmarTodas()">
          <mat-icon>done_all</mat-icon> Mantener todas
        </button>
      </div>

      @if (!fa.viendoCicloActivo()) {
        <div class="banner-historico">
          <mat-icon>history</mat-icon>
          <span>
            Estás editando un ciclo distinto al activo
            (<strong>{{ fa.cicloViendo()?.fechaPago | fechaCorta }}</strong>).
            Los cambios afectan ese ciclo. Para volver al actual, cambia el selector en el dashboard.
          </span>
        </div>
      }

      @if (fa.compromisosCicloActivo().length === 0) {
        <p class="muted">No hay compromisos en este ciclo.</p>
      } @else {
        <ul class="check-list">
          @for (c of fa.compromisosCicloActivo(); track c.id) {
            <li class="check-item estado-{{ (c.estadoRapido ?? 'Pendiente').toLowerCase() }}">
              <div class="ck-left">
                <div class="ck-name">{{ c.nombre }}</div>
                <div class="muted small">
                  {{ c.prioridad }} · saldo {{ c.saldoPendiente | cop }}
                  @if (c.fechaVencimiento) { · vence {{ c.fechaVencimiento | fechaCorta }} }
                </div>
              </div>
              <div class="ck-right">
                <div class="ck-amount">{{ c.valorReal | cop }}</div>
                <div class="ck-chips">
                  <button class="ck-chip" [class.active]="(c.estadoRapido ?? 'Pendiente') === 'Pendiente'"
                          (click)="marcar(c.id, 'Pendiente')">Pendiente</button>
                  <button class="ck-chip chip-paid" [class.active]="c.estadoRapido === 'Pagada'"
                          (click)="marcar(c.id, 'Pagada')">Pagada</button>
                  <button class="ck-chip chip-partial" [class.active]="c.estadoRapido === 'Parcial'"
                          (click)="marcar(c.id, 'Parcial')">Parcial</button>
                  <button class="ck-chip chip-omit" [class.active]="c.estadoRapido === 'Omitida'"
                          (click)="marcar(c.id, 'Omitida')">Omitida</button>
                </div>
              </div>
            </li>
          }
        </ul>
      }

      <a mat-button routerLink="/dashboard" class="back">
        <mat-icon>arrow_back</mat-icon> Volver al dashboard
      </a>
    </section>
  `,
  styles: [`
    .check-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .check-item {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 10px 12px;
      display: flex; gap: 12px; justify-content: space-between; align-items: center;
    }
    .check-item.estado-pagada   { background: var(--verde-50); border-color: transparent; }
    .check-item.estado-parcial  { background: var(--amar-50); border-color: transparent; }
    .check-item.estado-omitida  { opacity: 0.6; }
    .ck-name { font-weight: 600; }
    .small { font-size: 12px; }
    .ck-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .ck-amount { font-weight: 700; }
    .ck-chips { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
    .ck-chip {
      border: 1px solid var(--border); background: transparent; color: var(--muted);
      border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600;
      cursor: pointer;
    }
    .ck-chip.active { color: #fff; background: var(--muted); border-color: var(--muted); }
    .ck-chip.chip-paid.active   { background: var(--verde-500); border-color: var(--verde-500); }
    .ck-chip.chip-partial.active{ background: var(--amar-500); border-color: var(--amar-500); }
    .ck-chip.chip-omit.active   { background: var(--rojo-500); border-color: var(--rojo-500); }
    .back { margin-top: 16px; }
    .banner-historico {
      display: flex; gap: 8px; align-items: flex-start;
      background: var(--amar-50); color: var(--amar-700);
      font-size: 13px;
    }
  `]
})
export class ChecklistComponent {
  protected fa = inject(FinancialAnalysisService);
  private lifecycle = inject(ObligationLifecycleService);
  private snack = inject(MatSnackBar);

  async marcar(compromisoId: string, estado: 'Pendiente' | 'Pagada' | 'Parcial' | 'Omitida') {
    await this.lifecycle.marcarRapido(compromisoId, estado);
  }

  async confirmarTodas() {
    const ca = this.fa.cicloActivoId();
    if (!ca) return;
    const n = await this.lifecycle.confirmarRecurrentesDelCiclo(ca);
    this.snack.open(`${n} compromiso(s) confirmados como pendientes del ciclo.`, 'OK', { duration: 3000 });
  }
}
