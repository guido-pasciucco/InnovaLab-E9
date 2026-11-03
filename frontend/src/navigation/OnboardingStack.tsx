import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { stackScreenOptions } from './stackOptions';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { SignUpScreen } from '../screens/onboarding/SignUpScreen';
import { SetPinScreen } from '../screens/onboarding/SetPinScreen';
import { LinkDeviceScreen } from '../screens/onboarding/LinkDeviceScreen';
import { ConfigureProtectedProfileScreen } from '../screens/onboarding/ConfigureProtectedProfileScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  /** Semana 8: el PIN de acciones protegidas se crea al registrarse. */
  CreatePin: undefined;
  LinkDevice: { role: 'responsable' | 'protegido' };
  ConfigureProtectedProfile: { deviceId: string };
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Welcome -> SignUp -> CreatePin -> LinkDevice (código) -> ConfigureProtectedProfile -> tabs del Tutor
 * Welcome -> Login -> tabs del Tutor (cuenta existente)
 * Welcome -> LinkDevice (protegido: ingresar código) -> pantallas de permisos
 */
export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="CreatePin" component={SetPinScreen} options={{ headerShown: true, title: 'Tu PIN', headerBackVisible: false }} />
      <Stack.Screen name="LinkDevice" component={LinkDeviceScreen} options={{ headerShown: true, title: 'Vincular dispositivo' }} />
      <Stack.Screen name="ConfigureProtectedProfile" component={ConfigureProtectedProfileScreen} options={{ headerShown: true, title: 'Perfil protegido' }} />
    </Stack.Navigator>
  );
}
