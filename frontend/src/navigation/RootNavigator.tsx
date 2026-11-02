import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, LinkingOptions, DefaultTheme, Theme } from '@react-navigation/native';
import { colors } from '../theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStack } from './OnboardingStack';
import { ResponsibleTabs } from './ResponsibleTabs';
import { ProtectedDeviceStack } from './ProtectedDeviceStack';
import { useAppMode } from '../state/AppModeContext';

export type RootStackParamList = {
  OnboardingStack: undefined;
  ResponsibleTabs: undefined;
  ProtectedDeviceStack: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Colores del Figma aplicados a toda la navegación (fondo de pantallas, encabezados). */
const appTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: 'transparent',
  },
};

/**
 * Deep links (Semana 5): la notificación "Sitio bloqueado" que crea Kotlin abre
 * baprotege://blocked/<dominio>, que lleva a BlockedSitePage con ese dominio.
 * Requiere el <intent-filter> con scheme "baprotege" en AndroidManifest (ver guía).
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['baprotege://'],
  config: {
    screens: {
      ProtectedDeviceStack: {
        screens: {
          BlockedSitePage: 'blocked/:domain',
        },
      },
    },
  },
};

/**
 * Muestra solo el stack que corresponde al modo actual. Cuando una pantalla
 * llama a `chooseMode()` / `resetApp()` (ver AppModeContext) cambia `mode`,
 * y React Navigation hace la transición sola entre stacks (patrón
 * "conditional screens" de su documentación para flujos de login).
 */
export function RootNavigator() {
  const { loading, mode } = useAppMode();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} theme={appTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {mode === null && <Stack.Screen name="OnboardingStack" component={OnboardingStack} />}
        {mode === 'responsable' && <Stack.Screen name="ResponsibleTabs" component={ResponsibleTabs} />}
        {mode === 'protegido' && <Stack.Screen name="ProtectedDeviceStack" component={ProtectedDeviceStack} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
