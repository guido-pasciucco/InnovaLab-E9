import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  /** Código de 6 caracteres alfanuméricos tal como lo devuelve Backend (ej. "G2TD8K"). */
  code: string;
  /** Vencimiento ISO (`expiraEn` de POST /api/link-codes; Backend usa 15 min). */
  expiresAt: string;
  onExpire?: () => void;
  onRequestNewCode?: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const secondsUntil = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));

/**
 * Muestra el código de vinculación con su cuenta regresiva.
 *
 * Backend confirmó que el QR contiene exactamente este mismo código, así que el
 * ingreso manual alcanza para el MVP. El QR (dibujarlo y escanearlo) queda
 * pendiente porque requiere sumar librerías de cámara/SVG.
 */
export function QrCodeDisplay({ code, expiresAt, onExpire, onRequestNewCode }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setSecondsLeft(secondsUntil(expiresAt));
    const interval = setInterval(() => {
      const left = secondsUntil(expiresAt);
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isExpired = secondsLeft <= 0;
  const isAboutToExpire = !isExpired && secondsLeft <= 60;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ingresá este código en el celular a proteger:</Text>
      <Text style={[styles.code, isExpired && styles.codeExpired]}>
        {isExpired ? '— — — — — —' : `${code.slice(0, 3)} ${code.slice(3)}`}
      </Text>

      {!isExpired ? (
        <Text style={[styles.timer, isAboutToExpire && styles.timerWarning]}>Vence en {formatTime(secondsLeft)}</Text>
      ) : (
        <TouchableOpacity style={styles.newCodeButton} onPress={onRequestNewCode}>
          <Text style={styles.newCodeButtonText}>Generar nuevo código</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF', borderRadius: 14, alignSelf: 'stretch', marginVertical: 16 },
  label: { fontSize: 14, color: '#555555', textAlign: 'center' },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 6, marginTop: 12, color: '#7C3AED' },
  codeExpired: { color: '#BBBBBB' },
  timer: { fontSize: 13, color: '#888888', marginTop: 12 },
  timerWarning: { color: '#F57C00', fontWeight: '700' },
  newCodeButton: { marginTop: 12, backgroundColor: '#7C3AED', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 24 },
  newCodeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
