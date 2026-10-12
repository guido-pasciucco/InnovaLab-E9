import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PermissionsSetupScreen } from '../screens/protected/PermissionsSetupScreen';
import { ProtectionStatusScreen } from '../screens/protected/ProtectionStatusScreen';
import { BlockedSitePageScreen } from '../screens/protected/BlockedSitePageScreen';

export type ProtectedDeviceStackParamList = {
  PermissionsSetup: undefined;
  ProtectionStatus: undefined;
  BlockedSitePage: undefined;
};

const Stack = createNativeStackNavigator<ProtectedDeviceStackParamList>();

export function ProtectedDeviceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PermissionsSetup" component={PermissionsSetupScreen} />
      <Stack.Screen name="ProtectionStatus" component={ProtectionStatusScreen} />
      <Stack.Screen name="BlockedSitePage" component={BlockedSitePageScreen} />
    </Stack.Navigator>
  );
}
