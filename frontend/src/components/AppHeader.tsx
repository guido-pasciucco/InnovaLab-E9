import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

/** Encabezado "píldora" blanco del Figma: menú, título centrado y perfil. */
export function AppHeader({ title, onLeftPress, onRightPress }: {
  title: string; onLeftPress?: () => void; onRightPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onLeftPress} hitSlop={12} disabled={!onLeftPress}>
        <Text style={styles.icon}>☰</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onRightPress} hitSlop={12} disabled={!onRightPress}>
        <Text style={styles.icon}>◉</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 14, marginBottom: 16,
  },
  title: { fontSize: 18, color: colors.text, flex: 1, textAlign: 'center' },
  icon: { fontSize: 20, color: colors.text, width: 24, textAlign: 'center' },
});
