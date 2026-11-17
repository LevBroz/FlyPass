import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { CouponView } from '@pg/contracts';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Badge, Card, ErrorView, H1, Loading, P } from '../../components/ui';
import { colors } from '../../lib/theme';
import { fmtDate as fmt } from '../../lib/format';

export default function Rewards() {
  const q = useApi(() => api<{ coupons: CouponView[] }>('/v1/me/coupons'));

  if (q.loading && !q.data) return <Loading />;
  if (q.error && !q.data) return <ErrorView message={q.error} onRetry={q.refresh} />;
  const coupons = q.data?.coupons ?? [];
  const order = { issued: 0, redeemed: 1, expired: 2 } as const;
  const sorted = [...coupons].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 4 }}>
          <H1>Mis beneficios</H1>
          <P muted>Cada cupón se usa una sola vez. Genera el código frente al personal del comercio.</P>
        </View>
      }
      ListEmptyComponent={
        <Card><P muted>Aún no tienes beneficios. Completa 3 sellos distintos para desbloquear el primero.</P></Card>
      }
      renderItem={({ item }) => {
        const usable = item.status === 'issued';
        return (
          <Pressable
            disabled={!usable}
            accessibilityRole="button"
            onPress={() => router.push(`/coupon/${item.id}`)}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <Card
              style={{
                gap: 6,
                opacity: usable ? 1 : 0.7,
                borderLeftWidth: 6,
                borderLeftColor: usable ? colors.gold : item.status === 'redeemed' ? colors.green : colors.line,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge kind={item.status} />
                <P muted small>{item.tierName}</P>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{item.offerTitle}</Text>
              <P muted small>{item.merchantName}</P>
              <P small>{item.conditions}</P>
              <P muted small>
                {item.status === 'redeemed' && item.redeemedAt
                  ? `Canjeado el ${fmt(item.redeemedAt)}`
                  : item.status === 'expired'
                    ? `Venció el ${fmt(item.expiresAt)}`
                    : `Vence el ${fmt(item.expiresAt)}`}
              </P>
              {usable && <Text style={{ color: colors.green, fontWeight: '700', marginTop: 4 }}>Toca para canjear ›</Text>}
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
