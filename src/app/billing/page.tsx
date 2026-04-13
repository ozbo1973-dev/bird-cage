import { requireVerifiedAuth } from "@/lib/session";
import { getUserBillingInfo } from "@/lib/billing";
import { updateBillingPlan } from "./actions";
import styles from "./page.module.css";

export default async function BillingPage() {
  const session = await requireVerifiedAuth();
  const billing = await getUserBillingInfo(session.user.id);
  const currentPlan = billing?.billingPlan ?? "free";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Choose Your Plan</h1>
        <p className={styles.subtitle}>
          Start free and upgrade anytime to unlock all features
        </p>
      </div>

      <div className={styles.cards}>
        {/* Free Plan */}
        <div className={`${styles.card} ${currentPlan === "free" ? styles.cardCurrent : ""}`}>
          <div>
            <div className={styles.planName}>Free Starter</div>
            {currentPlan === "free" && (
              <span className={styles.currentBadge}>Current plan</span>
            )}
          </div>
          <div className={styles.planPrice}>
            $0 <span>/ month</span>
          </div>
          <ul className={styles.featureList}>
            <li>Unlimited birding events</li>
            <li>Unlimited bird sightings</li>
            <li>AI chat identification</li>
            <li>GPS location tagging</li>
            <li>Dashboard &amp; search</li>
            <li className={styles.featureDisabled}>Photo identification</li>
            <li className={styles.featureDisabled}>Premium AI models</li>
          </ul>
          <form action={updateBillingPlan.bind(null, "free")}>
            <button
              type="submit"
              className={styles.selectBtn}
              disabled={currentPlan === "free"}
            >
              {currentPlan === "free" ? "Current Plan" : "Select Free"}
            </button>
          </form>
        </div>

        {/* Paid Plan */}
        <div className={`${styles.card} ${currentPlan === "paid" ? styles.cardCurrent : ""}`}>
          <div>
            <div className={styles.planName}>Birder Pro</div>
            {currentPlan === "paid" && (
              <span className={styles.currentBadge}>Current plan</span>
            )}
          </div>
          <div className={styles.planPrice}>
            $9 <span>/ month</span>
          </div>
          <ul className={styles.featureList}>
            <li>Everything in Free</li>
            <li>Photo bird identification</li>
            <li>Premium AI models</li>
            <li>Priority support</li>
          </ul>
          <form action={updateBillingPlan.bind(null, "paid")}>
            <button
              type="submit"
              className={styles.selectBtn}
              disabled={currentPlan === "paid"}
            >
              {currentPlan === "paid" ? "Current Plan" : "Upgrade to Pro"}
            </button>
          </form>
        </div>
      </div>

      <form action={updateBillingPlan.bind(null, currentPlan)}>
        <button type="submit" className={styles.skipLink}>
          Continue with current plan →
        </button>
      </form>
    </div>
  );
}
