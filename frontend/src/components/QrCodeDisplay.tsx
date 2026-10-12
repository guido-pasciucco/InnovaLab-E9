import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  /** Token o payload a codificar en el QR. Pendiente de confirmar con Backend
   * si es un token temporal emitido por el servidor. */
  value: string;
  numericFallbackCode: string;
}

/**
 * Placeholder de visualización de QR. Falta decidir la librería final
 * (ej. react-native-qrcode-svg) una vez que Backend confirme el formato
 * del token de vinculación (ver pregunta abierta con UX/UI y Backend).
 */
export function QrCodeDisplay({ value, numericFallbackCode }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.qrPlaceholder}>
        <Text style={styles.qrPlaceholderText}>QR: {value}</Text>
      </View>
      <Text style={styles.fallbackLabel}>O ingresa manualmente el siguiente código único de vinculación:</Text>
      <Text style={styles.fallbackCode}>{numericFallbackCode}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrPlaceholderText: {
    color: '#777777',
    fontSize: 12,
  },
  fallbackLabel: {
    fontSize: 14,
    color: '#555555',
  },
  fallbackCode: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 8,
  },
});
