import Link from "next/link";
import ManageSubscriptionButton from "./ManageSubscriptionButton";
import styles from "./ProfileBillingSection.module.css";

interface Props {
  billingPlan: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  spendingLimitCents: number | null;
  currentMonthUsageCents: number;
  isAdmin: boolean;
}

export default function ProfileBillingSection({
  billingPlan,
  subscriptionStatus,
  stripeCustomerId,
  spendingLimitCents,
  currentMonthUsageCents,
  isAdmin,
}: Props) {
  if (isAdmin) return null;

  const usageDollars = currentMonthUsageCents / 100;
  const limitDollars = spendingLimitCents != null ? spendingLimitCents / 100 : null;
  const pct =
    limitDollars != null
      ? Math.min(100, (usageDollars / limitDollars) * 100)
      : 0;
  const limitReached = limitDollars != null && usageDollars >= limitDollars;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Billing</h2>

      <div className={styles.row}>
        <span className={styles.label}>Plan</span>
        <span className={styles.value}>
          {billingPlan === "paid" ? "Birder Pro" : "Free Starter"}
          {subscriptionStatus && billingPlan === "paid" && (
            <span className={`${styles.status} ${styles[`status_${subscriptionStatus}`] ?? ""}`}>
              {subscriptionStatus}
            </span>
          )}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>This month&apos;s AI usage</span>
        <span className={styles.value}>
          ${usageDollars.toFixed(2)}
          {limitDollars != null && ` / $${limitDollars.toFixed(2)}`}
          {limitReached && (
            <span className={styles.limitBadge}>Limit reached</span>
          )}
        </span>
      </div>

      {limitDollars != null && (
        <div className={styles.bar}>
          <div
            className={`${styles.fill} ${limitReached ? styles.fillWarning : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className={styles.actions}>
        <Link href="/billing" className={styles.manageLink}>
          {billingPlan === "paid" ? "Manage Billing & Spending Limit" : "Upgrade to Pro"}
        </Link>
        {billingPlan === "paid" && stripeCustomerId && (
          <ManageSubscriptionButton label="Cancel / Resubscribe" />
        )}
      </div>
    </section>
  );
}
