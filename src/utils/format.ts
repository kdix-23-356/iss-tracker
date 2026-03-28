const pad = (n: number) => String(n).padStart(2, '0');

export function formatTimeHMS(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDateTimeMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${formatTimeHMS(d)}`;
}