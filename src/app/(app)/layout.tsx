import { Suspense } from "react";
import { connection } from "next/server";
import { AppShell } from "@/components/erp/app-shell";
import { requireUser } from "@/lib/rbac";

async function ProtectedApp({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <div className="app-shell" aria-busy="true">
          <main className="main-column">
            <div className="page-content">Memuat aplikasi...</div>
          </main>
        </div>
      }
    >
      <ProtectedApp>{children}</ProtectedApp>
    </Suspense>
  );
}
