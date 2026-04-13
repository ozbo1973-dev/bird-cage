import { notFound } from "next/navigation";
import { requireVerifiedAuth } from "@/lib/session";
import { getBirdEntry } from "@/lib/dal/events";
import { getUserById } from "@/lib/dal/users";
import { getUserBillingInfo, canAccessPaidFeatures } from "@/lib/billing";
import BirdEditForm from "@/components/BirdEditForm";
import NavDropdown from "@/components/NavDropdown";
import Link from "next/link";
import styles from "./page.module.css";

export default async function BirdEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await requireVerifiedAuth();
  const { id } = await params;
  const { from } = await searchParams;
  const birdId = parseInt(id, 10);

  if (isNaN(birdId)) notFound();

  const [bird, dbUser, billing] = await Promise.all([
    getBirdEntry(birdId, session.user.id),
    getUserById(session.user.id),
    getUserBillingInfo(session.user.id),
  ]);
  if (!bird) notFound();

  const backHref = from ?? "/dashboard";
  const isAdmin = dbUser?.role === "admin";
  const isPaidUser = billing ? canAccessPaidFeatures(billing.role, billing.billingPlan) : false;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={backHref} className={styles.back}>
          ← Back
        </Link>
        <h1 className={styles.title}>Edit Bird Sighting</h1>
        <div className={styles.navMenu}>
          <NavDropdown isAdmin={isAdmin} returnPath={backHref} />
        </div>
      </header>
      <main className={styles.main}>
        <BirdEditForm bird={bird} returnTo={backHref} isPaidUser={isPaidUser} />
      </main>
    </div>
  );
}
