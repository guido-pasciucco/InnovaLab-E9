import React, { useState } from 'react';
import { ScrollView, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { FormField, PrimaryButton, ErrorText, Logo } from '../../components';
import { View } from 'react-native';
import { api, ApiError, friendlyMessage } from '../../api';
import { displayDateToIso } from '../../utils/dates';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'SignUp'>;

type Field = 'email' | 'password' | 'repeatPassword' | 'name' | 'birthDate';

/**
 * "Crear Cuenta" del Tutor. Flujo acordado con Backend:
 *  1. Firebase Auth crea la cuenta (la contraseña nunca llega a nuestro backend).
 *  2. POST /api/responsible-profile con nombre y fechaNacimiento (YYYY-MM-DD).
 * Si el paso 2 falla, la cuenta ya existe: el botón reintenta solo el perfil.
 */
export function SignUpScreen({ navigation }: Props) {
  const [form, setForm] = useState<Record<Field, string>>({
    email: '', password: '', repeatPassword: '', name: '', birthDate: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const update = (field: Field) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    const e: Partial<Record<Field, string>> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Ingresá un mail válido.';
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres.';
    if (form.repeatPassword !== form.password) e.repeatPassword = 'Las contraseñas no coinciden.';
    if (!form.name.trim()) e.name = 'Ingresá tu nombre.';
    const iso = displayDateToIso(form.birthDate);
    if (!iso) e.birthDate = 'Usá el formato DD/MM/AAAA.';
    setErrors(e);
    return Object.keys(e).length === 0 ? iso : null;
  };

  const handleCreateAccount = async () => {
    const fechaNacimiento = validate();
    if (!fechaNacimiento) return;
    setLoading(true);
    setFormError(null);
    try {
      if (!accountCreated) {
        await api.registerResponsible({
          email: form.email.trim(), password: form.password, nombre: form.name.trim(), fechaNacimiento,
        });
      } else {
        await api.completeResponsibleProfile({ nombre: form.name.trim(), fechaNacimiento });
      }
      navigation.replace('CreatePin');
    } catch (e) {
      // Si falló el perfil pero la cuenta Auth se creó, el próximo intento solo reintenta el perfil.
      const session = await api.getSession();
      if (session?.provider === 'password') setAccountCreated(true);
      setFormError(e instanceof ApiError && e.code.startsWith('auth/') ? friendlyMessage(e) : `${friendlyMessage(e)} Tocá de nuevo para reintentar.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 20 }}><Logo size={72} /></View>
      <FormField label="Mail" placeholder="tu@mail.com" value={form.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} editable={!accountCreated} />
      <FormField label="Contraseña" placeholder="Mínimo 6 caracteres" value={form.password} onChangeText={update('password')} secureTextEntry error={errors.password} editable={!accountCreated} />
      <FormField label="Repetí la contraseña" placeholder="" value={form.repeatPassword} onChangeText={update('repeatPassword')} secureTextEntry error={errors.repeatPassword} editable={!accountCreated} />
      <FormField label="Nombre" placeholder="" value={form.name} onChangeText={update('name')} error={errors.name} />
      <FormField label="Fecha de nacimiento" placeholder="DD/MM/AAAA" value={form.birthDate} onChangeText={update('birthDate')} keyboardType="numbers-and-punctuation" error={errors.birthDate} />

      <ErrorText>{formError}</ErrorText>
      {loading ? (
        <ActivityIndicator color="#FF9933" style={{ marginVertical: 16 }} />
      ) : (
        <PrimaryButton title={accountCreated ? 'Reintentar' : 'Crear Cuenta'} onPress={handleCreateAccount} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
});
