import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { AppModeStorage } from '../../storage/appModeStorage';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'SignUp'>;

/**
 * Pantalla "Crear Cuenta" del Tutor (diseño UX): mail, contraseña,
 * repetir contraseña, nombre y fecha de nacimiento.
 */
export function SignUpScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    email: '', password: '', repeatPassword: '', name: '', birthDate: '',
  });

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateAccount = async () => {
    // TODO: validar y crear la cuenta real contra Backend.
    await AppModeStorage.setMode('responsable');
    navigation.navigate('LinkDevice', { role: 'responsable' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>

      <TextInput style={styles.input} placeholder="Mail" value={form.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Contraseña" value={form.password} onChangeText={update('password')} secureTextEntry />
      <TextInput style={styles.input} placeholder="Repita la Contraseña" value={form.repeatPassword} onChangeText={update('repeatPassword')} secureTextEntry />
      <TextInput style={styles.input} placeholder="Nombre" value={form.name} onChangeText={update('name')} />
      <TextInput style={styles.input} placeholder="Fecha de Nacimiento (DD/MM/AA)" value={form.birthDate} onChangeText={update('birthDate')} />

      <TouchableOpacity style={styles.primaryButton} onPress={handleCreateAccount}>
        <Text style={styles.primaryButtonText}>Crear Cuenta</Text>
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
