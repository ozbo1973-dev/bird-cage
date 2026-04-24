"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Home, UserCircle, Shield, Download, LogOut, CreditCard, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import styles from "./NavDropdown.module.css";

interface Props {
  returnPath?: string;
  isAdmin?: boolean;
  hasEvents?: boolean;
}

export default function NavDropdown({ returnPath = "/dashboard", isAdmin = false, hasEvents = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/login") },
    });
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title="User menu"
      >
        <Menu size={24} />
      </button>

      {open && (
        <div className={styles.menu}>
          <Link
            href="/dashboard"
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <Home size={16} />
            Home
          </Link>
          <Link
            href={`/dashboard/profile?from=${encodeURIComponent(returnPath)}`}
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <UserCircle size={16} />
            Profile
          </Link>
          <Link
            href="/birdy-chat"
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <MessageSquare size={16} />
            Birdy Chat
          </Link>
          <Link
            href="/billing"
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <CreditCard size={16} />
            Billing
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/admin/users"
              className={styles.menuItem}
              onClick={() => setOpen(false)}
            >
              <Shield size={16} />
              Admin Management
            </Link>
          )}
          {hasEvents && (
            <a
              href="/api/export"
              className={styles.menuItem}
              onClick={() => setOpen(false)}
            >
              <Download size={16} />
              Download CSV
            </a>
          )}
          <button className={`${styles.menuItem} ${styles.signOut}`} onClick={handleSignOut}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
