import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { parseBranchQr } from '@pg/contracts';
import { Alert, Button, Card, H1, H2, P } from '../../components/ui';
import { colors, radius } from '../../lib/theme';

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [manual, setManual] = useState('');
  const locked = useRef(false);

  // La cámara solo está activa con la pestaña enfocada
  useFocusEffect(
    useCallback(() => {
      locked.current = false;
      setInvalid(false);
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const openBranch = (code: string) => {
    locked.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/branch/${code}`);
  };

  const onScanned = ({ data }: { data: string }) => {
    if (locked.current) return;
    const code = parseBranchQr(data);
    if (code) openBranch(code);
    else {
      setInvalid(true);
      locked.current = true;
      setTimeout(() => {
        locked.current = false;
      }, 1500);
    }
  };

  const ManualEntry = (
    <Card style={{ gap: 8 }}>
      <H2 style={{ marginBottom: 0 }}>¿Problemas con la cámara?</H2>
      <P muted small>Escribe el código impreso bajo el QR.</P>
      <TextInput
        value={manual}
        onChangeText={(t) => setManual(t.replace(/[^A-Za-z0-9_-]/g, ''))}
        placeholder="ej. taller-anil-6r9k"
        autoCapitalize="none"
        autoCorrect={false}
        style={s.input}
        placeholderTextColor="#9AA9AE"
      />
      <Button title="Abrir establecimiento" variant="ghost" disabled={manual.length < 4} onPress={() => openBranch(manual)} />
    </Card>
  );

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, padding: 20, gap: 14, justifyContent: 'center' }}>
        <H1>Escanea el QR del local</H1>
        <P>Usamos la cámara únicamente para leer el código QR del establecimiento y solicitar tu sello. No tomamos fotos.</P>
        {permission.canAskAgain ? (
          <Button title="Permitir cámara" onPress={requestPermission} />
        ) : (
          <>
            <Alert kind="info">El permiso de cámara está bloqueado. Puedes activarlo en Ajustes del teléfono.</Alert>
            <Button title="Abrir ajustes" variant="ghost" onPress={() => Linking.openSettings()} />
          </>
        )}
        {ManualEntry}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {active && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
      )}
      <View style={s.overlay} pointerEvents="box-none">
        <Text style={s.hint}>Apunta al código QR del establecimiento</Text>
        <View style={s.frame} />
        {invalid && (
          <View style={{ marginTop: 16, marginHorizontal: 24 }}>
            <Alert kind="error">Este QR no pertenece a Pasaporte Guanaco.</Alert>
          </View>
        )}
      </View>
      <View style={{ padding: 16 }}>{ManualEntry}</View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 18, textShadowColor: '#000', textShadowRadius: 6 },
  frame: { width: 240, height: 240, borderRadius: radius.lg, borderWidth: 4, borderColor: colors.gold },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm,
    paddingHorizontal: 14, minHeight: 48, fontSize: 16, color: colors.ink,
  },
});
