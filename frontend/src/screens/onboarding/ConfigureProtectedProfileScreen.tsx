import React, { useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FormField, PrimaryButton, ErrorText } from '../../components';
import { api, friendlyMessage } from '../../api';
import { useAppMode } from '../../state/AppModeContext';
import { displayDateToIso } from '../../utils/dates';

type Route = RouteProp<{ ConfigureProtectedProfile: { deviceId: string } }, 'ConfigureProtectedProfile'>;

/**
 * "Configurá el perfil protegido": el Tutor carga los datos del menor después
 * de que el otro celular canjeó el código. Endpoint real:
 * POST /api/devices/{deviceId}/protected-profile (con el token del Tutor).
 */
export function ConfigureProtectedProfileScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const { mode, chooseMode } = useAppMode();
  const { deviceId } = route.params;

  const [form, setForm] = useState({ nombre: '', apellido: '', fechaNacimiento: '', parentesco: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateProfile = async () => {
    const fechaNacimiento = displayDateToIso(form.fechaNacimiento);
    if (!form.nombre.trim() || !form.apellido.trim() || !form.parentesco.trim()) {
      setError('Completá todos los campos.');
      return;
    }
    if (!fechaNacimiento) {
      setError('La fecha de nacimiento va como DD/MM/AAAA.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createProtectedProfile(deviceId, {
        nombre: form.nombre.trim(), apellido: form.apellido.trim(), fechaNacimiento, parentesco: form.parentesco.trim(),
      });
      if (mode === null) {
        await chooseMode('responsable'); // fin del onboarding: RootNavigator pasa a las pestañas
      } else {
        navigation.popToTop(); // vino desde Familia > Agregar un familiar
      }
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Configurá el perfil protegido</Text>
      <Text style={styles.subtitle}>¡El celular quedó vinculado! Contanos de quién es.</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>👤</Text></View>
      <FormField label="Nombre" placeholder="" value={form.nombre} onChangeText={update('nombre')} />
      <FormField label="Apellido" placeholder="" value={form.apellido} onChangeText={update('apellido')} />
      <FormField label="Fecha de nacimiento" placeholder="DD/MM/AAAA" value={form.fechaNacimiento} onChangeText={update('fechaNacimiento')} keyboardType="numbers-and-punctuation" />
      <FormField label="Parentesco" placeholder="ej. hijo, sobrina" value={form.parentesco} onChangeText={update('parentesco')} />
      <ErrorText>{error}</ErrorText>
      {loading ? <ActivityIndicator color="#FF9933" /> :  <PrimaryButton title="Crear Perfil" onPress={handleCreateProfile} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666666', textAlign: 'center', marginBottom: 16 },
  avatar: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: '#DDDDE3', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  avatarText: { fontSize: 48, opacity: 0.6 },
});
