import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { SignUpScreen } from '../screens/onboarding/SignUpScreen';
import { LinkDeviceScreen } from '../screens/onboarding/LinkDeviceScreen';
import { ConfigureProtectedProfileScreen } from '../screens/onboarding/ConfigureProtectedProfileScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  LinkDevice: { role: 'responsable' | 'protegido' };
  ConfigureProtectedProfile: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Flujo completo según diseño UX ("Inicio sesión Tutor"):
 * Welcome -> Login/SignUp -> LinkDevice (QR/código) -> ConfigureProtectedProfile
 * (el camino "Vincular Dispositivo protegido" desde Welcome salta directo a LinkDevice).
 */
export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: 'Iniciar sesión' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: true, title: 'Crear cuenta' }} />
      <Stack.Screen name="LinkDevice" component={LinkDeviceScreen} options={{ headerShown: true, title: 'Vincular dispositivo' }} />
      <Stack.Screen name="ConfigureProtectedProfile" component={ConfigureProtectedProfileScreen} options={{ headerShown: true, title: 'Perfil protegido' }} />
    </Stack.Navigator>
  );
}
