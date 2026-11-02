/** Error uniforme para todo lo que venga de Backend o de Firebase Auth. */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Códigos que conocemos -> mensajes para mostrar al usuario (tono de UX: claro, sin jerga). */
const FRIENDLY: Record<string, string> = {
  network_error: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
  timeout: 'El servidor tardó demasiado en responder. Intentá de nuevo.',
  // Firebase Auth
  'auth/EMAIL_EXISTS': 'Ya existe una cuenta con ese mail.',
  'auth/INVALID_LOGIN_CREDENTIALS': 'Mail o contraseña incorrectos.',
  'auth/INVALID_PASSWORD': 'Mail o contraseña incorrectos.',
  'auth/EMAIL_NOT_FOUND': 'Mail o contraseña incorrectos.',
  'auth/INVALID_EMAIL': 'El mail no es válido.',
  'auth/WEAK_PASSWORD': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/TOO_MANY_ATTEMPTS_TRY_LATER': 'Demasiados intentos. Esperá unos minutos.',
  // Backend (códigos reales de la rama backend)
  invalid_name: 'Revisá el nombre.',
  invalid_birth_date: 'La fecha de nacimiento no es válida (DD/MM/AAAA).',
  responsible_profile_already_exists: 'Esta cuenta ya tiene un perfil con otros datos.',
  responsible_profile_not_found: 'Tu cuenta no tiene un perfil completo. Volvé a registrarte.',
  invalid_code_format: 'El código tiene 6 letras o números.',
  link_code_not_found: 'Ese código no existe. Revisalo con el adulto responsable.',
  link_code_expired: 'El código venció. Pedile al adulto que genere uno nuevo.',
  link_code_already_used: 'Ese código ya se usó. Pedile al adulto uno nuevo.',
  device_already_registered: 'Este celular ya está vinculado.',
  invalid_device_data: 'Revisá el nombre del dispositivo.',
  invalid_protected_profile: 'Completá nombre, apellido y parentesco.',
  protected_profile_already_exists: 'Este dispositivo ya tiene un perfil con otros datos.',
  device_not_found: 'No encontramos ese dispositivo.',
  device_access_denied: 'No tenés permiso sobre ese dispositivo.',
  link_code_generation_failed: 'No pudimos generar el código. Intentá de nuevo.',
  blocklist_not_published: 'Todavía no hay una lista oficial publicada.',
  blocklist_unavailable: 'La lista oficial no está disponible en este momento.',
  unauthorized: 'Tu sesión venció. Volvé a iniciar sesión.',
};

export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY[error.code] ?? error.message ?? 'Ocurrió un error inesperado.';
  }
  return 'Ocurrió un error inesperado.';
}
