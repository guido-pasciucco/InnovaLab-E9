import { NativeModules, Platform } from 'react-native';
import type { ProtectionModuleInterface } from './ProtectionModule';
import { ProtectionModule as MockProtectionModule } from './ProtectionModule.mock';

/**
 * Punto único de entrada al módulo de protección. Las pantallas importan
 * `ProtectionModule` desde acá y nunca desde el .mock directamente.
 *
 * - Si el módulo Kotlin está registrado (NativeModules.ProtectionModule), se usa.
 * - Si no (iOS, o Android sin haber copiado los .kt todavía), se usa el mock.
 */
const nativeModule = Platform.OS === 'android' ? NativeModules.ProtectionModule : undefined;

export const isNativeProtectionAvailable = !!nativeModule;

export const ProtectionModule: ProtectionModuleInterface = nativeModule ?? MockProtectionModule;

export * from './ProtectionModule';
