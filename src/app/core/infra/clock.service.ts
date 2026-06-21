import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClockService {
  today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  now(): Date { return new Date(); }
  diffDays(a: Date, b: Date): number {
    const MS = 1000 * 60 * 60 * 24;
    return Math.round((a.getTime() - b.getTime()) / MS);
  }
}
