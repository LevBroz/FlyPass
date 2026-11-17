import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import type { PassportView, RouteDetail } from '@pg/contracts';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Badge, Card, CategoryIcon, ErrorView, H1, Loading, P } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, refresh } = useApi(
    async () => {
      const [r, p] = await Promise.all([
        api<{ route: RouteDetail }>(`/v1/routes/${id}`),
        api<{ passport: PassportView }>('/v1/me/passport').catch(() => null),
      ]);
      return { route: r.route, stamped: new Set(p?.passport.stamps.map((s) => s.branchId) ?? []) };
    },
    [id],
  );

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={refresh} />;
  if (!data) return null;
  const { route, stamped } = data;
  const done = route.stops.filter((s) => stamped.has(s.id)).length;

  return (
    <>
      <Stack.Screen options={{ title: route.name.replace(' (DEMO)', '') }} />
      <FlatList
        data={route.stops}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={{ gap: 6, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <P muted small>{route.region}</P>
              {route.isDemo && <Badge kind="demo" />}
            </View>
            <H1>{route.name}</H1>
            <P>{route.description}</P>
            <Card style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.green }}>{done}/{route.stops.length}</Text>
              <P muted style={{ flex: 1 }}>paradas selladas en esta ruta. Escanea el QR en cada local para pedir tu sello.</P>
            </Card>
          </View>
        }
        renderItem={({ item }) => {
          const ok = stamped.has(item.id);
          return (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/branch/${item.id}`)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 26, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', color: colors.muted }}>{item.position}</Text>
                </View>
                <CategoryIcon category={item.category} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{item.name}</Text>
                  <P muted small>{item.city}{item.hours ? ` · ${item.hours}` : ''}</P>
                </View>
                {ok ? <Badge kind="approved" label="Sellado" /> : <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>}
              </Card>
            </Pressable>
          );
        }}
      />
    </>
  );
}
