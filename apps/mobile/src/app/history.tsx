import { FlatList, RefreshControl, Text, View } from 'react-native';
import type { VisitRequestView } from '@pg/contracts';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { Badge, Card, ErrorView, Loading, P } from '../components/ui';
import { colors } from '../lib/theme';
import { fmtDateTime } from '../lib/format';

export default function History() {
  const q = useApi(() => api<{ visits: VisitRequestView[] }>('/v1/me/history'));
  if (q.loading && !q.data) return <Loading />;
  if (q.error && !q.data) return <ErrorView message={q.error} onRetry={q.refresh} />;

  return (
    <FlatList
      data={q.data?.visits ?? []}
      keyExtractor={(v) => v.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} />}
      ListEmptyComponent={<P muted>Todavía no has solicitado sellos. Los sellos demo precargados no aparecen aquí.</P>}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{item.branchName}</Text>
            <P muted small>Solicitado {fmtDateTime(item.createdAt)}</P>
            {item.rejectReason && <P small>Motivo: {item.rejectReason}</P>}
          </View>
          <Badge kind={item.status} />
        </Card>
      )}
    />
  );
}
