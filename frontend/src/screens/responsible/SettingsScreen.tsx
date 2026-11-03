import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppMode } from '../../state/AppModeContext';
import { useCriticalAction } from '../../hooks/useCriticalAction';
import { PrimaryButton } from '../../components';
import { api } from '../../api';
import { ENV } from '../../config/env';
import type { SettingsStackParamList } from '../../navigation/ResponsibleTabs';
import { colors, cardStyle } from '../../theme';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

export function SettingsScreen({ navigation }: Props) {
  const { resetApp } = useAppMode();
  const { authorize, gate } = useCriticalAction();

  const handleChangePin = async () => {
    const ok = await authorize({ title: 'Cambiar PIN', description: 'Primero ingresá tu PIN actual.' });
    if (ok) navigation.navigate('ChangePin');
  };

  const handleLogout = async () => {
    await api.logout();
    await resetApp();
  };

  return (
    <View style={styles.container}>
      <View style={[cardStyle, { paddingVertical: 4 }]}>
        <Item icon="🌐" label="Sitios personalizados" onPress={() => navigation.navigate('CustomSites')} />
        <Item icon="🔒" label="Cambiar PIN" onPress={handleChangePin} last />
      </View>

      <View style={{ marginTop: 32 }}>
        <PrimaryButton title="Cerrar sesión" variant="danger" onPress={handleLogout} />
      </View>

      <Text style={styles.version}>
        BA Protege+ v{ENV.APP_VERSION}
        {api.isDemoMode ? ' · modo demo' : ''}
      </Text>
      {gate}
    </View>
  );
}

function Item({ icon, label, onPress, last }: { icon: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.item, !last && styles.itemBorder]} onPress={onPress}>
      <Text style={styles.itemText}>{icon}  {label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#E4E4EA' },
  itemText: { fontSize: 15, color: colors.text },
  chevron: { fontSize: 20, color: colors.textSoft },
  version: { textAlign: 'center', color: colors.textSoft, fontSize: 12, marginTop: 24 },
});
