import React from 'react';
import { AppModeProvider } from './src/state/AppModeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AppModeProvider>
      <RootNavigator />
    </AppModeProvider>
  );
}
