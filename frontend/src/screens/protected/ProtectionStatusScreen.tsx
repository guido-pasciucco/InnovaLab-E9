import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProtectionStatusBadge } from '../../components';
import { ProtectionModule } from '../../native/ProtectionModule.mock';
import type { ProtectionStatus } from '../../native/ProtectionModule';

export function ProtectionStatusScreen() {
  const [status, setStatus] = useState<ProtectionStatus>('unconfigured');

  useEffect(() => {
    ProtectionModule.startProtection().then(() =>
      ProtectionModule.getProtectionStatus().then(setStatus)
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Este dispositivo está protegido</Text>
      <ProtectionStatusBadge status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
});
