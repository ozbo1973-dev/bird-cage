"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, UserCircle, Download, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import styles from "./NavDropdown.module.css";

interface Props {
  returnPath?: string;
}

export default function NavDropdown({ returnPath = "/dashboard" }: Props) {
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
            href={`/dashboard/profile?from=${encodeURIComponent(returnPath)}`}
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <UserCircle size={16} />
            Profile
          </Link>
          <a
            href="/api/export"
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <Download size={16} />
            Download CSV
          </a>
          <button className={`${styles.menuItem} ${styles.signOut}`} onClick={handleSignOut}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
