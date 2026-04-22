import Link from "next/link";
import styles from "./UsageSummary.module.css";
import { PRO_LIMIT_CENTS } from "@/lib/billing-config";

interface Props {
  currentMonthUsageCents: number;
  extraUsageCents: number;
  billingPlan: string;
  isAdmin: boolean;
}

export default function UsageSummary({
  currentMonthUsageCents,
  extraUsageCents,
  billingPlan,
  isAdmin,
}: Props) {
  if (isAdmin) return null;
  if (billingPlan !== "paid") return null;

  const pct = Math.min(100, (currentMonthUsageCents / PRO_LIMIT_CENTS) * 100);
  const proLimitReached = currentMonthUsageCents >= PRO_LIMIT_CENTS;
  const allUsageExhausted = currentMonthUsageCents >= PRO_LIMIT_CENTS + extraUsageCents;

  return (
    <div className={`${styles.widget} ${allUsageExhausted ? styles.widgetWarning : ""}`}>
      <div className={styles.header}>
        <span className={styles.title}>AI Usage This Month</span>
        <Link href="/billing" className={styles.link}>
          Manage
        </Link>
      </div>

      <div className={styles.amounts}>
        <span className={styles.usage}>{Math.round(pct)}%</span>
        <span className={styles.limit}>of monthly allowance used</span>
        {proLimitReached && !allUsageExhausted && extraUsageCents > 0 && (
          <span className={styles.extra}>
            +${(extraUsageCents / 100).toFixed(2)} extra
          </span>
        )}
      </div>

      <div className={styles.bar}>
        <div
          className={`${styles.fill} ${proLimitReached ? styles.fillWarning : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {allUsageExhausted && (
        <p className={styles.warning}>
          All AI usage exhausted — using free model &amp; photo ID disabled.{" "}
          <Link href="/dashboard/profile" className={styles.warningLink}>
            Add extra usage →
          </Link>
        </p>
      )}
      {proLimitReached && !allUsageExhausted && (
        <p className={styles.notice}>
          Pro allowance used.{" "}
          {extraUsageCents > 0
            ? `Drawing from $${(extraUsageCents / 100).toFixed(2)} extra usage.`
            : ""}
        </p>
      )}
    </div>
  );
}
