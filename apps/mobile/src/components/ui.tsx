import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { BranchCategory } from '@pg/contracts';
import { CATEGORY_STYLE, colors, radius } from '../lib/theme';

export function DemoBanner() {
  return (
    <View style={s.banner} accessibilityRole="text">
      <Text style={s.bannerText}>DEMOSTRACIÓN · comercios y datos ficticios</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, v.box, (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[s.btnText, v.text]}>{title}</Text>}
    </Pressable>
  );
}

const VARIANTS: Record<string, { box: ViewStyle; text: TextStyle }> = {
  primary: { box: { backgroundColor: colors.green }, text: { color: colors.white } },
  gold: { box: { backgroundColor: colors.gold }, text: { color: colors.navy } },
  ghost: { box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line }, text: { color: colors.ink } },
  danger: { box: { backgroundColor: colors.dangerSoft }, text: { color: colors.danger } },
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h1, style]} accessibilityRole="header">{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]} accessibilityRole="header">{children}</Text>;
}
export function P({ children, muted, small, style }: { children: ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.p, muted && { color: colors.muted }, small && { fontSize: 13 }, style]}>{children}</Text>;
}

type BadgeKind = 'pending' | 'approved' | 'rejected' | 'issued' | 'redeemed' | 'expired' | 'demo' | 'cancelled';
const BADGE: Record<BadgeKind, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.goldSoft, fg: '#8A5D14', label: 'Pendiente' },
  approved: { bg: colors.greenSoft, fg: colors.green, label: 'Aprobado' },
  rejected: { bg: colors.dangerSoft, fg: colors.danger, label: 'Rechazado' },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger, label: 'Cancelado' },
  issued: { bg: '#E6EEF9', fg: '#2A4F8A', label: 'Disponible' },
  redeemed: { bg: colors.greenSoft, fg: colors.green, label: 'Canjeado' },
  expired: { bg: '#ECEDEC', fg: colors.muted, label: 'Vencido' },
  demo: { bg: colors.gold, fg: colors.navy, label: 'DEMO' },
};
export function Badge({ kind, label }: { kind: BadgeKind; label?: string }) {
  const b = BADGE[kind];
  return (
    <View style={[s.badge, { backgroundColor: b.bg }]}>
      <Text style={[s.badgeText, { color: b.fg }]}>{label ?? b.label}</Text>
    </View>
  );
}

export function CategoryIcon({ category, size = 44 }: { category: BranchCategory; size?: number }) {
  const c = CATEGORY_STYLE[category];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.tint + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.45, color: c.tint }}>{c.glyph}</Text>
    </View>
  );
}

/** Sello circular estilo libreta de viaje (arte original). */
export function Stamp({ label, category, demo, empty, size = 96, rotate = -8 }: {
  label?: string; category?: BranchCategory; demo?: boolean; empty?: boolean; size?: number; rotate?: number;
}) {
  const tint = empty ? '#D7C9AB' : category ? CATEGORY_STYLE[category].tint : colors.green;
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderStyle: 'dashed', borderColor: tint,
        alignItems: 'center', justifyContent: 'center', padding: 8, transform: [{ rotate: `${empty ? 0 : rotate}deg` }],
      }}
      accessibilityLabel={empty ? 'Sello pendiente' : `Sello de ${label}`}
    >
      <View style={{ position: 'absolute', width: size - 14, height: size - 14, borderRadius: size, borderWidth: 1, borderColor: tint, opacity: 0.5 }} />
      {empty ? (
        <Text style={{ color: tint, fontSize: size * 0.3, fontWeight: '800' }}>?</Text>
      ) : (
        <>
          {category && <Text style={{ color: tint, fontSize: size * 0.2 }}>{CATEGORY_STYLE[category].glyph}</Text>}
          <Text numberOfLines={2} style={{ color: tint, fontSize: size * 0.105, fontWeight: '800', textAlign: 'center', textTransform: 'uppercase' }}>
            {label?.replace(/ Demo$/, '')}
          </Text>
          {demo && <Text style={{ color: tint, fontSize: size * 0.08, fontWeight: '700' }}>DEMO</Text>}
        </>
      )}
    </View>
  );
}

export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.green} size="large" />
      <P muted style={{ marginTop: 12 }}>{text}</P>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={{ fontSize: 34, marginBottom: 8 }}>⚠</Text>
      <P style={{ textAlign: 'center', marginBottom: 16 }}>{message}</P>
      {onRetry && <Button title="Reintentar" onPress={onRetry} variant="ghost" />}
    </View>
  );
}

export function Alert({ kind, children }: { kind: 'ok' | 'error' | 'info'; children: ReactNode }) {
  const bg = kind === 'ok' ? colors.greenSoft : kind === 'error' ? colors.dangerSoft : colors.goldSoft;
  const fg = kind === 'ok' ? '#005A55' : kind === 'error' ? colors.danger : '#6D4A10';
  return (
    <View style={{ backgroundColor: bg, padding: 12, borderRadius: radius.sm }}>
      <Text style={{ color: fg, fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { backgroundColor: colors.gold, paddingVertical: 4, alignItems: 'center' },
  bannerText: { color: colors.navy, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  btn: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.line },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 22, color: colors.ink },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
