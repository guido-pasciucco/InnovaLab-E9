import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  /** Token o payload a codificar en el QR (lo sigue resolviendo Backend). */
  value: string;
  /**
   * Código numérico de 6 dígitos, tal como lo genera Backend
   * (colección `codigosVinculacion`: campo `codigo`, ej. "483920").
   */
  numericFallbackCode: string;
  /** Minutos de validez del código. Backend usa 15 min (`creadoEn` / `expiraEn`). */
  expiresInMinutes?: number;
  /** Se llama cuando el código expira, para que la pantalla pida uno nuevo. */
  onExpire?: () => void;
  /** Se llama cuando el usuario toca "Generar nuevo código" tras expirar. */
  onRequestNewCode?: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Vinculación por código de 6 dígitos con expiración, según el modelo real
 * de Backend (`codigosVinculacion`: codigo, creadoEn, expiraEn, usado).
 * El QR es un alias visual del mismo código; no es un token distinto.
 *
 * Pendiente: librería final de QR (ej. react-native-qrcode-svg) — por ahora
 * el QR es un placeholder visual.
 */
export function QrCodeDisplay({
  value,
  numericFallbackCode,
  expiresInMinutes = 15,
  onExpire,
  onRequestNewCode,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(expiresInMinutes * 60);

  useEffect(() => {
    setSecondsLeft(expiresInMinutes * 60);
  }, [numericFallbackCode, expiresInMinutes]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const isExpired = secondsLeft <= 0;
  const isAboutToExpire = !isExpired && secondsLeft <= 60;

  return (
    <View style={styles.container}>
      <View style={[styles.qrPlaceholder, isExpired && styles.qrPlaceholderExpired]}>
        <Text style={styles.qrPlaceholderText}>
          {isExpired ? 'Código vencido' : `QR: ${value}`}
        </Text>
      </View>

      <Text style={styles.fallbackLabel}>
        O ingresa manualmente el siguiente código único de vinculación:
      </Text>

      <Text style={[styles.fallbackCode, isExpired && styles.fallbackCodeExpired]}>
        {isExpired ? '— — — — — —' : numericFallbackCode}
      </Text>

      {!isExpired ? (
        <Text style={[styles.timer, isAboutToExpire && styles.timerWarning]}>
          Expira en {formatTime(secondsLeft)}
        </Text>
      ) : (
        <TouchableOpacity style={styles.newCodeButton} onPress={onRequestNewCode}>
          <Text style={styles.newCodeButtonText}>Generar nuevo código</Text>
        </TouchableOpacity>
      )}
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
  qrPlaceholderExpired: {
    backgroundColor: '#FCEAEA',
    borderColor: '#D32F2F',
  },
  qrPlaceholderText: {
    color: '#777777',
    fontSize: 12,
  },
  fallbackLabel: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },
  fallbackCode: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 8,
  },
  fallbackCodeExpired: {
    color: '#BBBBBB',
  },
  timer: {
    fontSize: 13,
    color: '#888888',
    marginTop: 12,
  },
  timerWarning: {
    color: '#F57C00',
    fontWeight: '700',
  },
  newCodeButton: {
    marginTop: 12,
    backgroundColor: '#1A4B8C',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  newCodeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
