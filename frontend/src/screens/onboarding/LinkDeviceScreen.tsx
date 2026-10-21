import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QrCodeDisplay } from '../../components';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'LinkDevice'>;

/**
 * Genera un código mock de 6 dígitos, imitando la forma real que crea
 * Backend en la colección `codigosVinculacion` (campo `codigo`, ej. "483920").
 * TODO: reemplazar por un POST real que cree el documento en Backend y
 * devuelva `codigo` + `expiraEn` (hoy Backend fija 15 min de validez).
 */
function generateMockLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Pantalla compartida por ambos roles: el Responsable ve el código (y QR),
 * el Dispositivo Protegido lo escanea o lo ingresa manualmente.
 *
 * El código es numérico de 6 dígitos y expira a los 15 minutos, según el
 * modelo real de Backend (`codigosVinculacion`: codigo, creadoEn, expiraEn,
 * usado). Antes usábamos un formato alfanumérico de ejemplo del diseño de
 * UX ("A5B 09Q") — ya corregido para coincidir con lo que Backend emite.
 */
export function LinkDeviceScreen({ route, navigation }: Props) {
  const { role } = route.params;
  const [linkCode, setLinkCode] = useState(() => generateMockLinkCode());
  const [isExpired, setIsExpired] = useState(false);

  const handleLinkSuccess = () => {
    if (role === 'responsable') {
      // El Tutor, tras vincular, pasa a configurar el perfil del menor.
      navigation.navigate('ConfigureProtectedProfile');
    } else {
      navigation.getParent()?.navigate('ProtectedDeviceStack' as never);
    }
  };

  const handleRequestNewCode = () => {
    // TODO: pedirle a Backend un nuevo documento en `codigosVinculacion`.
    setLinkCode(generateMockLinkCode());
    setIsExpired(false);
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
          botón "Vincular dispositivo protegido" en la app, o ingresá el código a mano.
          Tiene 15 minutos de validez.
        </Text>
      )}

      {role === 'responsable' ? (
        <QrCodeDisplay
          value={linkCode}
          numericFallbackCode={linkCode}
          expiresInMinutes={15}
          onExpire={() => setIsExpired(true)}
          onRequestNewCode={handleRequestNewCode}
        />
      ) : (
        <Text style={styles.placeholder}>[ Escáner de QR — pendiente de integración ]</Text>
      )}

      <Button
        title="Simular vinculación exitosa"
        onPress={handleLinkSuccess}
        disabled={role === 'responsable' && isExpired}
      />
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
