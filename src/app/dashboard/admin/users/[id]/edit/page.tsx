import { requireAdminAuth } from "@/lib/session";
import { getUserById } from "@/lib/dal/users";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminUserEditForm from "@/components/AdminUserEditForm";
import NavDropdown from "@/components/NavDropdown";
import styles from "./page.module.css";

export default async function AdminUserEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { dbUser } = await requireAdminAuth();
  const { id } = await params;
  const { from } = await searchParams;
  const returnTo = from ?? "/dashboard/admin/users";

  const targetUser = await getUserById(id);
  if (!targetUser) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={returnTo} className={styles.back}>
          ← Back
        </Link>
        <h1 className={styles.title}>Edit User</h1>
        <div className={styles.navMenu}>
          <NavDropdown isAdmin returnPath={returnTo} />
        </div>
      </header>
      <main className={styles.main}>
        <AdminUserEditForm
          targetUser={targetUser}
          currentUserId={dbUser.id}
          returnTo={returnTo}
        />
      </main>
    </div>
  );
}
