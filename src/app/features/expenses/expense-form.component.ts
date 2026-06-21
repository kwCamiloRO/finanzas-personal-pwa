import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ExpenseService } from '../../core/services/expense.service';
import { CycleService } from '../../core/services/cycle.service';
import { GastoRepository } from '../../core/data/gasto.repository';
import { GASTO_CATEGORIAS, GastoCategoria } from '../../core/domain';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatCardModule, MatChipsModule, MatDatepickerModule, MatSelectModule,
  ],
  template: `
    <section class="page">
      <h2 class="page-title">{{ editId() ? 'Editar gasto' : 'Gasto rápido' }}</h2>

      <mat-card><mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="full-form">
          <mat-form-field appearance="outline" class="big-input">
            <mat-label>¿Cuánto?</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" inputmode="numeric" min="1"
                   formControlName="valor" required autofocus>
          </mat-form-field>

          <div>
            <label class="block-label">Categoría</label>
            <mat-chip-listbox formControlName="categoria" required>
              @for (cat of categorias; track cat) {
                <mat-chip-option [value]="cat">{{ cat }}</mat-chip-option>
              }
            </mat-chip-listbox>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Nota (opcional)</mat-label>
            <input matInput formControlName="comentario">
          </mat-form-field>

          <details class="avanzado">
            <summary>Opciones avanzadas</summary>
            <div class="full-form" style="margin-top: 12px;">
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
                    <mat-option [value]="c.id">{{ c.id }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </details>

          <div class="form-actions">
            <button type="button" mat-button (click)="cancelar()">Cancelar</button>
            <button type="submit" mat-flat-button color="primary"
                    [disabled]="form.invalid || saving()">
              <mat-icon>save</mat-icon> Guardar
            </button>
          </div>
        </form>
      </mat-card-content></mat-card>
    </section>
  `,
  styles: [`
    .big-input ::ng-deep .mat-mdc-form-field-input-control { font-size: 28px; font-weight: 700; }
    .block-label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
    .avanzado { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
    .avanzado summary { cursor: pointer; font-weight: 600; color: var(--muted); }
  `]
})
export class ExpenseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expense = inject(ExpenseService);
  protected cycles = inject(CycleService);
  private repo = inject(GastoRepository);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  categorias = GASTO_CATEGORIAS;
  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    valor: [null as number | null, [Validators.required, Validators.min(1)]],
    categoria: ['Otro' as GastoCategoria, Validators.required],
    comentario: [''],
    fecha: [new Date() as Date | null, Validators.required],
    cicloId: ['', Validators.required],
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      const g = (await this.repo.list()).find(x => x.id === id);
      if (g) {
        this.form.patchValue({
          valor: g.valor, categoria: g.categoria, comentario: g.comentario ?? '',
          fecha: new Date(g.fecha), cicloId: g.cicloId,
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
      await this.expense.actualizar(this.editId()!, {
        valor: Number(v.valor),
        categoria: v.categoria as GastoCategoria,
        comentario: v.comentario ?? '',
        fecha: v.fecha as Date,
        cicloId: v.cicloId!,
      });
    } else {
      await this.expense.crear({
        valor: Number(v.valor),
        categoria: v.categoria as GastoCategoria,
        comentario: v.comentario ?? undefined,
        fecha: v.fecha as Date,
        cicloId: v.cicloId!,
      });
    }
    this.router.navigateByUrl('/expenses');
  }

  cancelar() { this.router.navigateByUrl('/expenses'); }
}
