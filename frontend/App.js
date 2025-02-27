import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation';

const App = () => (
  <SafeAreaProvider>
    <AppNavigator />
  </SafeAreaProvider>
);

export default App;
