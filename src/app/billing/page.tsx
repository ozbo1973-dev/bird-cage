import { SUBSCRIPTION_PRICE_DOLLARS } from "@/lib/billing-config";
import { requireVerifiedAuth } from "@/lib/session";
import { getUserBillingInfo } from "@/lib/billing";
import { getBillingInfo, syncSubscriptionFromStripe } from "@/lib/dal/billing";
import BillingCheckoutButton from "@/components/BillingCheckoutButton";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import CancelSubscriptionButton from "@/components/CancelSubscriptionButton";
import NavDropdown from "@/components/NavDropdown";
import Link from "next/link";
import {
  computeBillingState,
  formatPeriodEndDate,
  getPlanLabel,
  getVisibleActions,
} from "@/lib/billing-ui";
import styles from "./page.module.css";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { success, canceled } = await searchParams;
  await syncSubscriptionFromStripe(session.user.id);
  const info = await getUserBillingInfo(session.user.id);
  const billingDetails = await getBillingInfo(session.user.id);
  const currentPlan = info?.billingPlan ?? "free";
  const isAdmin = info?.role === "admin";
  const subscriptionStatus = billingDetails?.subscriptionStatus ?? null;
  const cancelAtPeriodEnd = billingDetails?.cancelAtPeriodEnd ?? false;
  const currentPeriodEnd = billingDetails?.currentPeriodEnd ?? null;
  const stripeSubscriptionId = billingDetails?.stripeSubscriptionId ?? null;
  const currentUsageDollars = (billingDetails?.currentMonthUsageCents ?? 0) / 100;
  const extraUsageDollars = (billingDetails?.extraUsageCents ?? 0) / 100;

  const billingState = computeBillingState({
    currentPlan,
    isAdmin,
    subscriptionStatus,
    cancelAtPeriodEnd,
    stripeSubscriptionId,
  });
  const visibleActions = getVisibleActions(billingState);
  const planLabel = getPlanLabel({
    currentPlan,
    isAdmin,
    cancelAtPeriodEnd,
    isDraining: billingState === "draining",
    subscriptionStatus,
  });
  const periodEndFormatted = currentPeriodEnd ? formatPeriodEndDate(currentPeriodEnd) : undefined;

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
            Current plan: {planLabel}
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
              ${SUBSCRIPTION_PRICE_DOLLARS} <span>/ month</span>
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
                $4/month AI usage included
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                Add extra AI usage ($2 or $5) when needed
              </li>
            </ul>

            {isAdmin ? (
              <div className={styles.activeBadge}>Admin — Full Access</div>
            ) : currentPlan === "paid" ? (
              <div>
                {billingState === "canceling" && periodEndFormatted && (
                  <div className={styles.cancelingBadge}>
                    Active until {periodEndFormatted}
                  </div>
                )}
                {billingState === "draining" ? (
                  <div className={styles.drainNotice}>
                    Your subscription has ended. You have ${extraUsageDollars.toFixed(2)} in unused
                    credits remaining — paid features stay active until they&apos;re used up.
                  </div>
                ) : (
                  <div className={styles.activeBadge}>
                    {subscriptionStatus === "paused"
                      ? "Payment Issue — Update Payment"
                      : "Current Plan"}
                  </div>
                )}
                {visibleActions.showCancel && (
                  <div className={styles.manageRow}>
                    <CancelSubscriptionButton
                      action="cancel"
                      label="Cancel Subscription"
                      periodEndDate={periodEndFormatted}
                      extraUsageDollars={extraUsageDollars}
                    />
                  </div>
                )}
                {visibleActions.showUpdatePayment && (
                  <div className={styles.manageRow}>
                    <ManageSubscriptionButton />
                  </div>
                )}
                {visibleActions.showResubscribe && (
                  <div className={styles.manageRow}>
                    <CancelSubscriptionButton
                      action="reactivate"
                      label="Resubscribe"
                    />
                  </div>
                )}
              </div>
            ) : (
              <BillingCheckoutButton />
            )}
          </div>
        </div>

        {/* Usage summary — visible for paid users */}
        {currentPlan === "paid" && !isAdmin && (
          <div className={styles.spendingSection}>
            <h3 className={styles.sectionTitle}>AI Usage This Month</h3>
            <p className={styles.sectionDesc}>
              Your Pro plan includes $4.00 of AI usage per month. When the
              allowance is reached, you can purchase extra usage ($2 or $5)
              from your profile page. Unused extra usage does not carry over to
              the next month.
            </p>

            <div className={styles.usageRow}>
              <span className={styles.usageLabel}>This month&apos;s usage:</span>
              <span className={styles.usageValue}>
                ${currentUsageDollars.toFixed(2)} / $4.00 Pro allowance
                {extraUsageDollars > 0 && (
                  <span className={styles.extraNote}>
                    {" "}+${extraUsageDollars.toFixed(2)} extra purchased
                  </span>
                )}
              </span>
            </div>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min(100, (currentUsageDollars / 4) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
