import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { PinInput } from './PinInput';
import { api, ApiError } from '../api';
import { attemptsLeft, lockRemainingMs, registerFailure, registerSuccess } from '../security/pinAttempts';
import { colors, radius } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  description: string;
  onVerified: () => void;
  onCancel: () => void;
  /** Se llama en cada PIN incorrecto (para registrar el intento como evento). */
  onFailedAttempt?: () => void;
}

const formatWait = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`;
};

/**
 * Compuerta de PIN para cambios críticos (desactivar protección, desvincular,
 * quitar sitios, cambiar PIN).
 *
 * Semana 9:
 *  - El bloqueo por intentos fallidos es persistente y escalonado (ver pinAttempts.ts).
 *  - Sin conexión NO cuenta como intento fallido: se avisa que no se puede
 *    autorizar el cambio sin internet (decisión acordada con Backend).
 */
export function PinGateModal({ visible, title, description, onVerified, onCancel, onFailedAttempt }: Props) {
  const [checking, setChecking] = useState(false);
  const [lockedMs, setLockedMs] = useState(0);
  const [left, setLeft] = useState(3);
  const [wrong, setWrong] = useState(false);
  const [offline, setOffline] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  // Al abrir: leer el estado guardado (el bloqueo sigue aunque se haya cerrado el modal).
  useEffect(() => {
    if (!visible) return;
    setChecking(false);
    setWrong(false);
    setOffline(false);
    setInputKey((k) => k + 1);
    lockRemainingMs().then(setLockedMs);
    attemptsLeft().then(setLeft);
  }, [visible]);

  // Cuenta regresiva del bloqueo.
  useEffect(() => {
    if (!visible || lockedMs <= 0) return;
    const t = setTimeout(() => lockRemainingMs().then(setLockedMs), 1000);
    return () => clearTimeout(t);
  }, [visible, lockedMs]);

  const handleComplete = async (pin: string) => {
    setChecking(true);
    setOffline(false);
    let ok = false;
    try {
      ok = await api.verifyPin(pin);
    } catch (e) {
      setChecking(false);
      setInputKey((k) => k + 1);
      const isNetwork = e instanceof ApiError && (e.code === 'network_error' || e.code === 'timeout');
      setOffline(isNetwork);
      if (!isNetwork) setWrong(true);
      return;
    }
    setChecking(false);
    if (ok) {
      await registerSuccess();
      onVerified();
      return;
    }
    onFailedAttempt?.();
    const result = await registerFailure();
    setInputKey((k) => k + 1);
    setWrong(true);
    setLeft(result.attemptsLeft);
    setLockedMs(result.lockedMs);
  };

  const locked = lockedMs > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {checking ? (
            <ActivityIndicator color={colors.orange} style={{ marginVertical: 16 }} />
          ) : locked ? (
            <Text style={styles.error}>Demasiados intentos. Probá de nuevo en {formatWait(lockedMs)}.</Text>
          ) : (
            <PinInput key={inputKey} onComplete={handleComplete} />
          )}

          {offline && !checking && (
            <Text style={styles.error}>Sin conexión. Los cambios críticos solo se pueden autorizar con internet.</Text>
          )}
          {wrong && !locked && !checking && !offline && (
            <Text style={styles.error}>PIN incorrecto ({left} {left === 1 ? 'intento restante' : 'intentos restantes'}).</Text>
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
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 24, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: colors.text },
  description: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13, textAlign: 'center' },
  cancel: { marginTop: 20 },
  cancelText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
