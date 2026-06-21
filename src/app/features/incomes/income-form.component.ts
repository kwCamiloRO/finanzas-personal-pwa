import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';

import { IncomeService } from '../../core/services/income.service';
import { CycleService } from '../../core/services/cycle.service';
import { IngresoRepository } from '../../core/data/ingreso.repository';
import { INGRESO_TIPOS, INGRESO_ESTADOS, IngresoTipo, IngresoEstado } from '../../core/domain';
import { FechaCortaPipe } from '../../shared/pipes/fecha-corta.pipe';

@Component({
  selector: 'app-income-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatCardModule,
    FechaCortaPipe,
  ],
  template: `
    <section class="page">
      <h2 class="page-title">{{ editId() ? 'Editar ingreso' : 'Nuevo ingreso' }}</h2>
      <mat-card><mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="full-form">
          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo" required>
              @for (t of tipos; track t) { <mat-option [value]="t">{{ t }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Valor (COP)</mat-label>
            <input matInput type="number" formControlName="valor" min="1" required inputmode="numeric">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado" required>
              @for (e of estados; track e) { <mat-option [value]="e">{{ e }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="fecha" required>
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ciclo</mat-label>
            <mat-select formControlName="cicloId" required>
              @for (c of cycles.ciclos(); track c.id) {
                <mat-option [value]="c.id">{{ c.id }} ({{ c.fechaPago | fechaCorta }})</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Observaciones</mat-label>
            <textarea matInput formControlName="observaciones" rows="2"></textarea>
          </mat-form-field>

          <div class="form-actions">
            <button type="button" mat-button (click)="cancelar()">Cancelar</button>
            <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid || saving()">
              <mat-icon>save</mat-icon> Guardar
            </button>
          </div>
        </form>
      </mat-card-content></mat-card>
    </section>
  `,
})
export class IncomeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private income = inject(IncomeService);
  protected cycles = inject(CycleService);
  private repo = inject(IngresoRepository);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  tipos = INGRESO_TIPOS;
  estados = INGRESO_ESTADOS;
  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    tipo: ['Salario' as IngresoTipo, Validators.required],
    valor: [0, [Validators.required, Validators.min(1)]],
    estado: ['Recibido' as IngresoEstado, Validators.required],
    fecha: [new Date() as Date | null, Validators.required],
    cicloId: ['', Validators.required],
    observaciones: [''],
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      const i = await this.repo.list().then(list => list.find(x => x.id === id));
      if (i) {
        this.form.patchValue({
          tipo: i.tipo, valor: i.valor, estado: i.estado,
          fecha: new Date(i.fecha), cicloId: i.cicloId,
          observaciones: i.observaciones ?? '',
        });
      }
    } else {
      const ca = this.cycles.cicloActivoId();
      if (ca) this.form.patchValue({ cicloId: ca });
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    if (this.editId()) {
      await this.income.actualizar(this.editId()!, {
        tipo: v.tipo as IngresoTipo,
        valor: Number(v.valor),
        estado: v.estado as IngresoEstado,
        fecha: v.fecha as Date,
        cicloId: v.cicloId!,
        observaciones: v.observaciones ?? '',
      });
    } else {
      await this.income.crear({
        tipo: v.tipo as IngresoTipo,
        valor: Number(v.valor),
        estado: v.estado as IngresoEstado,
        fecha: v.fecha as Date,
        cicloId: v.cicloId!,
        observaciones: v.observaciones ?? undefined,
      });
    }
    const onboarding = this.route.snapshot.queryParamMap.get('onboarding') === '1';
    if (!this.editId() && onboarding) {
      this.router.navigate(['/obligations/new'], { queryParams: { onboarding: 1 } });
    } else {
      this.router.navigateByUrl('/incomes');
    }
  }

  cancelar() {
    const onboarding = this.route.snapshot.queryParamMap.get('onboarding') === '1';
    if (onboarding) {
      this.router.navigate(['/obligations/new'], { queryParams: { onboarding: 1 } });
    } else {
      this.router.navigateByUrl('/incomes');
    }
  }
}
