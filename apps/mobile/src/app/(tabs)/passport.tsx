import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { PassportView } from '@pg/contracts';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { Alert, Badge, Button, Card, ErrorView, H1, H2, Loading, P, Stamp } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function Passport() {
  const { signOut, session } = useAuth();
  const q = useApi(() => api<{ passport: PassportView }>('/v1/me/passport'), [], 5000);

  if (q.loading && !q.data) return <Loading text="Abriendo tu pasaporte…" />;
  if (q.error && !q.data) return <ErrorView message={q.error} onRetry={q.refresh} />;
  const p = q.data!.passport;

  const count = p.stamps.length;
  const next = p.tiers.find((t) => !t.unlocked);
  const maxSlots = Math.max(6, p.tiers.at(-1)?.stampsRequired ?? 6, count);
  const slots = Array.from({ length: maxSlots }, (_, i) => p.stamps[i] ?? null);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} />}
    >
      <View>
        <H1>Mi pasaporte</H1>
        <P muted>{p.campaign ? p.campaign.name : 'No hay campaña activa'}</P>
      </View>

      {p.notices.map((n) => <Alert key={n} kind="info">{n}</Alert>)}

      <Card style={{ backgroundColor: colors.paper, borderColor: '#E4D3B0', gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', letterSpacing: 1, color: colors.navy }}>SELLOS</Text>
          <Text style={{ fontWeight: '800', fontSize: 22, color: colors.green }}>{count}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
          {slots.map((s, i) =>
            s ? (
              <Stamp key={s.id} label={s.branchName} category={s.category} demo={s.isDemo} size={92} rotate={i % 2 ? 7 : -8} />
            ) : (
              <Stamp key={`e${i}`} empty size={92} />
            ),
          )}
        </View>
        {p.stamps.some((s) => s.isDemo) && (
          <P muted small>Los sellos marcados DEMO fueron precargados para la demostración.</P>
        )}
      </Card>

      {next && (
        <Card style={{ gap: 8 }}>
          <H2 style={{ marginBottom: 0 }}>Próximo nivel: {next.name}</H2>
          <View style={{ height: 10, backgroundColor: colors.line, borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (count / next.stampsRequired) * 100)}%`, height: '100%', backgroundColor: colors.green }} />
          </View>
          <P muted>Te faltan {next.stampsRequired - count} sello(s). {next.description}</P>
        </Card>
      )}

      {p.pending.length > 0 && (
        <Card style={{ gap: 8 }}>
          <H2 style={{ marginBottom: 0 }}>Esperando aprobación</H2>
          {p.pending.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <P>{v.branchName}</P>
              <Badge kind="pending" />
            </View>
          ))}
        </Card>
      )}

      <Card style={{ gap: 6 }}>
        <H2>Niveles</H2>
        {p.tiers.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 22, color: t.unlocked ? colors.gold : colors.line }}>★</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{t.name} · {t.stampsRequired} sellos</Text>
              <P muted small>{t.description}</P>
            </View>
            {t.unlocked && <Badge kind="approved" label="Logrado" />}
          </View>
        ))}
      </Card>

      <Button title="Ver historial de visitas" variant="ghost" onPress={() => router.push('/history')} />
      <View style={{ alignItems: 'center', gap: 6, marginTop: 10 }}>
        <P muted small>{session?.user.email}</P>
        <Button title="Cerrar sesión" variant="danger" onPress={() => void signOut()} style={{ alignSelf: 'stretch' }} />
      </View>
    </ScrollView>
  );
}
