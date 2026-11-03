import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors } from '../theme';

/** Encabezado de las pantallas internas: sin sombra, título centrado, sobre el fondo lavanda. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleAlign: 'center',
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' },
  contentStyle: { backgroundColor: colors.background },
};
