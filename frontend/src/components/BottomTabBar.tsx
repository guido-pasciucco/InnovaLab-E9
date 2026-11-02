import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

/**
 * Barra inferior del Figma: tarjeta blanca redondeada con 5 íconos y el activo
 * sobre un cuadrado lila. Íconos con emoji/símbolos hasta que UX pase los SVG
 * (o se sume una librería de íconos).
 */
const ICONS: Record<string, string> = { Familia: '👨‍👩‍👧', Bloqueos: '🛡️', Inicio: '🏠', Alertas: '🔔', Ajustes: '⚙️' };

export function BottomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={focused ? { selected: true } : {}}
              style={[styles.item, focused && styles.itemActive]}
            >
              <Text style={[styles.icon, !focused && styles.iconIdle]}>{ICONS[route.name] ?? '•'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: colors.background, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6 },
  bar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 22, paddingVertical: 8, paddingHorizontal: 6,
  },
  item: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemActive: { backgroundColor: colors.primarySoft },
  icon: { fontSize: 24 },
  iconIdle: { opacity: 0.6 },
});
