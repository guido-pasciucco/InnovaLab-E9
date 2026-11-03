import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

/**
 * Logo "BA+ Protege" del Figma: B celeste, A violeta, + naranja.
 * Hecho con texto (no imagen) para no depender de archivos de UX.
 * Cuando UX exporte el logo en PNG/SVG, se reemplaza por <Image>.
 */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.letter, { fontSize: size, color: colors.cyan }]}>B</Text>
      <Text style={[styles.letter, { fontSize: size, color: colors.primaryLight }]}>A</Text>
      <View>
        <Text style={[styles.letter, { fontSize: size * 0.95, color: colors.orange, lineHeight: size * 0.95 }]}>+</Text>
        <Text style={[styles.protege, { fontSize: size * 0.22 }]}>Protege</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  letter: { fontWeight: '900', letterSpacing: -2, includeFontPadding: false },
  protege: { fontWeight: '800', color: colors.text, marginTop: -4 },
});
