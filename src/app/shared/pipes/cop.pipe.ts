import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'cop', standalone: true })
export class CopPipe implements PipeTransform {
  transform(value: number | string | null | undefined, withSymbol = true): string {
    if (value === null || value === undefined || value === '') {
      return withSymbol ? '$0' : '0';
    }
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return withSymbol ? '$0' : '0';

    const negativo = n < 0;
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    const out = withSymbol ? `$${formatted}` : formatted;
    return negativo ? `(${out})` : out;
  }
}
