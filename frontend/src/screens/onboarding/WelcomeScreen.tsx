import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

/**
 * Pantalla de bienvenida (según diseño UX: "Inicio sesión Tutor").
 * Dos caminos: Tutor (adulto responsable) o vincular directamente
 * un dispositivo protegido (si ya existe una cuenta Tutor creada).
 */
export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>BA+ Protege</Text>
      <Text style={styles.tagline}>
        Aplicación de protección a menores para sitios de apuestas ilegales
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.primaryButtonText}>Continuar como Tutor</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('LinkDevice', { role: 'protegido' })}
      >
        <Text style={styles.secondaryButtonText}>Vincular Dispositivo protegido</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Desarrollado por LOTBA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  brand: { fontSize: 28, fontWeight: '800', color: '#1A4B8C', marginBottom: 12 },
  tagline: { fontSize: 15, color: '#555555', textAlign: 'center', marginBottom: 40 },
  primaryButton: { backgroundColor: '#1A4B8C', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryButton: { borderWidth: 2, borderColor: '#1A4B8C', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  secondaryButtonText: { color: '#1A4B8C', fontWeight: '700', fontSize: 15 },
  footer: { position: 'absolute', bottom: 24, color: '#999999', fontSize: 12 },
});
