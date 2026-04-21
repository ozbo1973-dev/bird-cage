/** Single source of truth for billing/subscription pricing. */
export const SUBSCRIPTION_PRICE_DOLLARS = "5.99";

/** Monthly AI usage allowance for Pro plan users (in cents). */
export const PRO_LIMIT_CENTS = 400;
export const SUBSCRIPTION_PRICE_LABEL = `$${SUBSCRIPTION_PRICE_DOLLARS} / month`;

/** Extra usage top-up options, in cents. */
export const EXTRA_USAGE_OPTIONS = [
  { cents: 200, label: "+ $2 Extra Usage" },
  { cents: 500, label: "+ $5 Extra Usage" },
] as const;

export type ExtraUsageCents = (typeof EXTRA_USAGE_OPTIONS)[number]["cents"];
