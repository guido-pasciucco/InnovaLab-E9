import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStack } from './OnboardingStack';
import { ResponsibleTabs } from './ResponsibleTabs';
import { ProtectedDeviceStack } from './ProtectedDeviceStack';
import { AppModeStorage, AppMode } from '../storage/appModeStorage';

export type RootStackParamList = {
  OnboardingStack: undefined;
  ResponsibleTabs: undefined;
  ProtectedDeviceStack: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Decide, al abrir la app, si hay que mostrar el onboarding o ir directo
 * al stack correspondiente según el modo ya configurado previamente.
 */
export function RootNavigator() {
  const [mode, setMode] = useState<AppMode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AppModeStorage.getMode().then((savedMode) => {
      setMode(savedMode);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return null; // TODO: reemplazar por una pantalla de splash
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {mode === null && <Stack.Screen name="OnboardingStack" component={OnboardingStack} />}
        {mode === 'responsable' && <Stack.Screen name="ResponsibleTabs" component={ResponsibleTabs} />}
        {mode === 'protegido' && <Stack.Screen name="ProtectedDeviceStack" component={ProtectedDeviceStack} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
