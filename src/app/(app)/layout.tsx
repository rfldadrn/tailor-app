import { AppShell } from "@/components/erp/app-shell";
import { requireUser } from "@/lib/rbac";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
