import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { CycleService } from '../../core/services/cycle.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <section class="page welcome">
      <div class="hero">
        <div class="hero-icon">
          <mat-icon>insights</mat-icon>
        </div>
        <h1>Tu asistente financiero</h1>
        <p class="lead">
          No es una app de gastos. Es una herramienta de planificación por ciclo de nómina:
          te dice cómo vas a quedar cuando te paguen, y cuánto puedes gastar diariamente sin
          arruinar tu próximo ciclo.
        </p>
      </div>

      <h3 class="section-title">Vamos a configurarte en 3 pasos</h3>

      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div>
            <strong>Crea tu ciclo</strong>
            <p>La fecha de tu próximo (o último) pago. Define el período que vas a planificar.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div>
            <strong>Registra tu ingreso principal</strong>
            <p>Cuánto esperas recibir. Si todavía no lo recibes, márcalo como “Esperado”.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div>
            <strong>Agrega tus obligaciones</strong>
            <p>Arriendo, tarjetas, servicios. Aprendemos cuánto debes pagar normalmente.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">✓</div>
          <div>
            <strong>Lista tu primera proyección</strong>
            <p>Te diremos cuánto te queda libre, cuánto puedes gastar al día y qué tan saludable luce el ciclo.</p>
          </div>
        </div>
      </div>

      <div class="cta-row">
        <a mat-flat-button color="primary" routerLink="/cycles/new" [queryParams]="{ onboarding: 1 }">
          Empezar
          <mat-icon iconPositionEnd>arrow_forward</mat-icon>
        </a>
        <a mat-button routerLink="/dashboard">Saltar y explorar</a>
      </div>

      <p class="privacy">
        <mat-icon>lock</mat-icon>
        Todo se guarda en este dispositivo. Nada sale a internet.
      </p>
    </section>
  `,
  styles: [`
    .welcome { padding-bottom: 120px; }
    .hero { text-align: center; padding: 32px 8px 16px; }
    .hero-icon {
      width: 64px; height: 64px; border-radius: 16px;
      background: var(--primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
    }
    .hero-icon mat-icon { font-size: 36px; height: 36px; width: 36px; }
    .hero h1 { margin: 8px 0; font-size: 26px; font-weight: 800; }
    .lead { color: var(--muted); font-size: 15px; line-height: 1.45; margin: 0 auto; max-width: 480px; }
    .section-title { margin: 24px 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 700; }
    .steps { display: flex; flex-direction: column; gap: 12px; }
    .step {
      display: flex; gap: 12px; padding: 14px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    }
    .step-num {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; flex-shrink: 0;
    }
    .step strong { font-size: 15px; }
    .step p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
    .cta-row {
      display: flex; flex-direction: column; gap: 8px;
      margin-top: 24px; align-items: stretch;
    }
    .cta-row a[mat-flat-button] { padding: 12px 24px; font-size: 16px; height: auto; }
    .privacy {
      margin-top: 24px; display: flex; align-items: center; justify-content: center;
      gap: 6px; color: var(--muted); font-size: 12px;
    }
    .privacy mat-icon { font-size: 14px; height: 14px; width: 14px; }
  `]
})
export class WelcomeComponent implements OnInit {
  private cycles = inject(CycleService);
  private router = inject(Router);

  ngOnInit() {
    if (this.cycles.cicloActivoId()) {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
