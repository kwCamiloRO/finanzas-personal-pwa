import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CopPipe } from '../pipes/cop.pipe';

export type MetricVariant = 'neutro' | 'verde' | 'amarillo' | 'rojo' | 'primary';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, CopPipe],
  template: `
    <div class="card" [class]="'variant-' + variant">
      <div class="label">
        @if (icon) { <mat-icon>{{ icon }}</mat-icon> }
        <span>{{ label }}</span>
      </div>
      <div class="value">
        @if (isCurrency) {
          {{ value | cop }}
        } @else {
          {{ value }}
        }
      </div>
      @if (hint) { <div class="hint">{{ hint }}</div> }
    </div>
  `,
  styles: [`
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .card.variant-verde     { background: var(--verde-50);  border-color: transparent; color: var(--verde-700); }
    .card.variant-amarillo  { background: var(--amar-50);   border-color: transparent; color: var(--amar-700); }
    .card.variant-rojo      { background: var(--rojo-50);   border-color: transparent; color: var(--rojo-700); }
    .card.variant-primary   { background: var(--primary);   color: #fff; border-color: transparent; }
    .label { display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.85; font-weight: 600; }
    .label mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .value { font-size: 22px; font-weight: 700; line-height: 1.2; }
    .hint  { font-size: 12px; opacity: 0.75; }
  `]
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() hint?: string;
  @Input() icon?: string;
  @Input() variant: MetricVariant = 'neutro';
  @Input() isCurrency = true;
}
