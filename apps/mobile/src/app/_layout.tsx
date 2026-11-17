import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { DemoBanner } from '../components/ui';
import { colors } from '../lib/theme';

function Shell() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.navy }}>
        <DemoBanner />
      </View>
      {/* Provider anidado: mide insets relativos a su vista (debajo del banner),
          así los encabezados no vuelven a sumar la barra de estado. */}
      <SafeAreaProvider style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="route/[id]" options={{ title: 'Ruta' }} />
        <Stack.Screen name="branch/[id]" options={{ title: 'Establecimiento' }} />
        <Stack.Screen name="coupon/[id]" options={{ title: 'Canjear beneficio' }} />
        <Stack.Screen name="history" options={{ title: 'Historial' }} />
      </Stack>
      </SafeAreaProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
