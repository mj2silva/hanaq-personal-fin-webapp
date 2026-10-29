export function formatMoney(value: number, currency: 'PEN' | 'USD'): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value);
}

export function formatShortDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date(isoTimestamp));
}

/** YYYY-MM of a timestamp in the Lima time zone, used for month filters. */
export function toLimaMonth(isoTimestamp: string): string {
  return new Date(isoTimestamp)
    .toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
    .slice(0, 7);
}
