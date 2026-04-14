import Link from "next/link";
import styles from "./UsageSummary.module.css";

interface Props {
  currentMonthUsageCents: number;
  spendingLimitCents: number | null;
  billingPlan: string;
  isAdmin: boolean;
}

export default function UsageSummary({
  currentMonthUsageCents,
  spendingLimitCents,
  billingPlan,
  isAdmin,
}: Props) {
  if (isAdmin) return null;
  if (billingPlan !== "paid") return null;

  const usageDollars = currentMonthUsageCents / 100;
  const limitDollars = spendingLimitCents != null ? spendingLimitCents / 100 : null;
  const pct =
    limitDollars != null
      ? Math.min(100, (usageDollars / limitDollars) * 100)
      : 0;
  const limitReached = limitDollars != null && usageDollars >= limitDollars;

  return (
    <div className={`${styles.widget} ${limitReached ? styles.widgetWarning : ""}`}>
      <div className={styles.header}>
        <span className={styles.title}>AI Usage This Month</span>
        <Link href="/billing" className={styles.link}>
          Manage
        </Link>
      </div>

      <div className={styles.amounts}>
        <span className={styles.usage}>${usageDollars.toFixed(2)}</span>
        {limitDollars != null && (
          <span className={styles.limit}>/ ${limitDollars.toFixed(2)} limit</span>
        )}
        {limitDollars == null && (
          <span className={styles.limit}>no limit set</span>
        )}
      </div>

      {limitDollars != null && (
        <div className={styles.bar}>
          <div
            className={`${styles.fill} ${limitReached ? styles.fillWarning : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {limitReached && (
        <p className={styles.warning}>
          Spending limit reached — using free model &amp; photo ID disabled.
        </p>
      )}
    </div>
  );
}
