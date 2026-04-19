import Link from "next/link";
import ManageSubscriptionButton from "./ManageSubscriptionButton";
import CancelSubscriptionButton from "./CancelSubscriptionButton";
import ExtraUsageButton from "./ExtraUsageButton";
import styles from "./ProfileBillingSection.module.css";
import { PRO_LIMIT_CENTS } from "@/lib/dal/billing";
import { EXTRA_USAGE_OPTIONS } from "@/lib/billing-config";
import {
  computeBillingState,
  formatPeriodEndDate,
  getPlanLabel,
  getVisibleActions,
} from "@/lib/billing-ui";

interface Props {
  billingPlan: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  currentMonthUsageCents: number;
  extraUsageCents: number;
  isAdmin: boolean;
}

export default function ProfileBillingSection({
  billingPlan,
  subscriptionStatus,
  stripeCustomerId,
  stripeSubscriptionId,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  currentMonthUsageCents,
  extraUsageCents,
  isAdmin,
}: Props) {
  if (isAdmin) return null;

  const usageDollars = currentMonthUsageCents / 100;
  const limitDollars = PRO_LIMIT_CENTS / 100; // $4.00 fixed
  const extraDollars = extraUsageCents / 100;

  const billingState = computeBillingState({
    currentPlan: billingPlan,
    isAdmin,
    subscriptionStatus,
    cancelAtPeriodEnd,
    stripeSubscriptionId,
  });
  const visibleActions = getVisibleActions(billingState);
  const planLabel = getPlanLabel({
    currentPlan: billingPlan,
    isAdmin,
    cancelAtPeriodEnd,
    isDraining: billingState === "draining",
    subscriptionStatus,
  });
  const periodEndFormatted = currentPeriodEnd ? formatPeriodEndDate(currentPeriodEnd) : undefined;

  const pct = billingPlan === "paid"
    ? Math.min(100, (usageDollars / limitDollars) * 100)
    : 0;

  // Pro allowance exhausted (usage >= $4)
  const proLimitReached = billingPlan === "paid" && currentMonthUsageCents >= PRO_LIMIT_CENTS;
  // All usage exhausted (usage >= $4 + extra)
  const allUsageExhausted = billingPlan === "paid" && currentMonthUsageCents >= PRO_LIMIT_CENTS + extraUsageCents;
  // Remaining extra usage in dollars
  const extraRemaining = proLimitReached && !allUsageExhausted
    ? (PRO_LIMIT_CENTS + extraUsageCents - currentMonthUsageCents) / 100
    : 0;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Billing</h2>

      <div className={styles.row}>
        <span className={styles.label}>Plan</span>
        <span className={styles.value}>
          {billingPlan === "paid" ? "Birder Pro" : "Free Starter"}
          <span className={`${styles.status} ${billingPlan === "paid" ? (styles[`status_${billingState}`] ?? "") : ""}`}>
            {planLabel}
          </span>
        </span>
      </div>

      {billingPlan === "paid" && (
        <>
          <div className={styles.row}>
            <span className={styles.label}>This month&apos;s AI usage</span>
            <span className={styles.value}>
              ${usageDollars.toFixed(2)} / ${limitDollars.toFixed(2)} Pro allowance
              {proLimitReached && !allUsageExhausted && extraUsageCents > 0 && (
                <span className={styles.extraBadge}>
                  +${extraRemaining.toFixed(2)} extra remaining
                </span>
              )}
              {allUsageExhausted && (
                <span className={styles.limitBadge}>All usage exhausted</span>
              )}
            </span>
          </div>

          <div className={styles.bar}>
            <div
              className={`${styles.fill} ${proLimitReached ? styles.fillWarning : ""}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {proLimitReached && (
            <div className={styles.extraSection}>
              <p className={styles.extraTitle}>Add Extra AI Usage</p>
              <p className={styles.extraDesc}>
                {allUsageExhausted
                  ? "You've used your $4 monthly Pro allowance and all purchased extra usage. Purchase more to re-enable photo identification and the advanced AI model."
                  : "You've used your $4 monthly Pro allowance. Your purchased extra usage is being drawn from. Add more if needed."}
              </p>
              <div className={styles.extraButtons}>
                {EXTRA_USAGE_OPTIONS.map((opt) => (
                  <ExtraUsageButton key={opt.cents} amountCents={opt.cents} label={opt.label} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {billingState === "canceling" && periodEndFormatted && (
        <div className={styles.cancelingBadge}>
          Active until {periodEndFormatted}
        </div>
      )}
      {billingState === "draining" && (
        <div className={styles.drainNotice}>
          Your subscription has ended. You have ${extraDollars.toFixed(2)} in unused
          credits remaining — paid features stay active until they&apos;re used up.
        </div>
      )}

      <div className={styles.actions}>
        <Link href="/billing" className={styles.manageLink}>
          {billingPlan === "paid" ? "Manage Billing" : "Upgrade to Pro"}
        </Link>
        {visibleActions.showCancel && stripeCustomerId && (
          <CancelSubscriptionButton
            action="cancel"
            label="Cancel Subscription"
            periodEndDate={periodEndFormatted}
            extraUsageDollars={extraDollars}
          />
        )}
        {visibleActions.showUpdatePayment && stripeCustomerId && (
          <ManageSubscriptionButton />
        )}
        {visibleActions.showResubscribe && stripeCustomerId && (
          <CancelSubscriptionButton
            action="reactivate"
            label="Resubscribe"
          />
        )}
      </div>
    </section>
  );
}
