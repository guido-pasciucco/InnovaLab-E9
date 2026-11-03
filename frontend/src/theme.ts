/**
 * Estilo visual de BA Protege+, tomado del Figma de UX/UI ("BA PROTEGE PRUEBA").
 * Usar SIEMPRE estos valores en vez de escribir colores sueltos en las pantallas.
 */
export const colors = {
  /** Violeta de botones y textos destacados ("Protección Activa"). */
  primary: '#7C3AED',
  /** Violeta claro: letra "A" del logo y acentos. */
  primaryLight: '#9966FF',
  /** Fondo del ícono activo en la barra inferior. */
  primarySoft: '#DEC0FF',
  /** Celeste: letra "B" del logo. */
  cyan: '#06B6D4',
  /** Naranja: "+" del logo, spinner y bordes de los campos. */
  orange: '#FF9933',
  inputBorder: '#FFCF9E',
  /** Fondo general (en el Figma es un degradé lavanda -> celeste; acá el tono medio). */
  background: '#EEEDFF',
  backgroundTop: '#F1E9FF',
  backgroundBottom: '#E0F2FE',
  card: '#FFFFFF',
  border: '#DFDFDF',
  text: '#1D1B20',
  textMuted: '#5F5F68',
  textSoft: '#8A8A93',
  success: '#22A447',
  warning: '#F57C00',
  danger: '#E5383B',
  white: '#FFFFFF',
};

export const radius = {
  input: 8,
  card: 16,
  pill: 999,
};

/** Tarjeta blanca redondeada, como "Estado de la protección" o "Bloqueos exitosos". */
export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
} as const;

/** Lista dentro de una tarjeta blanca (alertas, bloqueos, familia, actividad). */
export const cardListStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 16,
  paddingVertical: 4,
  marginBottom: 16,
} as const;
