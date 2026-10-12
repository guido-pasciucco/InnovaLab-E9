import React, { useState } from 'react';
import { View } from 'react-native';
import { PermissionPrimerScreen } from '../../components';
import { ProtectionModule } from '../../native/ProtectionModule.mock';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProtectedDeviceStackParamList } from '../../navigation/ProtectedDeviceStack';

type Props = NativeStackScreenProps<ProtectedDeviceStackParamList, 'PermissionsSetup'>;

const STEPS = ['vpn', 'admin', 'accessibility'] as const;
type Step = (typeof STEPS)[number];

/**
 * Flujo de las 3 pantallas puente (priming screens) acordadas con UX,
 * en lenguaje cercano y sin jerga técnica (Desafío 1 del informe de UX).
 */
export function PermissionsSetupScreen({ navigation }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      navigation.navigate('ProtectionStatus');
    }
  };

  const handleConfirm = async () => {
    if (step === 'vpn') await ProtectionModule.requestVpnPermission();
    if (step === 'admin') await ProtectionModule.requestDeviceAdmin();
    if (step === 'accessibility') ProtectionModule.openAccessibilitySettings();
    goNext();
  };

  const content: Record<Step, { title: string; explanation: string; confirmLabel: string }> = {
    vpn: {
      title: 'Vamos a activar el escudo protector',
      explanation:
        'En el siguiente paso vas a ver un aviso de tu teléfono sobre una conexión VPN. Es normal: la usamos para filtrar sitios de apuestas sin tocar tus fotos, chats ni datos bancarios.',
      confirmLabel: 'Activar protección',
    },
    admin: {
      title: 'Evitemos que se pueda desinstalar sin permiso',
      explanation:
        'Ahora vas a ver un aviso para activar un administrador de dispositivo. Esto evita que la protección se desactive por accidente o sin que el adulto responsable lo autorice.',
      confirmLabel: 'Activar administrador',
    },
    accessibility: {
      title: 'Un paso más para que la protección sea efectiva',
      explanation:
        'Te vamos a llevar a Ajustes > Accesibilidad. Buscá "BA Protege+" en la lista y activalo. Esto nos permite detectar intentos de desactivar la protección.',
      confirmLabel: 'Ir a Ajustes',
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <PermissionPrimerScreen {...content[step]} onConfirm={handleConfirm} />
    </View>
  );
}
