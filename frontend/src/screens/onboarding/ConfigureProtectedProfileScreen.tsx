import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ConfigureProtectedProfile'>;

/**
 * "Configura el Perfil Protegido" (diseño UX): el Tutor completa los
 * datos del menor luego de que la vinculación QR/código fue exitosa.
 */
export function ConfigureProtectedProfileScreen({ navigation }: Props) {
  const [form, setForm] = useState({ nombre: '', apellido: '', fechaNacimiento: '', parentesco: '' });

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateProfile = () => {
    // TODO: guardar el perfil protegido contra Backend, asociado al dispositivo recién vinculado.
    navigation.getParent()?.navigate('ResponsibleTabs' as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configura el Perfil Protegido</Text>

      <TextInput style={styles.input} placeholder="Nombre" value={form.nombre} onChangeText={update('nombre')} />
      <TextInput style={styles.input} placeholder="Apellido" value={form.apellido} onChangeText={update('apellido')} />
      <TextInput style={styles.input} placeholder="Fecha de Nacimiento (DD/MM/AA)" value={form.fechaNacimiento} onChangeText={update('fechaNacimiento')} />
      <TextInput style={styles.input} placeholder="Parentesco" value={form.parentesco} onChangeText={update('parentesco')} />

      <TouchableOpacity style={styles.primaryButton} onPress={handleCreateProfile}>
        <Text style={styles.primaryButtonText}>Crear Perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 14 },
  primaryButton: { backgroundColor: '#1A4B8C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
