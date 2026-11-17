import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { RouteSummary } from '@pg/contracts';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Badge, Card, ErrorView, H1, Loading, P } from '../../components/ui';
import { colors, radius } from '../../lib/theme';

const ROUTE_TINTS = ['#007F78', '#2A6F97', '#C9772E'];

export default function Explore() {
  const { data, error, loading, refreshing, refresh } = useApi(() => api<{ routes: RouteSummary[] }>('/v1/routes'));

  if (loading && !data) return <Loading text="Buscando rutas…" />;
  if (error && !data) return <ErrorView message={error} onRetry={refresh} />;

  return (
    <FlatList
      data={data?.routes ?? []}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 4 }}>
          <H1>Rutas para descubrir</H1>
          <P muted>Visita comercios distintos, sella tu pasaporte y desbloquea beneficios.</P>
        </View>
      }
      ListEmptyComponent={<P muted>No hay rutas publicadas todavía.</P>}
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/route/${item.id}`)}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={[s.cover, { backgroundColor: ROUTE_TINTS[index % ROUTE_TINTS.length] }]}>
              <Text style={s.coverGlyph}>{['❀', '◍', '≈'][index % 3]}</Text>
              <View style={{ position: 'absolute', top: 12, right: 12 }}>{item.isDemo && <Badge kind="demo" />}</View>
            </View>
            <View style={{ padding: 16, gap: 4 }}>
              <Text style={s.title}>{item.name}</Text>
              <P muted small>{item.region} · {item.stopCount} paradas</P>
              <P style={{ marginTop: 4 }}>{item.description}</P>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  cover: { height: 110, alignItems: 'flex-start', justifyContent: 'flex-end', padding: 16, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  coverGlyph: { fontSize: 46, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink },
});
