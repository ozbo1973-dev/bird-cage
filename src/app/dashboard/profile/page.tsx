import { requireVerifiedAuth } from "@/lib/session";
import { getUserById } from "@/lib/dal/users";
import { getEmailsForUser } from "@/lib/dal/emailLogs";
import { getBillingInfo } from "@/lib/dal/billing";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import EmailsReceived from "@/components/EmailsReceived";
import NavDropdown from "@/components/NavDropdown";
import ProfileBillingSection from "@/components/ProfileBillingSection";
import styles from "./page.module.css";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { from } = await searchParams;
  const returnTo = from ?? "/dashboard";

  const [dbUser, receivedEmails, billingDetails] = await Promise.all([
    getUserById(session.user.id),
    getEmailsForUser(session.user.id),
    getBillingInfo(session.user.id),
  ]);

  const role = dbUser?.role ?? "user";
  const isAdmin = role === "admin";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={returnTo} className={styles.back}>
          ← Back
        </Link>
        <h1 className={styles.title}>My Profile</h1>
        <div className={styles.headerRight}>
          {isAdmin && (
            <Link href="/dashboard/admin/users" className={styles.adminBtn}>
              Admin Management
            </Link>
          )}
          <NavDropdown isAdmin={isAdmin} returnPath={returnTo} />
        </div>
      </header>
      <main className={styles.main}>
        <ProfileForm
          name={session.user.name}
          email={session.user.email}
          role={role}
          returnTo={returnTo}
        />
        <ProfileBillingSection
          billingPlan={billingDetails?.billingPlan ?? "free"}
          subscriptionStatus={billingDetails?.subscriptionStatus ?? null}
          stripeCustomerId={billingDetails?.stripeCustomerId ?? null}
          spendingLimitCents={billingDetails?.spendingLimitCents ?? null}
          currentMonthUsageCents={billingDetails?.currentMonthUsageCents ?? 0}
          isAdmin={isAdmin}
        />
        <EmailsReceived logs={receivedEmails} />
      </main>
    </div>
  );
}
