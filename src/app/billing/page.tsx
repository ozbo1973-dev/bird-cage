import { requireVerifiedAuth } from "@/lib/session";
import { getUserBillingInfo } from "@/lib/billing";
import { getBillingInfo } from "@/lib/dal/billing";
import { updateSpendingLimitAction } from "./actions";
import BillingCheckoutButton from "@/components/BillingCheckoutButton";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import NavDropdown from "@/components/NavDropdown";
import Link from "next/link";
import styles from "./page.module.css";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { success, canceled } = await searchParams;
  const info = await getUserBillingInfo(session.user.id);
  const billingDetails = await getBillingInfo(session.user.id);
  const currentPlan = info?.billingPlan ?? "free";
  const isAdmin = info?.role === "admin";
  const subscriptionStatus = billingDetails?.subscriptionStatus ?? null;
  const hasStripeSubscription = !!billingDetails?.stripeCustomerId;
  const spendingLimitDollars = billingDetails?.spendingLimitCents != null
    ? billingDetails.spendingLimitCents / 100
    : null;
  const currentUsageDollars = (billingDetails?.currentMonthUsageCents ?? 0) / 100;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.headerTitle}>Billing &amp; Plan</h1>
        <div className={styles.headerRight}>
          <NavDropdown isAdmin={isAdmin} returnPath="/billing" />
        </div>
      </header>

      <main className={styles.main}>
        {success && (
          <div className={styles.successBanner}>
            🎉 Subscription activated! You now have access to all Pro features.
          </div>
        )}
        {canceled && (
          <div className={styles.cancelBanner}>
            Checkout was canceled. Your plan has not changed.
          </div>
        )}

        <div className={styles.intro}>
          <h2 className={styles.pageTitle}>Your Plan</h2>
          <p className={styles.subtitle}>
            {isAdmin
              ? "As an admin, you have access to all features."
              : "Start free and upgrade when you're ready for more powerful AI features."}
          </p>
          <span className={styles.currentPlan}>
            Current plan:{" "}
            {isAdmin
              ? "Admin (all access)"
              : currentPlan === "paid"
                ? `Paid${subscriptionStatus ? ` (${subscriptionStatus})` : ""}`
                : "Free"}
          </span>
        </div>

        <div className={styles.cards}>
          {/* Free Plan Card */}
          <div className={currentPlan === "free" && !isAdmin ? `${styles.card} ${styles.cardActive}` : styles.card}>
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
                Location tracking &amp; map view
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

            {currentPlan === "free" && !isAdmin ? (
              <div className={styles.activeBadge}>Current Plan</div>
            ) : null}
          </div>

          {/* Paid Plan Card */}
          <div className={currentPlan === "paid" || isAdmin ? `${styles.card} ${styles.cardActive}` : styles.card}>
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
                Set monthly spending limits
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Priority AI response speed
              </li>
            </ul>

            {isAdmin ? (
              <div className={styles.activeBadge}>Admin — Full Access</div>
            ) : currentPlan === "paid" ? (
              <div>
                <div className={styles.activeBadge}>
                  {subscriptionStatus === "paused"
                    ? "Payment Issue — Update Payment"
                    : "Current Plan"}
                </div>
                {hasStripeSubscription && (
                  <div className={styles.manageRow}>
                    <ManageSubscriptionButton label="Manage / Cancel Subscription" />
                  </div>
                )}
              </div>
            ) : (
              <BillingCheckoutButton />
            )}
          </div>
        </div>

        {/* Spending Limit Section — visible for paid users and admins */}
        {(currentPlan === "paid" || isAdmin) && (
          <div className={styles.spendingSection}>
            <h3 className={styles.sectionTitle}>Monthly Spending Limit</h3>
            <p className={styles.sectionDesc}>
              Set a monthly cap on AI usage costs. When reached, photo
              identification is disabled and the free AI model is used.
              Admins bypass this limit.
            </p>

            <div className={styles.usageRow}>
              <span className={styles.usageLabel}>This month&apos;s usage:</span>
              <span className={styles.usageValue}>
                ${currentUsageDollars.toFixed(2)}
                {spendingLimitDollars != null
                  ? ` / $${spendingLimitDollars.toFixed(2)} limit`
                  : " (no limit)"}
              </span>
            </div>

            {spendingLimitDollars != null && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, (currentUsageDollars / spendingLimitDollars) * 100)}%`,
                  }}
                />
              </div>
            )}

            <form
              action={async (formData: FormData) => {
                "use server";
                const val = formData.get("limit") as string;
                const limit = val && parseFloat(val) > 0 ? parseFloat(val) : null;
                await updateSpendingLimitAction(limit);
              }}
              className={styles.limitForm}
            >
              <label htmlFor="limit" className={styles.limitLabel}>
                Monthly limit ($)
              </label>
              <div className={styles.limitRow}>
                <input
                  id="limit"
                  name="limit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 10.00 (leave blank for no limit)"
                  defaultValue={spendingLimitDollars ?? ""}
                  className={styles.limitInput}
                />
                <button type="submit" className={styles.limitBtn}>
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
