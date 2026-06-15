const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export function getEffectiveTier(user: {
  tier: string;
  stripeCustomerId?: string | null;
  stripeCurrentPeriodEnd?: Date | string | null;
}): string {
  if (!user.stripeCustomerId) return user.tier;
  const now = new Date();
  const periodEnd = user.stripeCurrentPeriodEnd
    ? new Date(user.stripeCurrentPeriodEnd)
    : null;
  if (periodEnd && periodEnd > now) {
    const paidTierIndex = TIER_HIERARCHY[user.tier] ?? 0;
    const baseIndex = TIER_HIERARCHY.free;
    return paidTierIndex > baseIndex ? user.tier : 'pro';
  }
  return user.tier;
}
