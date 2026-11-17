import { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CATEGORY_LABEL, type BranchDetail, type PassportView, type VisitRequestView } from '@pg/contracts';
import { api, ApiError, newIdempotencyKey } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Alert, Badge, Button, Card, CategoryIcon, ErrorView, H1, H2, Loading, P, Stamp } from '../../components/ui';
import { colors } from '../../lib/theme';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'pending'; requestId: string }
  | { kind: 'approved'; unlocked: string | null }
  | { kind: 'rejected'; reason: string | null }
  | { kind: 'error'; message: string };

/**
 * Ficha del local. El parámetro puede ser el UUID (desde una ruta) o el
 * código QR (desde el escáner o un enlace pguanaco://branch/<código>).
 * Solo con el código QR se puede solicitar sello.
 */
export default function BranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const byQr = !UUID.test(id);
  const qrCode = byQr ? id : null;

  const { data, error, loading, refresh } = useApi(async () => {
    const [b, p] = await Promise.all([
      api<{ branch: BranchDetail }>(byQr ? `/v1/branches/by-qr/${encodeURIComponent(id)}` : `/v1/branches/${id}`),
      api<{ passport: PassportView }>('/v1/me/passport').catch(() => null),
    ]);
    const pending = p?.passport.pending.find((v) => v.branchId === b.branch.id) ?? null;
    return {
      branch: b.branch,
      stamped: !!p?.passport.stamps.some((s) => s.branchId === b.branch.id),
      pendingId: pending?.id ?? null,
      unlockedBefore: new Set(p?.passport.tiers.filter((t) => t.unlocked).map((t) => t.id) ?? []),
    };
  }, [id]);

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  // Clave estable por pantalla: reintentos no crean solicitudes duplicadas
  const idemKey = useRef(newIdempotencyKey());

  // Retomar solicitud pendiente existente
  useEffect(() => {
    if (data?.pendingId && phase.kind === 'idle') setPhase({ kind: 'pending', requestId: data.pendingId });
  }, [data?.pendingId, phase.kind]);

  // Consulta periódica mientras espera aprobación del comercio
  useEffect(() => {
    if (phase.kind !== 'pending') return;
    let alive = true;
    const tick = async () => {
      try {
        const h = await api<{ visits: VisitRequestView[] }>('/v1/me/history');
        const v = h.visits.find((x) => x.id === phase.requestId);
        if (!alive || !v || v.status === 'pending') return;
        if (v.status === 'approved') {
          const p = await api<{ passport: PassportView }>('/v1/me/passport');
          const newly = p.passport.tiers.find((t) => t.unlocked && !data?.unlockedBefore.has(t.id));
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPhase({ kind: 'approved', unlocked: newly ? newly.name : null });
        } else {
          setPhase({ kind: 'rejected', reason: v.rejectReason });
        }
      } catch {
        /* reintenta en el próximo ciclo */
      }
    };
    const t = setInterval(tick, 3000);
    void tick();
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [phase, data?.unlockedBefore]);

  const requestStamp = async () => {
    if (!qrCode) return;
    setPhase({ kind: 'sending' });
    try {
      const r = await api<{ visitRequest: { id: string } }>('/v1/visit-requests', {
        method: 'POST',
        body: { qrCode },
        idempotencyKey: idemKey.current,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase({ kind: 'pending', requestId: r.visitRequest.id });
    } catch (e) {
      const err = e as ApiError;
      setPhase({ kind: 'error', message: err.message });
      if (err.code === 'already_stamped') void refresh();
    }
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={refresh} />;
  if (!data) return null;
  const b = data.branch;

  return (
    <>
      <Stack.Screen options={{ title: b.name.replace(/ Demo$/, '') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CategoryIcon category={b.category} size={56} />
          <View style={{ flex: 1 }}>
            <P muted small>{CATEGORY_LABEL[b.category]} · {b.city}</P>
            <H1 style={{ fontSize: 23 }}>{b.name}</H1>
          </View>
          {b.isDemo && <Badge kind="demo" />}
        </View>
        <P>{b.description}</P>
        {b.hours && <P muted>🕑 {b.hours}</P>}
        {b.lat != null && b.lng != null && (
          <Button
            variant="ghost"
            title="Cómo llegar (mapa externo)"
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`)}
          />
        )}

        <StampPanel
          phase={phase}
          stamped={data.stamped}
          canRequest={!!qrCode}
          name={b.name}
          category={b.category}
          onRequest={requestStamp}
        />

        {b.offers.length > 0 && (
          <Card>
            <H2>Beneficios de este comercio</H2>
            {b.offers.map((o) => (
              <View key={o.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
                <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 15 }}>{o.title}</Text>
                <P muted small>{o.conditions}</P>
              </View>
            ))}
            <P muted small style={{ marginTop: 6 }}>Se desbloquean al completar niveles del pasaporte, sujetos a cupo.</P>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function StampPanel(props: {
  phase: Phase;
  stamped: boolean;
  canRequest: boolean;
  name: string;
  category: BranchDetail['category'];
  onRequest: () => void;
}) {
  const { phase } = props;

  if (phase.kind === 'approved') {
    return (
      <Card style={{ alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderColor: '#E4D3B0' }}>
        <Stamp label={props.name} category={props.category} size={120} />
        <H2 style={{ marginBottom: 0 }}>¡Sello aprobado!</H2>
        {phase.unlocked ? (
          <>
            <Alert kind="ok">Desbloqueaste el nivel «{phase.unlocked}». Tu beneficio ya está en Beneficios.</Alert>
            <Button variant="gold" title="Ver mi beneficio" onPress={() => router.replace('/rewards')} style={{ alignSelf: 'stretch' }} />
          </>
        ) : (
          <Button title="Ver mi pasaporte" onPress={() => router.replace('/passport')} style={{ alignSelf: 'stretch' }} />
        )}
      </Card>
    );
  }

  if (props.stamped) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Stamp label={props.name} category={props.category} size={64} />
        <P style={{ flex: 1 }}>Ya tienes el sello de este lugar en la campaña actual.</P>
      </Card>
    );
  }

  if (phase.kind === 'pending') {
    return (
      <Card style={{ gap: 10, borderColor: colors.gold, borderWidth: 2 }}>
        <Badge kind="pending" label="Esperando al comercio" />
        <H2 style={{ marginBottom: 0 }}>Solicitud enviada</H2>
        <P>Pide al personal que apruebe tu visita en su panel. Esta pantalla se actualiza sola.</P>
      </Card>
    );
  }

  if (phase.kind === 'rejected') {
    return <Alert kind="error">El comercio rechazó la solicitud{phase.reason ? `: ${phase.reason}` : ''}.</Alert>;
  }

  return (
    <Card style={{ gap: 10 }}>
      <H2 style={{ marginBottom: 0 }}>Sello de visita</H2>
      {props.canRequest ? (
        <>
          <P>Escaneaste el QR de este local. Solicita tu sello; el personal lo aprobará.</P>
          {phase.kind === 'error' && <Alert kind="error">{phase.message}</Alert>}
          <Button title="Solicitar sello" onPress={props.onRequest} loading={phase.kind === 'sending'} />
        </>
      ) : (
        <>
          <P>Para pedir tu sello, escanea el código QR en caja o recepción del local.</P>
          <Button title="Escanear QR" variant="gold" onPress={() => router.push('/scan')} />
        </>
      )}
    </Card>
  );
}
