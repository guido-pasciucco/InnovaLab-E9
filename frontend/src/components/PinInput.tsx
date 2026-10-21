import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface Props {
  length?: number;
  onComplete: (pin: string) => void;
}

/**
 * Input de PIN del adulto responsable, requerido para modificar
 * configuraciones críticas (ver Desafío 5 del informe de UX).
 *
 * Confirmado con Backend: el PIN es independiente del login. Cada
 * responsable guarda un `pinHash` propio (colección `responsables`),
 * separado del email/contraseña de la cuenta. Frontend nunca debe
 * validar el PIN localmente ni guardarlo en texto plano — siempre se
 * manda al backend para comparar contra el hash.
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
