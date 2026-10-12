import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}

/**
 * Tarjeta grande de selección de modo, según el Desafío 2 del informe de UX:
 * "Quiero supervisar (teléfono del adulto)" / "Este es el teléfono a cuidar".
 */
export function ModeCard({ title, description, color, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.title, { color }]}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    marginVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#555555',
  },
});
