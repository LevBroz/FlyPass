import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { configMissing } from '../lib/supabase';
import { Alert, Button, P, Stamp } from '../components/ui';
import { colors, radius } from '../lib/theme';

export default function Login() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/explore" />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <Stamp label="Ruta" category="experience" size={70} rotate={-10} />
            <Stamp label="Café" category="food" size={70} rotate={8} />
            <Stamp label="Posada" category="lodging" size={70} rotate={-4} />
          </View>
          <Text style={s.title}>Pasaporte Guanaco</Text>
          <Text style={s.subtitle}>Cada visita, un sello. Cada ruta, una recompensa.</Text>
        </View>

        <View style={s.card}>
          {configMissing && <Alert kind="error">Faltan variables EXPO_PUBLIC_* en este build.</Alert>}
          <Text style={s.label}>Correo</Text>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            placeholderTextColor="#9AA9AE"
          />
          <Text style={s.label}>Contraseña</Text>
          <TextInput
            style={s.input}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="••••••••"
            placeholderTextColor="#9AA9AE"
          />
          {error && <Alert kind="error">{error}</Alert>}
          <Button title="Ingresar" onPress={submit} loading={busy} disabled={!email || !password} style={{ marginTop: 8 }} />
          <P muted small style={{ textAlign: 'center', marginTop: 4 }}>
            Demo con cuentas de prueba privadas. El registro público llegará en el piloto.
          </P>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  hero: { alignItems: 'center', marginBottom: 28 },
  title: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#C9D8DC', fontSize: 16, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: 20, gap: 10 },
  label: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: '#E4D3B0', borderRadius: radius.sm,
    paddingHorizontal: 14, minHeight: 50, fontSize: 16, color: colors.ink,
  },
});
