import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { stackScreenOptions } from './stackOptions';
import { PermissionsSetupScreen } from '../screens/protected/PermissionsSetupScreen';
import { ProtectionStatusScreen } from '../screens/protected/ProtectionStatusScreen';
import { ActivityHistoryScreen } from '../screens/protected/ActivityHistoryScreen';
import { BlockedSitePageScreen } from '../screens/protected/BlockedSitePageScreen';
import { useAppMode } from '../state/AppModeContext';

export type ProtectedDeviceStackParamList = {
  PermissionsSetup: undefined;
  ProtectionStatus: undefined;
  ActivityHistory: undefined;
  /** Se abre al tocar la notificación de bloqueo (deep link baprotege://blocked/<dominio>). */
  BlockedSitePage: { domain?: string } | undefined;
};

const Stack = createNativeStackNavigator<ProtectedDeviceStackParamList>();

export function ProtectedDeviceStack() {
  // Con los permisos ya hechos (app reabierta, celular reiniciado) se arranca directo en el estado.
  const { permissionsDone } = useAppMode();
  return (
    <Stack.Navigator
      initialRouteName={permissionsDone ? 'ProtectionStatus' : 'PermissionsSetup'}
      screenOptions={{ ...stackScreenOptions, headerShown: false }}
    >
      <Stack.Screen name="PermissionsSetup" component={PermissionsSetupScreen} />
      <Stack.Screen name="ProtectionStatus" component={ProtectionStatusScreen} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} options={{ headerShown: true, title: 'Actividad' }} />
      <Stack.Screen name="BlockedSitePage" component={BlockedSitePageScreen} />
    </Stack.Navigator>
  );
}
