import Link from "next/link";
import { LogOut, Scissors } from "lucide-react";
import { signOut } from "@/lib/auth";
import { AppNav } from "@/components/erp/app-nav";
import { GlobalSearch } from "@/components/erp/global-search";
import { ThemeToggle } from "@/components/erp/theme-toggle";
import type { AppRole } from "@/nav.config";

const roleLabels: Record<AppRole, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  VIEWER: "Pembaca",
};

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: AppRole };
  children: React.ReactNode;
}) {
  const displayName = user.name || user.email || "Pengguna";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark"><Scissors aria-hidden="true" size={18} /></span>
          <span>
            <strong>Dunia Busana</strong>
            <small>Sistem Kas</small>
          </span>
        </Link>
        <AppNav role={user.role} />
        <div className="sidebar-bottom">
          <span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span>
          <span className="user-copy">
            <strong>{displayName}</strong>
            <small>{roleLabels[user.role]}</small>
          </span>
        </div>
      </aside>
      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><Scissors aria-hidden="true" size={17} /></span>
            <strong>Ruang Jahit</strong>
          </div>
          <GlobalSearch />
          <div className="topbar-actions">
            <span className="topbar-context">{roleLabels[user.role]} · Buku kas</span>
            <ThemeToggle />
            <form action={logout} className="logout-form">
              <button aria-label="Keluar" className="button logout-button" title="Keluar" type="submit">
                <LogOut aria-hidden="true" size={15} />
                <span className="logout-label">Keluar</span>
              </button>
            </form>
          </div>
        </header>
        <div className="mobile-nav"><AppNav role={user.role} /></div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
