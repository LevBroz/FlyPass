const TZ = 'America/El_Salvador';

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-SV', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
