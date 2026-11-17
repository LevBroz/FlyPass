import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { CouponView, RedemptionTokenView } from '@pg/contracts';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Alert, Badge, Button, Card, ErrorView, H1, Loading, P } from '../../components/ui';
import { colors, radius } from '../../lib/theme';
import { fmtDate } from '../../lib/format';

/**
 * Muestra un código temporal de 6 dígitos. El comercio lo ingresa en su
 * panel; el servidor valida vigencia, estado y comercio, y canjea una vez.
 * Mientras está abierto, se consulta el estado para mostrar la confirmación.
 */
export default function CouponScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useApi(
    async () => {
      const r = await api<{ coupons: CouponView[] }>('/v1/me/coupons');
      return r.coupons.find((c) => c.id === id) ?? null;
    },
    [id],
    3000,
  );
  const [token, setToken] = useState<RedemptionTokenView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const coupon = q.data;
  const redeemed = coupon?.status === 'redeemed';
  useEffect(() => {
    if (redeemed) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [redeemed]);

  const generate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ token: RedemptionTokenView }>(`/v1/coupons/${id}/redemption-token`, { method: 'POST' });
      setToken(r.token);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (q.loading && !q.data) return <Loading />;
  if (q.error && !q.data) return <ErrorView message={q.error} onRetry={q.refresh} />;
  if (!coupon) return <ErrorView message="Cupón no encontrado" onRetry={() => router.back()} />;

  const secondsLeft = token ? Math.max(0, Math.floor((new Date(token.expiresAt).getTime() - now) / 1000)) : 0;
  const tokenValid = token && secondsLeft > 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ gap: 6 }}>
        <Badge kind={coupon.status} />
        <H1>{coupon.offerTitle}</H1>
        <P muted>{coupon.merchantName} · nivel {coupon.tierName}</P>
        <P>{coupon.conditions}</P>
        <P muted small>Vence el {fmtDate(coupon.expiresAt)}</P>
      </View>

      {redeemed ? (
        <Card style={{ alignItems: 'center', gap: 10, borderColor: colors.green, borderWidth: 2 }}>
          <Text style={{ fontSize: 56, color: colors.green }}>✓</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.green }}>Canje confirmado</Text>
          <P muted style={{ textAlign: 'center' }}>Este beneficio ya fue usado y no puede canjearse otra vez.</P>
          <Button title="Volver a beneficios" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : coupon.status === 'expired' ? (
        <Alert kind="error">Este cupón venció.</Alert>
      ) : tokenValid ? (
        <Card style={{ alignItems: 'center', gap: 10, backgroundColor: colors.navy, borderColor: colors.navy }}>
          <Text style={{ color: '#C9D8DC', fontWeight: '700' }}>Muestra este código al personal</Text>
          <View style={{ backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 22 }}>
            <Text
              selectable
              accessibilityLabel={`Código ${token.code.split('').join(' ')}`}
              style={{ fontSize: 46, fontWeight: '800', letterSpacing: 10, color: colors.navy, fontVariant: ['tabular-nums'] }}
            >
              {token.code.slice(0, 3)} {token.code.slice(3)}
            </Text>
          </View>
          <Text style={{ color: colors.gold, fontWeight: '700' }}>
            Vigente {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </Text>
          <P small style={{ color: '#C9D8DC', textAlign: 'center' }}>Esperando confirmación del comercio…</P>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <P>Genera el código solo cuando estés frente al personal. Es válido por 10 minutos y sirve una sola vez.</P>
          {token && <Alert kind="info">El código anterior expiró. Genera uno nuevo.</Alert>}
          {err && <Alert kind="error">{err}</Alert>}
          <Button title="Generar código de canje" variant="gold" onPress={generate} loading={busy} />
        </Card>
      )}
    </ScrollView>
  );
}
