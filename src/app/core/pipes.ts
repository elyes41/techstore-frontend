import { Pipe, PipeTransform } from '@angular/core';

const dtFormat = new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis',
});

/** 1899 -> "1 899 DT" ; 8.5 -> "8,5 DT" */
@Pipe({ name: 'dt' })
export class DtPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return `${dtFormat.format(Number(value))} DT`;
  }
}

@Pipe({ name: 'dateTn' })
export class DateTnPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? dateFormat.format(new Date(value)) : '—';
  }
}

/** Pourcentage de remise arrondi, ex. -10 % */
export function discount(price: number, oldPrice: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round((1 - price / oldPrice) * 100);
}
