import React from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

/** Campo de texto con el estilo del Figma: título arriba, fondo blanco y borde naranja suave. */
export function FormField({ error, label, ...props }: TextInputProps & { error?: string | null; label?: string }) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSoft}
        {...props}
        style={[styles.input, error ? styles.inputError : null, props.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Botón píldora: violeta (primary), con borde (outline) o rojo (danger). */
export function PrimaryButton({ title, onPress, disabled, variant = 'primary' }: {
  title: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'danger' | 'outline';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'danger' && styles.buttonDanger,
        variant === 'outline' && styles.buttonOutline,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'outline' && { color: colors.primary },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? <Text style={styles.formError}>{children}</Text> : null;
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14, alignSelf: 'stretch' },
  label: { fontSize: 14, color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.input,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  formError: { color: colors.danger, fontSize: 13, textAlign: 'center', marginVertical: 8 },
  button: {
    alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: colors.primary,
  },
  buttonDanger: { backgroundColor: colors.white, borderColor: colors.danger, borderWidth: 1.5 },
  buttonOutline: { backgroundColor: colors.white, borderColor: '#BDBDC7' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
