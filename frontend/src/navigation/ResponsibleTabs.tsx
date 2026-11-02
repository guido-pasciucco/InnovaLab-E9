import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/responsible/DashboardScreen';
import { DeviceDetailScreen } from '../screens/responsible/DeviceDetailScreen';
import { AlertsHistoryScreen } from '../screens/responsible/AlertsHistoryScreen';
import { SettingsScreen } from '../screens/responsible/SettingsScreen';
import { FamilyScreen } from '../screens/responsible/FamilyScreen';
import { BlocksScreen } from '../screens/responsible/BlocksScreen';
import { CustomSitesScreen } from '../screens/responsible/CustomSitesScreen';
import { LinkDeviceScreen } from '../screens/onboarding/LinkDeviceScreen';
import { ConfigureProtectedProfileScreen } from '../screens/onboarding/ConfigureProtectedProfileScreen';
import { SetPinScreen } from '../screens/onboarding/SetPinScreen';
import { BottomTabBar } from '../components/BottomTabBar';
import { stackScreenOptions } from './stackOptions';

/**
 * Barra inferior del modo Tutor según el Figma: Familia · Bloqueos · Inicio · Alertas · Ajustes.
 * Cada pestaña tiene su propio stack para navegar a detalle sin perder la barra.
 */

// --- Inicio ---
export type HomeStackParamList = {
  Dashboard: undefined;
  DeviceDetail: { deviceId: string };
  AlertsHistory: undefined;
};
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={stackScreenOptions}>
      <HomeStackNav.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <HomeStackNav.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Dispositivo' }} />
      <HomeStackNav.Screen name="AlertsHistory" component={AlertsHistoryScreen} options={{ title: 'Alertas' }} />
    </HomeStackNav.Navigator>
  );
}

// --- Familia ---
export type FamilyStackParamList = {
  FamilyHome: undefined;
  DeviceDetail: { deviceId: string };
  AddDevice: { role: 'responsable' } | undefined;
  ConfigureProtectedProfile: { deviceId: string };
};
const FamilyStackNav = createNativeStackNavigator<FamilyStackParamList>();
function FamilyStack() {
  return (
    <FamilyStackNav.Navigator screenOptions={stackScreenOptions}>
      <FamilyStackNav.Screen name="FamilyHome" component={FamilyScreen} options={{ title: 'Familia' }} />
      <FamilyStackNav.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Dispositivo' }} />
      <FamilyStackNav.Screen name="AddDevice" component={LinkDeviceScreen} options={{ title: 'Agregar familiar' }} initialParams={{ role: 'responsable' }} />
      <FamilyStackNav.Screen name="ConfigureProtectedProfile" component={ConfigureProtectedProfileScreen} options={{ title: 'Perfil protegido' }} />
    </FamilyStackNav.Navigator>
  );
}

// --- Bloqueos ---
export type BlocksStackParamList = { BlocksHome: undefined; CustomSites: undefined };
const BlocksStackNav = createNativeStackNavigator<BlocksStackParamList>();
function BlocksStack() {
  return (
    <BlocksStackNav.Navigator screenOptions={stackScreenOptions}>
      <BlocksStackNav.Screen name="BlocksHome" component={BlocksScreen} options={{ title: 'Bloqueos' }} />
      <BlocksStackNav.Screen name="CustomSites" component={CustomSitesScreen} options={{ title: 'Sitios personalizados' }} />
    </BlocksStackNav.Navigator>
  );
}

// --- Alertas ---
export type AlertsStackParamList = { AlertsHome: undefined };
const AlertsStackNav = createNativeStackNavigator<AlertsStackParamList>();
function AlertsStack() {
  return (
    <AlertsStackNav.Navigator screenOptions={stackScreenOptions}>
      <AlertsStackNav.Screen name="AlertsHome" component={AlertsHistoryScreen} options={{ title: 'Alertas' }} />
    </AlertsStackNav.Navigator>
  );
}

// --- Ajustes ---
export type SettingsStackParamList = { SettingsHome: undefined; ChangePin: undefined; CustomSites: undefined };
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();
function SettingsStack() {
  return (
    <SettingsStackNav.Navigator screenOptions={stackScreenOptions}>
      <SettingsStackNav.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Ajustes' }} />
      <SettingsStackNav.Screen name="ChangePin" component={SetPinScreen} options={{ title: 'Cambiar PIN' }} />
      <SettingsStackNav.Screen name="CustomSites" component={CustomSitesScreen} options={{ title: 'Sitios personalizados' }} />
    </SettingsStackNav.Navigator>
  );
}

export type ResponsibleTabsParamList = {
  Familia: undefined;
  Bloqueos: undefined;
  Inicio: undefined;
  Alertas: undefined;
  Ajustes: undefined;
};
const Tab = createBottomTabNavigator<ResponsibleTabsParamList>();

export function ResponsibleTabs() {
  return (
    <Tab.Navigator initialRouteName="Inicio" screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
      <Tab.Screen name="Familia" component={FamilyStack} />
      <Tab.Screen name="Bloqueos" component={BlocksStack} />
      <Tab.Screen name="Inicio" component={HomeStack} />
      <Tab.Screen name="Alertas" component={AlertsStack} />
      <Tab.Screen name="Ajustes" component={SettingsStack} />
    </Tab.Navigator>
  );
}
