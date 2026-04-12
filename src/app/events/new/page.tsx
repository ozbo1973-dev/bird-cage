import { requireVerifiedAuth } from "../../../lib/session";
import { getUserById } from "../../../lib/dal/users";
import { canAccessPaidFeatures } from "../../../lib/billing";
import EventForm from "../../../components/EventForm";
import NavDropdown from "../../../components/NavDropdown";
import Link from "next/link";
import styles from "./page.module.css";

export default async function NewEventPage() {
  const session = await requireVerifiedAuth();
  const dbUser = await getUserById(session.user.id);
  const isAdmin = dbUser?.role === "admin";
  const isPaidUser = canAccessPaidFeatures(
    dbUser?.role ?? "user",
    (dbUser?.billingPlan as "free" | "paid") ?? "free",
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>New Birding Event</h1>
        <div className={styles.navMenu}>
          <NavDropdown isAdmin={isAdmin} returnPath="/dashboard" />
        </div>
      </header>
      <main className={styles.main}>
        <EventForm isPaidUser={isPaidUser} />
      </main>
    </div>
  );
}
