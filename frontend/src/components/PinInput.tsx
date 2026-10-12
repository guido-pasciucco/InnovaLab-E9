import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface Props {
  length?: number;
  onComplete: (pin: string) => void;
}

/**
 * Input de PIN del adulto responsable, requerido para modificar
 * configuraciones críticas en el dispositivo protegido (ver Desafío 5 del
 * informe de UX). Pendiente definir con Backend si el PIN es local o si
 * valida contra el login del Responsable.
 */
export function PinInput({ length = 4, onComplete }: Props) {
  const [pin, setPin] = useState('');

  const handleChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, length);
    setPin(digitsOnly);
    if (digitsOnly.length === length) {
      onComplete(digitsOnly);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={handleChange}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={length}
        autoFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  input: {
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#1A4B8C',
    width: 160,
    paddingVertical: 8,
  },
});
