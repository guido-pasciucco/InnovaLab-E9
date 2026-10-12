import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QrCodeDisplay } from '../../components';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'LinkDevice'>;

/**
 * Pantalla compartida por ambos roles: el Responsable ve el QR, el
 * Dispositivo Protegido lo escanea (o ingresa el código manual de 6
 * caracteres, formato "A5B 09Q" según el diseño de UX).
 *
 * PENDIENTE (bloqueado por Backend): confirmar si el token del QR se
 * genera en el servidor (requiere conexión a internet) o es un pairing
 * local. Ver documento "Cruce entre investigación UX y requisitos técnicos".
 */
export function LinkDeviceScreen({ route, navigation }: Props) {
  const { role } = route.params;

  const handleLinkSuccess = () => {
    if (role === 'responsable') {
      // El Tutor, tras vincular, pasa a configurar el perfil del menor.
      navigation.navigate('ConfigureProtectedProfile');
    } else {
      navigation.getParent()?.navigate('ProtectedDeviceStack' as never);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {role === 'responsable'
          ? 'Ahora vincularemos el dispositivo de tu protegido'
          : 'Vinculate con el adulto responsable'}
      </Text>
      {role === 'responsable' && (
        <Text style={styles.subtitle}>
          Escaneá este código QR desde el dispositivo de tu familiar presionando el
          botón "Vincular dispositivo protegido" en la app.
        </Text>
      )}

      {role === 'responsable' ? (
        <QrCodeDisplay value="MOCK-TOKEN-PENDIENTE-BACKEND" numericFallbackCode="A5B 09Q" />
      ) : (
        <Text style={styles.placeholder}>[ Escáner de QR — pendiente de integración ]</Text>
      )}

      <Button title="Simular vinculación exitosa" onPress={handleLinkSuccess} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  placeholder: {
    color: '#999999',
    marginBottom: 24,
    fontStyle: 'italic',
  },
});
