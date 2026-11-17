import { z } from 'zod';

// ---------- Enums ----------
export const VisitStatus = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export type VisitStatus = z.infer<typeof VisitStatus>;

export const CouponStatus = z.enum(['issued', 'redeemed', 'expired']);
export type CouponStatus = z.infer<typeof CouponStatus>;

export const MembershipRole = z.enum(['staff', 'owner']);
export type MembershipRole = z.infer<typeof MembershipRole>;

export const PlatformRole = z.enum(['traveler', 'admin']);
export type PlatformRole = z.infer<typeof PlatformRole>;

export const BranchCategory = z.enum(['food', 'lodging', 'experience', 'shop']);
export type BranchCategory = z.infer<typeof BranchCategory>;

export const CATEGORY_LABEL: Record<BranchCategory, string> = {
  food: 'Restaurante / Café',
  lodging: 'Alojamiento',
  experience: 'Experiencia',
  shop: 'Tienda',
};

// ---------- QR ----------
/** Formato del QR impreso: identifica la sucursal, NO acredita visita. */
export const QR_PREFIX = 'pguanaco://branch/';
export function parseBranchQr(raw: string): string | null {
  const t = raw.trim();
  const m = /^(?:pguanaco:\/\/branch\/|https?:\/\/[^/]+\/b\/)([A-Za-z0-9_-]{4,64})$/.exec(t);
  return m ? m[1]! : null;
}

// ---------- Requests ----------
export const Uuid = z.uuid();

export const CreateVisitRequestBody = z.object({
  qrCode: z.string().min(4).max(64).regex(/^[A-Za-z0-9_-]+$/),
  campaignId: Uuid.optional(),
});
export type CreateVisitRequestBody = z.infer<typeof CreateVisitRequestBody>;

export const RejectVisitBody = z.object({
  reason: z.string().trim().min(2).max(200),
});
export type RejectVisitBody = z.infer<typeof RejectVisitBody>;

export const RedeemBody = z.object({
  code: z.string().trim().regex(/^[0-9]{6}$/, 'El código tiene 6 dígitos'),
  branchId: Uuid,
});
export type RedeemBody = z.infer<typeof RedeemBody>;

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

// ---------- Responses ----------
export interface BranchSummary {
  id: string;
  name: string;
  category: BranchCategory;
  city: string;
  description: string;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  isDemo: boolean;
  merchantName: string;
}

export interface RouteSummary {
  id: string;
  name: string;
  region: string;
  description: string;
  coverUrl: string | null;
  stopCount: number;
  isDemo: boolean;
}

export interface RouteDetail extends RouteSummary {
  stops: (BranchSummary & { position: number })[];
}

export interface OfferSummary {
  id: string;
  title: string;
  conditions: string;
  merchantName: string;
}

export interface BranchDetail extends BranchSummary {
  offers: OfferSummary[];
}

export interface RewardTier {
  id: string;
  name: string;
  stampsRequired: number;
  description: string;
  unlocked: boolean;
}

export interface Stamp {
  id: string;
  branchId: string;
  branchName: string;
  category: BranchCategory;
  createdAt: string;
  isDemo: boolean;
}

export interface VisitRequestView {
  id: string;
  status: VisitStatus;
  branchId: string;
  branchName: string;
  travelerName: string;
  createdAt: string;
  decidedAt: string | null;
  rejectReason: string | null;
}

export interface PassportView {
  campaign: { id: string; name: string; startsAt: string; endsAt: string } | null;
  stamps: Stamp[];
  pending: VisitRequestView[];
  tiers: RewardTier[];
  /** Mensaje cuando se alcanzó un nivel pero no hay inventario. */
  notices: string[];
}

export interface CouponView {
  id: string;
  status: CouponStatus;
  offerTitle: string;
  conditions: string;
  merchantName: string;
  tierName: string;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
}

export interface RedemptionTokenView {
  code: string;
  expiresAt: string;
}

export interface MerchantMetrics {
  merchantId: string;
  merchantName: string;
  visitRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  couponsIssued: number;
  redemptions: number;
  inventory: { offerTitle: string; total: number; reserved: number; redeemed: number; available: number }[];
}

export interface MeView {
  userId: string;
  displayName: string;
  platformRole: PlatformRole;
  memberships: { merchantId: string; merchantName: string; branchId: string | null; branchName: string | null; role: MembershipRole }[];
}

export interface ApiError {
  error: { code: string; message: string; requestId?: string };
}
