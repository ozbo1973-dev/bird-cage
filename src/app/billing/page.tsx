import { requireVerifiedAuth } from "@/lib/session";
import { getUserBillingInfo } from "@/lib/billing";
import { updateBillingPlan } from "./actions";
import Link from "next/link";
import styles from "./page.module.css";

export default async function BillingPage() {
  const session = await requireVerifiedAuth();
  const info = await getUserBillingInfo(session.user.id);
  const currentPlan = info?.billingPlan ?? "free";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.headerTitle}>Choose Your Plan</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h2 className={styles.pageTitle}>Upgrade Bird Cage</h2>
          <p className={styles.subtitle}>
            Start free and upgrade when you&apos;re ready for more powerful AI features.
          </p>
          <span className={styles.currentPlan}>
            Current plan: {currentPlan === "paid" ? "Paid" : "Free"}
          </span>
        </div>

        <div className={styles.cards}>
          {/* Free Plan Card */}
          <div className={currentPlan === "free" ? `${styles.card} ${styles.cardActive}` : styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.planBadge} ${styles.planBadgeFree}`}>Free</span>
              <span className={styles.planName}>Starter</span>
            </div>

            <p className={styles.planPrice}>
              $0 <span>/ month</span>
            </p>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Unlimited birding events
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Unlimited bird sightings
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                AI chat bird identification (free model)
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Location tracking & map view
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureX}>✗</span>
                Photo-based AI identification
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureX}>✗</span>
                Advanced AI model (GPT-4o quality)
              </li>
            </ul>

            {currentPlan === "free" ? (
              <div className={styles.activeBadge}>Current Plan</div>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await updateBillingPlan("free");
                }}
              >
                <button type="submit" className={`${styles.selectBtn} ${styles.selectBtnFree}`}>
                  Switch to Free
                </button>
              </form>
            )}
          </div>

          {/* Paid Plan Card */}
          <div className={currentPlan === "paid" ? `${styles.card} ${styles.cardActive}` : styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.planBadge} ${styles.planBadgePaid}`}>Pro</span>
              <span className={styles.planName}>Birder Pro</span>
            </div>

            <p className={styles.planPrice}>
              $9 <span>/ month</span>
            </p>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Everything in Free
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Photo-based AI bird identification
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Advanced AI model for chat identification
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Priority AI response speed
              </li>
            </ul>

            {currentPlan === "paid" ? (
              <div className={styles.activeBadge}>Current Plan</div>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await updateBillingPlan("paid");
                }}
              >
                <button type="submit" className={`${styles.selectBtn} ${styles.selectBtnPaid}`}>
                  Upgrade to Pro
                </button>
              </form>
            )}
          </div>
        </div>

        <p className={styles.note}>
          No payment required — billing plan is a feature flag for this demo.
        </p>
      </main>
    </div>
  );
}
