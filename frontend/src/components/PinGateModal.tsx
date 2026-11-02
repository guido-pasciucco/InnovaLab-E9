import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { PinInput } from './PinInput';
import { api } from '../api';

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

interface Props {
  visible: boolean;
  title: string;
  description: string;
  onVerified: () => void;
  onCancel: () => void;
  /** Se llama en cada PIN incorrecto (para registrar el intento como evento). */
  onFailedAttempt?: () => void;
}

/**
 * Compuerta de PIN para "cambios críticos" (Desafío 5 del informe de UX):
 * desactivar la protección, cambiar de modo, desvincular un dispositivo.
 *
 * - El PIN siempre se verifica contra Backend (api.verifyPin; mock hasta que exista
 *   el endpoint) — nunca localmente. Sin conexión, el cambio no se autoriza.
 * - Tras 3 intentos fallidos se bloquea 30 s para frenar el "probar PINs".
 *   OJO: este bloqueo es solo de UX; el límite real de intentos debe
 *   imponerlo Backend (pendiente de coordinar).
 */
export function PinGateModal({ visible, title, description, onVerified, onCancel, onFailedAttempt }: Props) {
  const [checking, setChecking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);
  const [inputKey, setInputKey] = useState(0);

  // Reiniciar al abrir.
  useEffect(() => {
    if (visible) {
      setChecking(false);
      setFailedAttempts(0);
      setLockedFor(0);
      setInputKey((k) => k + 1);
    }
  }, [visible]);

  // Cuenta regresiva del bloqueo.
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  const handleComplete = async (pin: string) => {
    setChecking(true);
    let ok = false;
    try {
      ok = await api.verifyPin(pin);
    } catch {
      // Sin conexión no se autoriza el cambio (propuesta de Backend: no encolar cambios críticos offline).
      ok = false;
    }
    setChecking(false);
    if (ok) {
      onVerified();
      return;
    }
    onFailedAttempt?.();
    const attempts = failedAttempts + 1;
    setInputKey((k) => k + 1); // limpia el campo
    if (attempts >= MAX_ATTEMPTS) {
      setFailedAttempts(0);
      setLockedFor(LOCKOUT_SECONDS);
    } else {
      setFailedAttempts(attempts);
    }
  };

  const locked = lockedFor > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {checking ? (
            <ActivityIndicator color="#FF9933" style={{ marginVertical: 16 }} />
          ) : locked ? (
            <Text style={styles.error}>
              Demasiados intentos. Probá de nuevo en {lockedFor} s.
            </Text>
          ) : (
            <PinInput key={inputKey} onComplete={handleComplete} />
          )}

          {failedAttempts > 0 && !locked && !checking && (
            <Text style={styles.error}>
              PIN incorrecto ({MAX_ATTEMPTS - failedAttempts} intentos restantes).
            </Text>
          )}

          <TouchableOpacity onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  description: { fontSize: 13, color: '#666666', textAlign: 'center', marginBottom: 20 },
  error: { color: '#D32F2F', marginTop: 12, fontSize: 13, textAlign: 'center' },
  cancel: { marginTop: 20 },
  cancelText: { color: '#7C3AED', fontSize: 14 },
});
