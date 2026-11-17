export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const DB_ERRORS: Record<string, [number, string]> = {
  not_found: [404, 'No encontrado'],
  forbidden: [403, 'No tienes permiso para esta acción'],
  already_stamped: [409, 'Ya tienes el sello de este lugar en esta campaña'],
  invalid_state: [409, 'La operación no es válida en el estado actual'],
  no_active_campaign: [409, 'No hay una campaña activa'],
  invalid_code: [422, 'Código inválido o vencido'],
  already_redeemed: [409, 'Este cupón ya fue canjeado'],
  expired: [410, 'El cupón venció'],
  rate_limited: [429, 'Demasiados intentos. Espera unos minutos'],
  retry: [503, 'Intenta de nuevo'],
};

/** Convierte errores de PostgREST/RPC (raise ... message = code) a HttpError. */
export function fromDbError(err: { message?: string; details?: string | null; code?: string } | null): HttpError {
  const key = err?.message ?? '';
  const known = DB_ERRORS[key];
  if (known) return new HttpError(known[0], key, err?.details && err.details !== key ? err.details : known[1]);
  if (err?.code === '23505') return new HttpError(409, 'conflict', 'Operación duplicada');
  return new HttpError(500, 'internal', 'Error interno');
}
