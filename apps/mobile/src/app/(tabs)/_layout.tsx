import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 22, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { session, ready } = useAuth();
  if (ready && !session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { minHeight: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Explorar', tabBarIcon: ({ color }) => <Icon glyph="⌖" color={color} /> }} />
      <Tabs.Screen name="scan" options={{ title: 'Escanear', tabBarIcon: ({ color }) => <Icon glyph="▣" color={color} /> }} />
      <Tabs.Screen name="passport" options={{ title: 'Pasaporte', tabBarIcon: ({ color }) => <Icon glyph="✪" color={color} /> }} />
      <Tabs.Screen name="rewards" options={{ title: 'Beneficios', tabBarIcon: ({ color }) => <Icon glyph="❖" color={color} /> }} />
    </Tabs>
  );
}
