import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { Logo, PrimaryButton } from '../../components';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

/** Bienvenida (Figma "Inicio sesión Tutor"): logo, propósito y los dos caminos. */
export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Logo size={110} />
        <Text style={styles.tagline}>Aplicación de protección a menores para sitios de apuestas ilegales</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Continuar como Tutor" onPress={() => navigation.navigate('Login')} />
        <PrimaryButton
          title="Vincular Dispositivo protegido"
          variant="outline"
          onPress={() => navigation.navigate('LinkDevice', { role: 'protegido' })}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerSmall}>Desarrollada por</Text>
        <Text style={styles.lotba}>LOTBA</Text>
        <Text style={styles.footerSmall}>Tu mejor jugada</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 28, justifyContent: 'space-between', backgroundColor: colors.background },
  top: { alignItems: 'center', marginTop: 70 },
  tagline: { fontSize: 18, color: colors.text, textAlign: 'center', marginTop: 48, lineHeight: 25, paddingHorizontal: 12 },
  actions: { gap: 6 },
  footer: { alignItems: 'center', marginBottom: 8 },
  footerSmall: { fontSize: 13, color: colors.text },
  lotba: { fontSize: 28, letterSpacing: 6, color: colors.text, fontWeight: '300' },
});
