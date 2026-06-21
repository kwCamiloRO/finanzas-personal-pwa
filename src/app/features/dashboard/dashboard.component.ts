import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FinancialAnalysisService } from '../../core/services/financial-analysis.service';
import { CycleService } from '../../core/services/cycle.service';
import { CopPipe } from '../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButtonModule, MatIconModule, MatCardModule,
    MatDividerModule, MatProgressBarModule, CopPipe, FechaCortaPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected fa = inject(FinancialAnalysisService);
  protected cycles = inject(CycleService);
  private router = inject(Router);

  ngOnInit() {
    // Si no hay ciclo activo, llevar al onboarding
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
    return this.fa.modo() === 'PLANIFICACION' ? 'Planificación' : 'Ejecución';
  }
}
