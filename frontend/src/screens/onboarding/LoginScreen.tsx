import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { FormField, PrimaryButton, ErrorText, Logo } from '../../components';
import { colors } from '../../theme';
import { api, friendlyMessage } from '../../api';
import { useAppMode } from '../../state/AppModeContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Login'>;

/**
 * Login del Tutor con Firebase Auth (email y contraseña).
 * Una cuenta existente va directo a las pestañas del Tutor; los dispositivos
 * nuevos se agregan desde "Familia".
 */
export function LoginScreen({ navigation }: Props) {
  const { chooseMode } = useAppMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Completá mail y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.loginResponsible(email.trim(), password);
      await chooseMode('responsable');
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logo}><Logo size={72} /></View>
      <Text style={styles.title}>INICIÁ SESIÓN CON TU MAIL</Text>
      {api.isDemoMode && <Text style={styles.demo}>Modo demo: cualquier mail y contraseña funcionan.</Text>}

      <FormField label="Mail" placeholder="tu@mail.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="Contraseña" placeholder="••••••" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity onPress={() => setInfo('La recuperación de contraseña llega en el próximo sprint.')}>
        <Text style={styles.link}>¿Olvidaste la contraseña?</Text>
      </TouchableOpacity>

      <ErrorText>{error}</ErrorText>
      {loading ? <ActivityIndicator color="#FF9933" style={{ marginVertical: 16 }} /> : <PrimaryButton title="INICIAR SESIÓN" onPress={handleLogin} />}

      {/* Login social: Backend solo habilitó email/contraseña. Se deja visible según el diseño, pero avisa. */}
      <Text style={styles.divider}>O</Text>
      {[['Google', 'G'], ['Facebook', 'f'], ['X', '𝕏']].map(([p, icon]) => (
        <TouchableOpacity key={p} style={styles.socialButton} onPress={() => setInfo(`El ingreso con ${p} todavía no está disponible.`)}>
          <View style={styles.socialIcon}><Text style={styles.socialIconText}>{icon}</Text></View>
          <Text style={styles.socialButtonText}>Iniciar sesión con {p}</Text>
        </TouchableOpacity>
      ))}
      {info && <Text style={styles.info}>{info}</Text>}

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.signUpLink}>¿Sos nuevo? Crear cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingVertical: 8, justifyContent: 'center', backgroundColor: colors.background },
  logo: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 15, letterSpacing: 0.5, marginBottom: 18, textAlign: 'center', color: colors.text },
  demo: { backgroundColor: '#FFF3CD', color: '#7A5B00', padding: 8, borderRadius: 8, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  link: { color: colors.primaryLight, fontSize: 13, marginBottom: 8, textAlign: 'center', textDecorationLine: 'underline', fontWeight: '600' },
  divider: { textAlign: 'center', color: colors.text, marginVertical: 10 },
  socialButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDC7', backgroundColor: colors.white, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 10 },
  socialIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  socialIconText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  socialButtonText: { fontSize: 14, color: colors.text },
  info: { color: '#555555', fontSize: 12, textAlign: 'center', marginTop: 4 },
  signUpLink: { color: '#7C3AED', fontSize: 14, textAlign: 'center', marginTop: 16, fontWeight: '600' },
});
