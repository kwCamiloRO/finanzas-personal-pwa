import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';

import { CycleService } from '../../core/services/cycle.service';
import { CicloRepository } from '../../core/data/ciclo.repository';

@Component({
  selector: 'app-cycle-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatDatepickerModule, MatCheckboxModule, MatCardModule,
  ],
  template: `
    <section class="page">
      <h2 class="page-title">{{ editId() ? 'Editar ciclo' : 'Nuevo ciclo' }}</h2>
      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="full-form">
            <mat-form-field appearance="outline">
              <mat-label>Fecha de pago</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="fechaPago" required>
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Notas (opcional)</mat-label>
              <textarea matInput formControlName="notas" rows="2"></textarea>
            </mat-form-field>

            @if (!editId()) {
              <mat-checkbox formControlName="setActivo">Marcar como ciclo activo</mat-checkbox>
            }

            <div class="form-actions">
              <button type="button" mat-button (click)="cancelar()">Cancelar</button>
              <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid || saving()">
                <mat-icon>save</mat-icon> Guardar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class CycleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cycles = inject(CycleService);
  private cicloRepo = inject(CicloRepository);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    fechaPago: [new Date() as Date | null, Validators.required],
    notas: [''],
    setActivo: [true],
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      const c = await this.cicloRepo.get(id);
      if (c) {
        this.form.patchValue({
          fechaPago: new Date(c.fechaPago),
          notas: c.notas ?? '',
        });
      }
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    if (this.editId()) {
      await this.cycles.actualizarCiclo(this.editId()!, {
        fechaPago: v.fechaPago as Date,
        notas: v.notas ?? '',
      });
    } else {
      await this.cycles.crearCiclo({
        fechaPago: v.fechaPago as Date,
        notas: v.notas ?? undefined,
        setActivo: !!v.setActivo,
      });
    }
    const onboarding = this.route.snapshot.queryParamMap.get('onboarding') === '1';
    if (!this.editId() && onboarding) {
      this.router.navigate(['/incomes/new'], { queryParams: { onboarding: 1 } });
    } else {
      this.router.navigateByUrl('/cycles');
    }
  }

  cancelar() {
    const onboarding = this.route.snapshot.queryParamMap.get('onboarding') === '1';
    if (onboarding) {
      this.router.navigateByUrl('/start');
    } else {
      this.router.navigateByUrl('/cycles');
    }
  }
}
