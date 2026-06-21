import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="empty">
      <mat-icon class="icon">{{ icon }}</mat-icon>
      <h3>{{ title }}</h3>
      @if (subtitle) { <p>{{ subtitle }}</p> }
      @if (ctaLabel && ctaLink) {
        <a mat-raised-button color="primary" [routerLink]="ctaLink">{{ ctaLabel }}</a>
      }
    </div>
  `,
  styles: [`
    .empty {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 48px 24px; color: var(--muted);
    }
    .icon { font-size: 56px; height: 56px; width: 56px; color: var(--border); }
    h3 { margin: 8px 0 4px; color: var(--text); font-size: 18px; }
    p  { margin: 0 0 16px; font-size: 14px; }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Sin datos';
  @Input() subtitle?: string;
  @Input() ctaLabel?: string;
  @Input() ctaLink?: string;
}
