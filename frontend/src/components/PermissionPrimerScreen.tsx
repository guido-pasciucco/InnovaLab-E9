import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

interface Props {
  title: string;
  explanation: string;
  confirmLabel: string;
  onConfirm: () => void;
}

/**
 * Componente reutilizable para las 3 pantallas puente (VPN, Device Admin,
 * Accesibilidad). Un solo componente con texto variable, en vez de 3
 * pantallas distintas, según lo acordado con UX/UI.
 *
 * El tono del "explanation" debe seguir los lineamientos de UX: cercano,
 * preventivo, sin jerga técnica (ver Desafío 1 del informe de UX).
 */
export function PermissionPrimerScreen({ title, explanation, confirmLabel, onConfirm }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.explanation}>{explanation}</Text>
      <Button title={confirmLabel} onPress={onConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  explanation: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 24,
    lineHeight: 22,
  },
});
