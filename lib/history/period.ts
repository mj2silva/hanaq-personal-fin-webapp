export function resolveHistoryPeriod(value: string | string[] | undefined, current: string): string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '0001-01' && value <= current ? value : current;
}

export function historyYearEnd(period: string, current: string): string {
  return period.slice(0, 4) === current.slice(0, 4) ? current : `${period.slice(0, 4)}-12`;
}