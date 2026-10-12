import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { AppModeStorage } from '../../storage/appModeStorage';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Login'>;

const SOCIAL_PROVIDERS = ['Google', 'Facebook', 'X'] as const;

/**
 * Pantalla de login (diseño UX): mail + contraseña, login social y
 * acceso a "Crear Cuenta". La integración real de cada proveedor
 * (Firebase Auth) se resuelve en Backend/Sprint 2.
 */
export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // TODO: reemplazar por login real contra Firebase Auth / backend.
    await AppModeStorage.setMode('responsable');
    navigation.navigate('LinkDevice', { role: 'responsable' });
  };

  const handleSocialLogin = async (provider: (typeof SOCIAL_PROVIDERS)[number]) => {
    console.log(`[mock] Login social con ${provider}`);
    await handleLogin();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inicia sesión con tu mail</Text>

      <TextInput
        style={styles.input}
        placeholder="Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity>
        <Text style={styles.forgotPassword}>¿Has olvidado la contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.divider}>O</Text>

      {SOCIAL_PROVIDERS.map((provider) => (
        <TouchableOpacity
          key={provider}
          style={styles.socialButton}
          onPress={() => handleSocialLogin(provider)}
        >
          <Text style={styles.socialButtonText}>Iniciar sesión con {provider}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.signUpLink}>¿Sos Nuevo? Crear Cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 14 },
  forgotPassword: { color: '#1A4B8C', fontSize: 13, marginBottom: 20, textAlign: 'right' },
  primaryButton: { backgroundColor: '#1A4B8C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  divider: { textAlign: 'center', color: '#999999', marginBottom: 16 },
  socialButton: { borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  socialButtonText: { fontSize: 14, color: '#333333' },
  signUpLink: { color: '#1A4B8C', fontSize: 14, textAlign: 'center', marginTop: 16, fontWeight: '600' },
});
