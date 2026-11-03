import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PinInput, ErrorText } from '../../components';
import { api, friendlyMessage } from '../../api';

/**
 * Crear o cambiar el PIN del adulto responsable (Semana 8: acciones protegidas).
 * Se usa en dos lugares:
 *  - Onboarding ("CreatePin"): después de crear la cuenta, sigue a vincular dispositivo.
 *  - Configuración ("ChangePin"): se llega después de validar el PIN actual.
 *
 * El PIN viaja a Backend, que guarda solo el hash (pinHash). Endpoint pendiente:
 * PUT /api/responsible-profile/pin — mientras tanto se simula.
 */
export function SetPinScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<{ LinkDevice: { role: 'responsable' } }>>();
  const isOnboarding = route.name === 'CreatePin';

  const [first, setFirst] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleComplete = async (pin: string) => {
    if (first === null) {
      if (/^(\d)\1{3}$/.test(pin) || pin === '1234') {
        setError('Elegí un PIN menos fácil de adivinar.');
        setAttempt((a) => a + 1);
        return;
      }
      setFirst(pin);
      setError(null);
      setAttempt((a) => a + 1);
      return;
    }
    if (pin !== first) {
      setError('Los PIN no coinciden. Empezá de nuevo.');
      setFirst(null);
      setAttempt((a) => a + 1);
      return;
    }
    setSaving(true);
    try {
      await api.setPin(pin);
      if (isOnboarding) {
        navigation.replace('LinkDevice', { role: 'responsable' });
      } else {
        setDone(true);
      }
    } catch (e) {
      setError(friendlyMessage(e));
      setFirst(null);
      setAttempt((a) => a + 1);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>PIN actualizado</Text>
        <Text style={styles.subtitle}>Desde ahora, los cambios críticos se autorizan con el nuevo PIN.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{first === null ? 'Creá tu PIN de 4 dígitos' : 'Repetí el PIN'}</Text>
      <Text style={styles.subtitle}>
        Lo vas a usar para autorizar cambios importantes, como desactivar la protección o desvincular un
        dispositivo. Es distinto de tu contraseña.
      </Text>
      {saving ? <ActivityIndicator color="#FF9933" /> : <PinInput key={attempt} onComplete={handleComplete} />}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666666', textAlign: 'center', marginBottom: 24 },
});
