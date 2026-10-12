import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/responsible/DashboardScreen';
import { DeviceDetailScreen } from '../screens/responsible/DeviceDetailScreen';
import { AlertsHistoryScreen } from '../screens/responsible/AlertsHistoryScreen';
import { SettingsScreen } from '../screens/responsible/SettingsScreen';
import { FamilyScreen } from '../screens/responsible/FamilyScreen';
import { BlocksScreen } from '../screens/responsible/BlocksScreen';
import { LinkDeviceScreen } from '../screens/onboarding/LinkDeviceScreen';
import { ConfigureProtectedProfileScreen } from '../screens/onboarding/ConfigureProtectedProfileScreen';

/**
 * Navegación inferior "Familia / Inicio / Bloqueos", tal como aparece en
 * todas las pantallas del modo Tutor en el diseño de UX. Cada tab tiene
 * su propio stack interno para poder navegar a detalle sin perder la
 * barra inferior.
 */

// --- Tab "Inicio" ---
export type HomeStackParamList = {
  Dashboard: undefined;
  DeviceDetail: { deviceId: string };
  AlertsHistory: undefined;
  Settings: undefined;
};
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
function HomeStack() {
  return (
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <HomeStackNav.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Dispositivo' }} />
      <HomeStackNav.Screen name="AlertsHistory" component={AlertsHistoryScreen} options={{ title: 'Alertas' }} />
      <HomeStackNav.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
    </HomeStackNav.Navigator>
  );
}

// --- Tab "Familia" ---
export type FamilyStackParamList = {
  FamilyHome: undefined;
  DeviceDetail: { deviceId: string };
  AddDevice: { role: 'responsable' };
  ConfigureProtectedProfile: undefined;
};
const FamilyStackNav = createNativeStackNavigator<FamilyStackParamList>();
function FamilyStack() {
  return (
    <FamilyStackNav.Navigator>
      <FamilyStackNav.Screen name="FamilyHome" component={FamilyScreen} options={{ title: 'Familia' }} />
      <FamilyStackNav.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Dispositivo' }} />
      <FamilyStackNav.Screen name="AddDevice" component={LinkDeviceScreen} options={{ title: 'Agregar dispositivo' }} initialParams={{ role: 'responsable' }} />
      <FamilyStackNav.Screen name="ConfigureProtectedProfile" component={ConfigureProtectedProfileScreen} options={{ title: 'Perfil protegido' }} />
    </FamilyStackNav.Navigator>
  );
}

// --- Tab "Bloqueos" ---
export type BlocksStackParamList = { BlocksHome: undefined };
const BlocksStackNav = createNativeStackNavigator<BlocksStackParamList>();
function BlocksStack() {
  return (
    <BlocksStackNav.Navigator>
      <BlocksStackNav.Screen name="BlocksHome" component={BlocksScreen} options={{ title: 'Bloqueos' }} />
    </BlocksStackNav.Navigator>
  );
}

export type ResponsibleTabsParamList = {
  Familia: undefined;
  Inicio: undefined;
  Bloqueos: undefined;
};
const Tab = createBottomTabNavigator<ResponsibleTabsParamList>();

export function ResponsibleTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Familia" component={FamilyStack} />
      <Tab.Screen name="Inicio" component={HomeStack} />
      <Tab.Screen name="Bloqueos" component={BlocksStack} />
    </Tab.Navigator>
  );
}
