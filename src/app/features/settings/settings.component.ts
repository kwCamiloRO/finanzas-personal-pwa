import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { ConfigRepository } from '../../core/data/config.repository';
import { db } from '../../core/data/finanzas.db';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatCardModule, MatSnackBarModule,
  ],
  template: `
    <section class="page">
      <h2 class="page-title">Configuración</h2>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="full-form">
            <h3 class="section-title">Parámetros principales</h3>

            <mat-form-field appearance="outline">
              <mat-label>Ingreso base mensual (COP)</mat-label>
              <input matInput type="number" formControlName="ingresoBase" inputmode="numeric">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fondo Operativo (COP)</mat-label>
              <input matInput type="number" formControlName="fondoOperativo" inputmode="numeric">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Frecuencia de pago</mat-label>
              <mat-select formControlName="frecuenciaPago">
                <mat-option value="QUINCENAL">Quincenal</mat-option>
                <mat-option value="MENSUAL">Mensual</mat-option>
                <mat-option value="VARIABLE">Variable</mat-option>
              </mat-select>
            </mat-form-field>

            <h3 class="section-title">Umbrales del semáforo</h3>

            <mat-form-field appearance="outline">
              <mat-label>Umbral VERDE (DLR ≥)</mat-label>
              <input matInput type="number" formControlName="umbralVerde" inputmode="numeric">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Umbral AMARILLO (DLR ≥)</mat-label>
              <input matInput type="number" formControlName="umbralAmarillo" inputmode="numeric">
            </mat-form-field>

            <h3 class="section-title">Umbrales Necesidad de Financiamiento</h3>

            <mat-form-field appearance="outline">
              <mat-label>Sin necesidad (NF ≤)</mat-label>
              <input matInput type="number" formControlName="umbralNFModerada" inputmode="numeric">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Crítica (NF >)</mat-label>
              <input matInput type="number" formControlName="umbralNFCritica" inputmode="numeric">
            </mat-form-field>

            <div class="form-actions">
              <button type="submit" mat-flat-button color="primary" [disabled]="saving()">
                <mat-icon>save</mat-icon> Guardar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card style="margin-top: 16px;">
        <mat-card-content>
          <h3 class="section-title">Datos locales</h3>
          <p class="muted">Todos tus datos viven en este dispositivo (IndexedDB). Nada sale a internet.</p>
          <div class="row" style="gap: 8px;">
            <button mat-stroked-button (click)="exportarBackup()">
              <mat-icon>download</mat-icon> Exportar respaldo JSON
            </button>
            <button mat-stroked-button color="warn" (click)="borrarTodo()">
              <mat-icon>delete_forever</mat-icon> Borrar todo
            </button>
          </div>
          <p class="muted small" style="margin-top: 12px;">v {{ version }} · esquema {{ schemaVersion }}</p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [`
    .section-title { margin: 8px 0 4px; font-size: 13px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px; font-weight: 700; }
    .small { font-size: 12px; }
  `]
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private configRepo = inject(ConfigRepository);
  private snackbar = inject(MatSnackBar);

  version = environment.appVersion;
  schemaVersion = environment.schemaVersion;
  saving = signal(false);

  form = this.fb.group({
    ingresoBase: [0, Validators.min(0)],
    fondoOperativo: [0, Validators.min(0)],
    frecuenciaPago: ['QUINCENAL'],
    umbralVerde: [1500000, Validators.min(0)],
    umbralAmarillo: [500000, Validators.min(0)],
    umbralNFModerada: [0, Validators.min(0)],
    umbralNFCritica: [1500000, Validators.min(0)],
  });

  async ngOnInit() {
    this.form.patchValue({
      ingresoBase:      await this.configRepo.getNumber('IngresoBase'),
      fondoOperativo:   await this.configRepo.getNumber('FondoOperativo'),
      frecuenciaPago:   (await this.configRepo.getValor('FrecuenciaPago')) ?? 'QUINCENAL',
      umbralVerde:      await this.configRepo.getNumber('UmbralVerde', 1500000),
      umbralAmarillo:   await this.configRepo.getNumber('UmbralAmarillo', 500000),
      umbralNFModerada: await this.configRepo.getNumber('UmbralNFModerada', 0),
      umbralNFCritica:  await this.configRepo.getNumber('UmbralNFCritica', 1500000),
    });
  }

  async guardar() {
    this.saving.set(true);
    const v = this.form.value;
    await this.configRepo.set('IngresoBase', String(v.ingresoBase ?? 0));
    await this.configRepo.set('FondoOperativo', String(v.fondoOperativo ?? 0));
    await this.configRepo.set('FrecuenciaPago', v.frecuenciaPago ?? 'QUINCENAL');
    await this.configRepo.set('UmbralVerde', String(v.umbralVerde ?? 1500000));
    await this.configRepo.set('UmbralAmarillo', String(v.umbralAmarillo ?? 500000));
    await this.configRepo.set('UmbralNFModerada', String(v.umbralNFModerada ?? 0));
    await this.configRepo.set('UmbralNFCritica', String(v.umbralNFCritica ?? 1500000));
    this.saving.set(false);
    this.snackbar.open('Configuración guardada', 'OK', { duration: 2000 });
  }

  async exportarBackup() {
    const bundle = {
      version: environment.schemaVersion,
      appVersion: environment.appVersion,
      generadoEn: new Date().toISOString(),
      datos: {
        config:       await db.config.toArray(),
        ciclos:       await db.ciclos.toArray(),
        ingresos:     await db.ingresos.toArray(),
        obligaciones: await db.obligaciones.toArray(),
        compromisos:  await db.compromisos.toArray(),
        pagos:        await db.pagos.toArray(),
        gastos:       await db.gastos.toArray(),
        deudas:       await db.deudas.toArray(),
      }
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackbar.open('Respaldo descargado', 'OK', { duration: 2000 });
  }

  async borrarTodo() {
    if (!confirm('⚠️ Esto borrará TODOS tus datos locales. ¿Continuar?')) return;
    if (!confirm('Última confirmación: ¿borrar definitivamente?')) return;
    await db.delete();
    location.reload();
  }
}
