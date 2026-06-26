import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { FinancialAnalysisService } from '../../core/services/financial-analysis.service';
import { ProjectionService } from '../../core/services/projection.service';
import { CopPipe } from '../../shared/pipes/cop.pipe';

@Component({
  selector: 'app-comparativa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule, CopPipe],
  template: `
    <section class="page">
      <h2 class="page-title">Comparativa Proyectado vs Real</h2>
      <p class="muted">Ciclo {{ cicloId() }}</p>

      <mat-card>
        <mat-card-content>
          <table class="cmp">
            <tr>
              <th></th><th>Proyectado</th><th>Real</th><th>Δ</th>
            </tr>
            <tr>
              <td>Ingresos</td>
              <td>{{ cmp().ingresoProyectado | cop }}</td>
              <td>{{ cmp().ingresoReal | cop }}</td>
              <td [class]="cmp().diffIngreso >= 0 ? 'pos' : 'neg'">{{ cmp().diffIngreso | cop }}</td>
            </tr>
            <tr>
              <td>Obligaciones</td>
              <td>{{ cmp().obligacionProyectada | cop }}</td>
              <td>{{ cmp().obligacionReal | cop }}</td>
              <td [class]="cmp().diffObligacion >= 0 ? 'neg' : 'pos'">{{ cmp().diffObligacion | cop }}</td>
            </tr>
            <tr>
              <td>Gastos</td>
              <td colspan="2">{{ cmp().gastoReal | cop }}</td>
              <td>—</td>
            </tr>
            <tr class="total">
              <td>DLP / DLR</td>
              <td>{{ cmp().dlpProyectado | cop }}</td>
              <td>{{ cmp().dlpReal | cop }}</td>
              <td [class]="cmp().diferencia >= 0 ? 'pos' : 'neg'">{{ cmp().diferencia | cop }}</td>
            </tr>
          </table>

          <div class="precision">
            <div class="muted small">Precisión de la proyección</div>
            <div class="precision-bar">
              <div class="precision-fill" [style.width.%]="cmp().porcentajePrecision * 100"></div>
            </div>
            <div class="muted small">{{ (cmp().porcentajePrecision * 100).toFixed(0) }}%</div>
          </div>

          <p class="causa">
            Causa principal: <strong>{{ causaLabel() }}</strong>
          </p>
        </mat-card-content>
      </mat-card>

      <a mat-button routerLink="/dashboard" class="back">
        <mat-icon>arrow_back</mat-icon> Volver
      </a>
    </section>
  `,
  styles: [`
    table.cmp { width: 100%; border-collapse: collapse; font-size: 14px; }
    table.cmp th, table.cmp td { padding: 8px 4px; text-align: right; border-bottom: 1px solid var(--border); }
    table.cmp th:first-child, table.cmp td:first-child { text-align: left; color: var(--muted); }
    table.cmp tr.total td { font-weight: 700; border-top: 2px solid var(--text); padding-top: 12px; }
    .pos { color: var(--verde-700); }
    .neg { color: var(--rojo-500); }
    .precision { margin-top: 16px; }
    .precision-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin: 4px 0; }
    .precision-fill { height: 100%; background: var(--verde-500); transition: width 200ms; }
    .causa { margin-top: 16px; }
    .back { margin-top: 16px; }
  `]
})
export class ComparativaComponent {
  private route = inject(ActivatedRoute);
  private fa = inject(FinancialAnalysisService);
  private projection = inject(ProjectionService);

  cicloId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  cmp = computed(() => this.projection.compararCicloExtendido(this.fa.data(), this.cicloId()));

  causaLabel(): string {
    const c = this.cmp().causaPrincipal;
    return ({
      ingreso: 'Diferencia en ingresos recibidos',
      obligacion: 'Diferencia en obligaciones pagadas',
      gasto: 'Gastos del ciclo (no proyectados)',
      ninguna: 'Sin desviaciones significativas',
    } as Record<string, string>)[c];
  }
}
