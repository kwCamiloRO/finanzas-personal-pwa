import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ObligationService } from '../../core/services/obligation.service';
import { ObligacionRepository } from '../../core/data/obligacion.repository';
import {
  OBLIGACION_TIPOS, PRIORIDAD_LABELS, PRIORIDAD_DESCRIPCIONES, PRIORIDAD_EJEMPLOS,
  ObligacionTipo, Prioridad,
} from '../../core/domain';

@Component({
  selector: 'app-obligation-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatCardModule, MatSlideToggleModule,
    MatRadioModule, MatSnackBarModule,
  ],
  template: `
    <section class="page">
      <h2 class="page-title">{{ editId() ? 'Editar obligación' : (onboarding() ? 'Agrega una obligación' : 'Nueva obligación') }}</h2>

      @if (onboarding()) {
        <div class="onboarding-banner">
          <mat-icon>info</mat-icon>
          <div>
            <strong>Paso 3 de 3</strong>
            <p>Empieza con tu obligación más grande (arriendo, vehículo, tarjeta). Puedes agregar más después.</p>
          </div>
        </div>
      }

      <mat-card><mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit(false)" class="full-form">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" required maxlength="80"
                   placeholder="Ej: Arriendo, Tarjeta Visa, Internet">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo" required>
              @for (t of tipos; track t) { <mat-option [value]="t">{{ t }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <div class="prio-section">
            <label class="block-label">Prioridad</label>
            <mat-radio-group formControlName="prioridad" class="prio-list">
              @for (p of prioridades; track p) {
                <label class="prio-card" [class.selected]="form.value.prioridad === p">
                  <mat-radio-button [value]="p"></mat-radio-button>
                  <div class="prio-text">
                    <div class="prio-head">
                      <span class="prio-badge prio-{{ p }}">{{ p }}</span>
                      <strong>{{ priLabel(p) }}</strong>
                    </div>
                    <small>{{ priDescripcion(p) }}</small>
                    <em>Ej: {{ priEjemplos(p) }}</em>
                  </div>
                </label>
              }
            </mat-radio-group>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Valor típico mensual (COP)</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="valorEsperadoTipico" min="0" inputmode="numeric"
                   placeholder="Cuánto pagas usualmente">
          </mat-form-field>

          <mat-slide-toggle formControlName="recurrente">Es recurrente (se repite cada ciclo)</mat-slide-toggle>
          <mat-slide-toggle formControlName="activa">Activa</mat-slide-toggle>

          <div class="form-actions">
            @if (onboarding()) {
              <button type="button" mat-button (click)="terminar()">Listo, ir al dashboard</button>
              <button type="submit" mat-flat-button color="primary"
                      [disabled]="form.invalid || saving()"
                      (click)="continuar = true">
                <mat-icon>add</mat-icon> Guardar y agregar otra
              </button>
            } @else {
              <button type="button" mat-button (click)="cancelar()">Cancelar</button>
              <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid || saving()">
                <mat-icon>save</mat-icon> Guardar
              </button>
            }
          </div>
        </form>
      </mat-card-content></mat-card>
    </section>
  `,
  styles: [`
    .onboarding-banner {
      display: flex; gap: 12px; padding: 12px 16px; border-radius: 12px;
      background: var(--amar-50); color: var(--amar-700);
      margin-bottom: 16px; align-items: flex-start;
    }
    .onboarding-banner mat-icon { flex-shrink: 0; }
    .onboarding-banner strong { display: block; font-size: 13px; }
    .onboarding-banner p { margin: 4px 0 0; font-size: 13px; }
    .prio-section { display: flex; flex-direction: column; gap: 8px; }
    .block-label { font-size: 12px; color: var(--muted); font-weight: 600; }
    .prio-list { display: flex; flex-direction: column; gap: 8px; }
    .prio-card {
      display: flex; gap: 10px; padding: 12px;
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: 12px; cursor: pointer; transition: all 0.15s;
      align-items: flex-start;
    }
    .prio-card.selected { border-color: var(--primary); background: #F8FAFE; }
    .prio-card mat-radio-button { margin-top: -8px; }
    .prio-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .prio-head { display: flex; align-items: center; gap: 8px; }
    .prio-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px;
      font-size: 12px; font-weight: 800; color: #fff;
    }
    .prio-A { background: #C62828; }
    .prio-B { background: #F57F17; }
    .prio-C { background: #2E7D32; }
    .prio-D { background: #6B7280; }
    .prio-text small { color: var(--muted); font-size: 13px; }
    .prio-text em { color: var(--muted); font-size: 12px; font-style: normal; }
  `]
})
export class ObligationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private obs = inject(ObligationService);
  private repo = inject(ObligacionRepository);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  tipos = OBLIGACION_TIPOS;
  prioridades: Prioridad[] = ['A', 'B', 'C', 'D'];
  editId = signal<string | null>(null);
  saving = signal(false);
  onboarding = computed(() => this.route.snapshot.queryParamMap.get('onboarding') === '1');
  continuar = false;

  priLabel(p: Prioridad) { return PRIORIDAD_LABELS[p]; }
  priDescripcion(p: Prioridad) { return PRIORIDAD_DESCRIPCIONES[p]; }
  priEjemplos(p: Prioridad) { return PRIORIDAD_EJEMPLOS[p]; }

  form = this.fb.group({
    nombre: ['', Validators.required],
    tipo: ['Otro' as ObligacionTipo, Validators.required],
    prioridad: ['A' as Prioridad, Validators.required],
    valorEsperadoTipico: [null as number | null],
    recurrente: [true],
    activa: [true],
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      const o = await this.repo.get(id);
      if (o) {
        this.form.patchValue({
          nombre: o.nombre, tipo: o.tipo, prioridad: o.prioridad,
          valorEsperadoTipico: o.valorEsperadoTipico ?? null,
          recurrente: o.recurrente, activa: o.activa,
        });
      }
    }
  }

  async onSubmit(_terminar = false) {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const payload = {
      nombre: v.nombre!,
      tipo: v.tipo as ObligacionTipo,
      prioridad: v.prioridad as Prioridad,
      valorEsperadoTipico: v.valorEsperadoTipico != null ? Number(v.valorEsperadoTipico) : undefined,
      recurrente: !!v.recurrente,
      activa: !!v.activa,
    };
    if (this.editId()) {
      await this.obs.actualizar(this.editId()!, payload);
    } else {
      await this.obs.crear(payload);
    }

    if (this.onboarding() && !this.editId() && this.continuar) {
      this.snack.open(`"${payload.nombre}" guardada`, 'OK', { duration: 1500 });
      this.continuar = false;
      this.form.reset({
        tipo: 'Otro', prioridad: 'A', recurrente: true, activa: true,
        nombre: '', valorEsperadoTipico: null,
      });
      this.saving.set(false);
      return;
    }

    if (this.onboarding()) {
      this.router.navigateByUrl('/dashboard');
    } else {
      this.router.navigateByUrl('/obligations');
    }
  }

  terminar() {
    this.router.navigateByUrl('/dashboard');
  }

  cancelar() {
    if (this.onboarding()) {
      this.router.navigateByUrl('/dashboard');
    } else {
      this.router.navigateByUrl('/obligations');
    }
  }
}
